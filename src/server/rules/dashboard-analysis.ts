import { z } from "zod";
import type { DashboardIndicators } from "@/server/rules/dashboard-indicators";
import type {
  DashboardAnalysisHighlight,
  DashboardComparison,
  DashboardComparisonValue,
  DashboardRevenueDay,
  DashboardRevenuePoint,
  DashboardRevenueSeries,
} from "@/shared/api/dashboard";
import { APPOINTMENT_STATUS_LABELS } from "@/shared/constants/appointment-statuses";
import { DASHBOARD_INDICATORS } from "@/shared/constants/dashboard-indicators";
import {
  addCalendarDays,
  countCalendarDays,
  findMonthPeriod,
  type CalendarPeriod,
} from "@/shared/format/date";
import { normalizeText } from "@/shared/validation/formats";

// The analysis of the dashboard (UC27, RN038, RN039; docs/agendamento/
// calculos.md, section 6): the periods compared, the variations, the input of
// the model, the messages and the check of its answer. The indicators come
// already worked out by the service `dashboard`; nothing here reads the clock,
// the environment or the network, and a refused answer is a value.

// The version of the instructions of each analysis type, written in the log
// and in the answer; changing the instructions or the model asks for a new one
// and the evaluation of workflows/procedimentos/testes.md.
export const ANALYSIS_PROMPT_VERSIONS = { summary: "resumida-1" } as const;

// RN038: up to this many days the revenue goes by day; above, by blocks.
const SERIES_DAY_LIMIT = 62;
const BLOCK_DAYS = 7;
// RN039
const SUMMARY_MAX_LENGTH = 600;
const COMMENT_MAX_LENGTH = 240;
const MAX_HIGHLIGHTS = 4;
const CENTS_PER_REAL = 100;

export type ComparisonPeriods = {
  analyzed: CalendarPeriod;
  previous: CalendarPeriod;
  // The period ends after today, and only up to today is analyzed.
  isPartial: boolean;
};

// RN038 (L18): whole calendar months are compared with the same number of
// months just before them; other periods, with the same number of days ending
// the day before. A period that ends after today is analyzed up to today, and
// the previous one by the same days. Null when the period starts after today:
// there is nothing done to analyze.
export function findComparisonPeriods(
  period: CalendarPeriod,
  today: string,
): ComparisonPeriods | null {
  if (period.from > today) return null;
  const isPartial = period.to > today;
  const analyzed = { from: period.from, to: isPartial ? today : period.to };
  const months = countWholeMonths(period);
  if (months === null) {
    const previousTo = addCalendarDays(analyzed.from, -1);
    return {
      analyzed,
      previous: {
        from: addCalendarDays(previousTo, 1 - countCalendarDays(analyzed)),
        to: previousTo,
      },
      isPartial,
    };
  }
  const endsOnMonthEnd = findMonthPeriod(analyzed.to).to === analyzed.to;
  const previousToMonth = shiftMonths(analyzed.to, -months);
  return {
    analyzed,
    previous: {
      from: shiftMonths(analyzed.from, -months),
      to: endsOnMonthEnd
        ? findMonthPeriod(previousToMonth).to
        : previousToMonth,
    },
    isPartial,
  };
}

// The number of calendar months of a period from the first day of a month to
// the last day of a month, or null when it is not one.
function countWholeMonths({ from, to }: CalendarPeriod): number | null {
  if (!from.endsWith("-01") || findMonthPeriod(to).to !== to) return null;
  const [fromYear, fromMonth] = from.split("-").map(Number);
  const [toYear, toMonth] = to.split("-").map(Number);
  return (toYear - fromYear) * 12 + (toMonth - fromMonth) + 1;
}

// The same day some months before or after; a day the month does not have
// becomes its last day (31/03 one month before is 28/02 or 29/02).
function shiftMonths(day: string, amount: number): string {
  const [year, month, date] = day.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1 + amount, 1))
    .toISOString()
    .slice(0, 10);
  const last = findMonthPeriod(first).to;
  const lastDate = Number(last.slice(8));
  return `${first.slice(0, 8)}${String(Math.min(date, lastDate)).padStart(2, "0")}`;
}

// A value in hundredths, as the money and the rates have two places.
function toHundredths(value: number): number {
  return Math.round(value * CENTS_PER_REAL);
}

// Tenths rounded half away from zero, back to a number with one place.
function fromTenths(tenths: number): number {
  return (Math.sign(tenths) * Math.round(Math.abs(tenths))) / 10 || 0;
}

// The percentage over the previous value, with one place; no variation when
// the previous value is zero.
export function calculateVariation(
  current: number,
  previous: number,
): number | null {
  const previousHundredths = toHundredths(previous);
  if (previousHundredths === 0) return null;
  return fromTenths(
    ((toHundredths(current) - previousHundredths) * 1000) / previousHundredths,
  );
}

// The four indicators of the period next to the previous ones (RF092); the
// cancellation rate varies in percentage points.
export function buildComparison(
  current: DashboardIndicators,
  previous: DashboardIndicators | null,
): DashboardComparison {
  function compare(
    name: "revenue" | "appointmentCount" | "averageTicket",
  ): DashboardComparisonValue {
    return {
      current: current[name],
      previous: previous ? previous[name] : null,
      variation: previous
        ? calculateVariation(current[name], previous[name])
        : null,
    };
  }
  return {
    revenue: compare("revenue"),
    appointmentCount: compare("appointmentCount"),
    averageTicket: compare("averageTicket"),
    cancellationRate: {
      current: current.cancellationRate,
      previous: previous ? previous.cancellationRate : null,
      variation: previous
        ? fromTenths(
            (toHundredths(current.cancellationRate) -
              toHundredths(previous.cancellationRate)) /
              10,
          )
        : null,
    },
  };
}

type RevenueBlock = { start: string; revenue: number };

// The revenue of the days, in blocks of `size` days from the first one.
function groupRevenue(
  days: DashboardRevenueDay[],
  size: number,
): RevenueBlock[] {
  const blocks: RevenueBlock[] = [];
  days.forEach((day, index) => {
    const cents = toHundredths(day.revenue);
    if (index % size === 0) {
      blocks.push({ start: day.date, revenue: cents });
    } else {
      blocks[blocks.length - 1].revenue += cents;
    }
  });
  return blocks.map(({ start, revenue }) => ({
    start,
    revenue: revenue / CENTS_PER_REAL,
  }));
}

// RN038: the revenue of the two periods by position, by day up to 62 days and
// in blocks of seven days from the first one above that. The positions are
// the ones of the period analyzed; where the previous period is shorter, or
// without a comparison, its side is null.
export function buildRevenueSeries(
  current: DashboardRevenueDay[],
  previous: DashboardRevenueDay[] | null,
): DashboardRevenueSeries {
  const unit = current.length > SERIES_DAY_LIMIT ? "week" : "day";
  const size = unit === "week" ? BLOCK_DAYS : 1;
  const previousBlocks = previous ? groupRevenue(previous, size) : [];
  const points: DashboardRevenuePoint[] = groupRevenue(current, size).map(
    (block, index) => ({
      currentStart: block.start,
      currentRevenue: block.revenue,
      previousStart: previousBlocks[index]?.start ?? null,
      previousRevenue: previousBlocks[index]?.revenue ?? null,
    }),
  );
  return { unit, points };
}

type InputValue = {
  current: number;
  previous: number | null;
};

// What the model receives (RN038): only aggregated values, with no field of
// free text, no identifier and nothing of the agenda of the day.
export type AnalysisInput = {
  period: { from: string; to: string; days: number; isPartial: boolean };
  previousPeriod: { from: string; to: string; hasAppointments: boolean };
  indicators: {
    revenue: InputValue & { variationPercent: number | null };
    appointmentCount: InputValue & { variationPercent: number | null };
    averageTicket: InputValue & { variationPercent: number | null };
    cancellationRate: InputValue & { variationPoints: number | null };
  };
  revenueSeries: {
    unit: "day" | "week";
    points: { position: number; current: number; previous: number | null }[];
  };
  // By the labels of RN017, as the screen shows them.
  appointmentsByStatus: Record<string, number>;
};

export function buildAnalysisInput({
  periods,
  current,
  comparison,
  series,
  hasComparison,
}: {
  periods: ComparisonPeriods;
  current: DashboardIndicators;
  comparison: DashboardComparison;
  series: DashboardRevenueSeries;
  hasComparison: boolean;
}): AnalysisInput {
  function withPercent({
    current,
    previous,
    variation,
  }: DashboardComparisonValue) {
    return { current, previous, variationPercent: variation };
  }
  return {
    period: {
      from: periods.analyzed.from,
      to: periods.analyzed.to,
      days: countCalendarDays(periods.analyzed),
      isPartial: periods.isPartial,
    },
    previousPeriod: { ...periods.previous, hasAppointments: hasComparison },
    indicators: {
      revenue: withPercent(comparison.revenue),
      appointmentCount: withPercent(comparison.appointmentCount),
      averageTicket: withPercent(comparison.averageTicket),
      cancellationRate: {
        current: comparison.cancellationRate.current,
        previous: comparison.cancellationRate.previous,
        variationPoints: comparison.cancellationRate.variation,
      },
    },
    revenueSeries: {
      unit: series.unit,
      points: series.points.map((point, index) => ({
        position: index + 1,
        current: point.currentRevenue,
        previous: point.previousRevenue,
      })),
    },
    appointmentsByStatus: Object.fromEntries(
      current.appointmentsByStatus.map(({ status, count }) => [
        APPOINTMENT_STATUS_LABELS[status],
        count,
      ]),
    ),
  };
}

export type AnalysisMessage = { role: "system" | "user"; content: string };

// The instructions of the summary (resumida-1): the model writes, as the
// analyst of the company, the report of the period to the owner.
const SUMMARY_INSTRUCTIONS = [
  "Você é o analista de negócios de uma empresa de estética automotiva e escreve para o dono da empresa o relatório do período, a partir dos indicadores calculados pelo sistema, que chegam em JSON.",
  "Interprete os números: o que aconteceu no período, o que mudou em relação ao período anterior e o que merece atenção.",
  "Use só os valores recebidos. Não escreva nenhum algarismo, porque a tela mostra os números ao lado do texto: fale em alta, queda, estabilidade, maior e menor.",
  "Apresente causas apenas como hipóteses. Quando previousPeriod.hasAppointments for falso, não compare os períodos. Quando period.isPartial for verdadeiro, o período ainda está em andamento e vai até hoje.",
  "Escreva em português do Brasil, em tom profissional e direto, sem saudação nem despedida.",
  `Responda no esquema pedido: summary, um resumo de até ${SUMMARY_MAX_LENGTH} caracteres, e highlights, de nenhuma a ${MAX_HIGHLIGHTS} observações de até ${COMMENT_MAX_LENGTH} caracteres, cada uma sobre um indicador: revenue (receita), appointmentCount (agendamentos), averageTicket (ticket médio), cancellationRate (taxa de cancelamento), revenueByDay (receita ao longo do período) ou appointmentsByStatus (agendamentos por status).`,
].join("\n");

export function buildAnalysisMessages(input: AnalysisInput): AnalysisMessage[] {
  return [
    { role: "system", content: SUMMARY_INSTRUCTIONS },
    { role: "user", content: JSON.stringify(input) },
  ];
}

// The schema the provider is asked to follow (strict JSON schema: every field
// required and no other field). The limits of RN039 are checked by
// parseAnalysis, which is what decides.
export const ANALYSIS_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "highlights"],
  properties: {
    summary: { type: "string" },
    highlights: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["indicator", "comment"],
        properties: {
          indicator: { type: "string", enum: [...DASHBOARD_INDICATORS] },
          comment: { type: "string" },
        },
      },
    },
  },
} as const;

const DIGIT = /\p{Nd}/u;

function textSchema(maxLength: number) {
  return z
    .string()
    .transform(normalizeText)
    .pipe(z.string().min(1).max(maxLength));
}

const answerSchema = z.object({
  summary: textSchema(SUMMARY_MAX_LENGTH),
  highlights: z
    .array(
      z.object({
        indicator: z.enum(DASHBOARD_INDICATORS),
        comment: textSchema(COMMENT_MAX_LENGTH),
      }),
    )
    .max(MAX_HIGHLIGHTS),
});

export type ParsedAnalysis = {
  summary: string;
  highlights: DashboardAnalysisHighlight[];
};

export type AnalysisRefusal = "INVALID_RESPONSE" | "NUMBERS_IN_TEXT";

// RN039: the answer of the model is untrusted (RS020). It must be JSON in the
// format above, with the texts normalized as in RN035 and no digit anywhere;
// unknown fields are discarded.
export function parseAnalysis(
  text: string,
):
  | { ok: true; analysis: ParsedAnalysis }
  | { ok: false; refusal: AnalysisRefusal } {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, refusal: "INVALID_RESPONSE" };
  }
  const parsed = answerSchema.safeParse(value);
  if (!parsed.success) return { ok: false, refusal: "INVALID_RESPONSE" };
  const { summary, highlights } = parsed.data;
  const texts = [summary, ...highlights.map(({ comment }) => comment)];
  if (texts.some((item) => DIGIT.test(item))) {
    return { ok: false, refusal: "NUMBERS_IN_TEXT" };
  }
  return {
    ok: true,
    analysis: {
      summary,
      highlights: highlights.map(({ indicator, comment }) => ({
        indicator,
        comment,
      })),
    },
  };
}
