import "server-only";
import { requestChatCompletion } from "@/server/ai/chat-completion";
import { logger } from "@/server/http/logger";
import { listAppointmentsBetween } from "@/server/repositories/appointments";
import { findDashboardFigures } from "@/server/repositories/dashboard";
import {
  ANALYSIS_PROMPT_VERSIONS,
  ANALYSIS_RESPONSE_SCHEMA,
  buildAnalysisInput,
  buildAnalysisMessages,
  buildComparison,
  buildRevenueSeries,
  findComparisonPeriods,
  parseAnalysis,
} from "@/server/rules/dashboard-analysis";
import {
  buildIndicators,
  type DashboardIndicators,
} from "@/server/rules/dashboard-indicators";
import type { Dashboard, DashboardAnalysis } from "@/shared/api/dashboard";
import { COMPANY_TIME_ZONE } from "@/shared/constants/time-zone";
import {
  companyDayRange,
  findMonthPeriod,
  formatCalendarDate,
  type CalendarPeriod,
} from "@/shared/format/date";
import { AppError } from "@/shared/errors/app-error";
import type {
  DashboardAnalysisInput,
  DashboardPeriodQuery,
} from "@/shared/validation/dashboard";

// Module dashboard (docs/agendamento/): the indicators and the agenda of the
// day (UC09) and the analysis of the period (UC27).

// The output limit of the summary. With the gpt-oss models it also holds the
// reasoning, kept low; the text itself is far shorter (RN039).
const SUMMARY_MAX_TOKENS = 2_048;

// RN021: the indicators of a period of calendar days in the company's time
// zone. The analysis (UC27) also asks for them, for the period and the
// previous one.
export async function calculateIndicators(
  period: CalendarPeriod,
): Promise<DashboardIndicators> {
  const { from, to } = companyDayRange(period);
  const figures = await findDashboardFigures(from, to, COMPANY_TIME_ZONE);
  return buildIndicators(period, figures);
}

// RN035: with no dates, the current month of the company's time zone.
export async function getDashboard(
  query: DashboardPeriodQuery,
  now: Date,
): Promise<Dashboard> {
  const today = formatCalendarDate(now.toISOString());
  const period: CalendarPeriod =
    query.from === undefined || query.to === undefined
      ? findMonthPeriod(today)
      : { from: query.from, to: query.to };
  const day = companyDayRange({ from: today, to: today });
  const [indicators, agenda] = await Promise.all([
    calculateIndicators(period),
    listAppointmentsBetween(day.from, day.to),
  ]);
  return { ...period, ...indicators, agenda };
}

// UC27, RF089, RF092: the analysis of the period, written by the AI service
// from the aggregated values only (RN038, RS020) and checked before it is
// shown (RN039). Nothing is saved. A failure of the service is logged with
// its reason, never with the key, the messages or the answer (RS018), and
// answers AI_UNAVAILABLE; the dashboard goes on (RNF017).
export async function generateDashboardAnalysis(
  input: DashboardAnalysisInput,
  now: Date,
): Promise<DashboardAnalysis> {
  const periods = findComparisonPeriods(
    input,
    formatCalendarDate(now.toISOString()),
  );
  // UC27 FE01: nothing done to analyze, and the AI service is not called.
  if (!periods) throw new AppError("INSUFFICIENT_DATA");
  const [current, previous] = await Promise.all([
    calculateIndicators(periods.analyzed),
    calculateIndicators(periods.previous),
  ]);
  if (current.appointmentCount === 0) throw new AppError("INSUFFICIENT_DATA");

  // UC27 FA03: without appointments before, there is nothing to compare.
  const hasComparison = previous.appointmentCount > 0;
  const comparison = buildComparison(current, hasComparison ? previous : null);
  const revenueSeries = buildRevenueSeries(
    current.revenueByDay,
    hasComparison ? previous.revenueByDay : null,
  );
  const promptVersion = ANALYSIS_PROMPT_VERSIONS.summary;
  const logFields = { detail: input.detail, promptVersion };

  const result = await requestChatCompletion({
    messages: buildAnalysisMessages(
      buildAnalysisInput({
        periods,
        current,
        comparison,
        series: revenueSeries,
        hasComparison,
      }),
    ),
    schemaName: "dashboard_analysis",
    schema: ANALYSIS_RESPONSE_SCHEMA,
    maxTokens: SUMMARY_MAX_TOKENS,
  });
  if (!result.ok) {
    logger.warn("dashboard_analysis_failed", {
      ...logFields,
      reason: result.reason,
      providerStatus: result.providerStatus,
      durationMs: result.durationMs,
    });
    throw new AppError("AI_UNAVAILABLE");
  }
  const parsed = parseAnalysis(result.text);
  if (!parsed.ok) {
    logger.warn("dashboard_analysis_failed", {
      ...logFields,
      reason: "invalid_response",
      refusal: parsed.refusal,
      durationMs: result.durationMs,
    });
    throw new AppError("AI_UNAVAILABLE");
  }
  logger.info("dashboard_analysis_generated", {
    ...logFields,
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    durationMs: result.durationMs,
  });

  return {
    from: input.from,
    to: input.to,
    analyzedTo: periods.analyzed.to,
    previousFrom: periods.previous.from,
    previousTo: periods.previous.to,
    hasComparison,
    detail: input.detail,
    promptVersion,
    summary: parsed.analysis.summary,
    highlights: parsed.analysis.highlights,
    comparison,
    revenueSeries,
    details: null,
    sections: null,
    recommendations: null,
    generatedAt: now.toISOString(),
  };
}
