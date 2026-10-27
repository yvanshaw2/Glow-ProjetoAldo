import { ApiError } from "@/lib/api-client";
import type { DemoRequest } from "@/lib/demo/routes";
import type {
  DashboardAnalysis,
  DashboardAnalysisHighlight,
} from "@/shared/api/dashboard";
import { ERROR_CATALOG } from "@/shared/errors/catalog";
import {
  addCalendarDays,
  countCalendarDays,
  formatCalendarDate,
  isCalendarDay,
  type CalendarPeriod,
} from "@/shared/format/date";

// Demo data of the analysis of the dashboard (decision 0055). The dashboard
// itself is read from the database (GET /api/admin/dashboard); the analysis
// is a POST that writes nothing (UC27) and stays here until its route exists.
// The appointments of supabase/seed-demo.sql go from 90 days before today to
// 14 days after it, on the business days (Monday to Friday and a short
// Saturday), which is all the comparison of the periods needs to know.

const DAYS_BEFORE_TODAY = 90;
const DAYS_AFTER_TODAY = 14;
const SUNDAY = 0;
// RN035: up to 12 months, which is up to 366 days counting both dates.
const MAX_PERIOD_DAYS = 366;
const REQUIRED_MESSAGE = "Preencha este campo.";
const REVERSED_PERIOD_MESSAGE = "A data final não pode ser anterior à inicial.";
const LONG_PERIOD_MESSAGE = "O período não pode passar de 12 meses.";

// RN039: the text only interprets the indicators, with no digits, and says
// nothing about the direction of a change, because the demo does not compare
// the indicators of the two periods. The summary has up to 600 characters and
// each observation, up to 240.
const SUMMARY =
  "Em linhas gerais, o período teve movimento regular, com a receita concentrada nos serviços concluídos e uma taxa de cancelamento que pede atenção. Esta é uma análise de demonstração, escrita à mão: com a rota ligada, o texto virá do serviço de inteligência artificial a partir dos números do período.";

const HIGHLIGHTS: DashboardAnalysisHighlight[] = [
  {
    indicator: "revenue",
    comment:
      "A receita acompanha o ritmo dos atendimentos concluídos, e os dias de maior movimento concentram boa parte dela.",
  },
  {
    indicator: "appointmentCount",
    comment:
      "Os agendamentos se distribuem pelos dias úteis, e o sábado fica mais leve porque a empresa funciona só meio período.",
  },
  {
    indicator: "averageTicket",
    comment:
      "O ticket médio depende da mistura entre lavagens simples e serviços de maior valor, como polimento e higienização.",
  },
  {
    indicator: "cancellationRate",
    comment:
      "Os cancelamentos merecem acompanhamento: confirmar o agendamento perto da data pode ajudar a reduzi-los.",
  },
];

// POST /api/admin/dashboard/analysis (UC27): a fixed text, for the period of
// the body. The previous period (RN038) only tells whether there is something
// to compare. The screen does not offer the analysis of a period without
// appointments (UC27 FE01), so the answer for it is not simulated.
export function answerDashboardAnalysis({
  body,
}: DemoRequest): DashboardAnalysis {
  const from = readBodyDay(body, "from");
  const to = readBodyDay(body, "to");
  if (!from || !to) {
    throw validationError({
      ...(from ? {} : { from: REQUIRED_MESSAGE }),
      ...(to ? {} : { to: REQUIRED_MESSAGE }),
    });
  }
  const period = { from, to };
  assertPeriod(period);

  const days = countCalendarDays(period);
  const previousTo = addCalendarDays(from, -1);
  const previousPeriod = {
    from: addCalendarDays(previousTo, 1 - days),
    to: previousTo,
  };
  return {
    ...period,
    previousFrom: previousPeriod.from,
    previousTo: previousPeriod.to,
    hasComparison: hasAppointments(previousPeriod),
    summary: SUMMARY,
    highlights: HIGHLIGHTS,
    generatedAt: new Date().toISOString(),
  };
}

// Whether a business day of the seed falls in the period.
function hasAppointments({ from, to }: CalendarPeriod): boolean {
  const today = formatCalendarDate(new Date().toISOString());
  const first = addCalendarDays(today, -DAYS_BEFORE_TODAY);
  const last = addCalendarDays(today, DAYS_AFTER_TODAY);
  const start = from > first ? from : first;
  const end = to < last ? to : last;
  return (
    start <= end &&
    Array.from(
      { length: countCalendarDays({ from: start, to: end }) },
      (_, index) => addCalendarDays(start, index),
    ).some((day) => findWeekday(day) !== SUNDAY)
  );
}

function readBodyDay(body: unknown, name: keyof CalendarPeriod): string | null {
  if (typeof body !== "object" || body === null) return null;
  const value: unknown = Reflect.get(body, name);
  return typeof value === "string" && isCalendarDay(value) ? value : null;
}

// RN035: the first day not after the last one, up to 366 days.
function assertPeriod(period: CalendarPeriod): void {
  const days = countCalendarDays(period);
  if (days < 1) throw validationError({ to: REVERSED_PERIOD_MESSAGE });
  if (days > MAX_PERIOD_DAYS)
    throw validationError({ to: LONG_PERIOD_MESSAGE });
}

function validationError(fields: Record<string, string>): ApiError {
  return new ApiError({
    status: ERROR_CATALOG.VALIDATION_ERROR.status,
    code: "VALIDATION_ERROR",
    detail: ERROR_CATALOG.VALIDATION_ERROR.message,
    fields,
  });
}

function findWeekday(day: string): number {
  return new Date(Date.parse(`${day}T00:00:00Z`)).getUTCDay();
}
