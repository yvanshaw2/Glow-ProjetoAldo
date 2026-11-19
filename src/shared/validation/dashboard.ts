import { z } from "zod";
import {
  countCalendarDays,
  isCalendarDay,
  type CalendarPeriod,
} from "@/shared/format/date";
import { REQUIRED_MESSAGE } from "@/shared/validation/formats";

// Query of GET /api/admin/dashboard (docs/agendamento/rotas.md). Unknown
// parameters are discarded (RS013).

// RN035: up to 12 months, which is up to 366 days counting both dates.
export const DASHBOARD_MAX_PERIOD_DAYS = 366;

const INVALID_DATE_MESSAGE = "Informe uma data válida.";
const REVERSED_PERIOD_MESSAGE = "A data final não pode ser anterior à inicial.";
const LONG_PERIOD_MESSAGE = "O período não pode passar de 12 meses.";
const UNKNOWN_DETAIL_MESSAGE = "Escolha um tipo de análise válido.";

// UC09 FE02, RN035: the first day not after the last one, up to 12 months,
// checked only when both dates are days of the calendar.
function checkPeriodLength(
  { from, to }: CalendarPeriod,
  context: z.RefinementCtx,
): void {
  if (!isCalendarDay(from) || !isCalendarDay(to)) return;
  const days = countCalendarDays({ from, to });
  if (days < 1) {
    context.addIssue({
      code: "custom",
      message: REVERSED_PERIOD_MESSAGE,
      path: ["to"],
    });
  } else if (days > DASHBOARD_MAX_PERIOD_DAYS) {
    context.addIssue({
      code: "custom",
      message: LONG_PERIOD_MESSAGE,
      path: ["to"],
    });
  }
}

// An empty date is no date; one that comes must be a day of the calendar.
const optionalDaySchema = z
  .string()
  .optional()
  .transform((value) => value || undefined)
  .refine((value) => value === undefined || isCalendarDay(value), {
    error: INVALID_DATE_MESSAGE,
  });

// UC09 FE02, RN035: both dates or none (the service then applies the current
// month), the first not after the last one, up to 12 months.
export const dashboardPeriodQuerySchema = z
  .object({ from: optionalDaySchema, to: optionalDaySchema })
  .superRefine(({ from, to }, context) => {
    if (from === undefined && to === undefined) return;
    for (const [name, value] of [
      ["from", from],
      ["to", to],
    ] as const) {
      if (value === undefined) {
        context.addIssue({
          code: "custom",
          message: REQUIRED_MESSAGE,
          path: [name],
        });
      }
    }
    if (from === undefined || to === undefined) return;
    checkPeriodLength({ from, to }, context);
  })
  .transform(({ from, to }) =>
    from === undefined || to === undefined
      ? ({} as Partial<CalendarPeriod>)
      : { from, to },
  );

export type DashboardPeriodQuery = z.output<typeof dashboardPeriodQuerySchema>;

// A date that must come: missing or empty is "Preencha este campo.".
const requiredDaySchema = z
  .string({ error: REQUIRED_MESSAGE })
  .refine((value) => value !== "", { error: REQUIRED_MESSAGE, abort: true })
  .refine(isCalendarDay, { error: INVALID_DATE_MESSAGE });

// Body of POST /api/admin/dashboard/analysis (UC27): the period on the screen,
// with the limits of RN035, and the analysis type, the summary by default
// (RF091; the detailed one comes with its route). Unknown fields are
// discarded (RS013).
export const dashboardAnalysisSchema = z
  .object({
    from: requiredDaySchema,
    to: requiredDaySchema,
    detail: z
      .enum(["summary"], { error: UNKNOWN_DETAIL_MESSAGE })
      .default("summary"),
  })
  .superRefine(({ from, to }, context) => {
    checkPeriodLength({ from, to }, context);
  });

export type DashboardAnalysisInput = z.output<typeof dashboardAnalysisSchema>;
