import { z } from "zod";
import type { DashboardIndicators } from "@/server/rules/dashboard-indicators";
import type {
  DashboardAnalysisHighlight,
  DashboardAnalysisSection,
  DashboardComparison,
  DashboardComparisonValue,
  DashboardDetails,
  DashboardRevenueDay,
  DashboardRevenuePoint,
  DashboardRevenueSeries,
} from "@/shared/api/dashboard";
import { APPOINTMENT_STATUS_LABELS } from "@/shared/constants/appointment-statuses";
import {
  CANCELLATION_REASON_LABELS,
  NOT_INFORMED_REASON_LABEL,
} from "@/shared/constants/cancellation-reasons";
import { DASHBOARD_INDICATORS } from "@/shared/constants/dashboard-indicators";
import { DASHBOARD_SECTIONS } from "@/shared/constants/dashboard-sections";
import { PAYMENT_METHOD_LABELS } from "@/shared/constants/payment-methods";
import { VEHICLE_SIZE_LABELS } from "@/shared/constants/vehicle-sizes";
import { VEHICLE_TYPE_LABELS } from "@/shared/constants/vehicle-types";
import { WEEKDAY_LABELS } from "@/shared/constants/weekdays";
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
export const ANALYSIS_PROMPT_VERSIONS = {
  summary: "resumida-1",
  detailed: "detalhada-4",
} as const;

// RN038: up to this many days the revenue goes by day; above, by blocks.
const SERIES_DAY_LIMIT = 62;
const BLOCK_DAYS = 7;
// RN039
const SUMMARY_MAX_LENGTH = 600;
const COMMENT_MAX_LENGTH = 240;
const MAX_HIGHLIGHTS = 4;
const MAX_OBSERVATIONS = 3;
const MAX_RECOMMENDATIONS = 4;
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

// The difference between two rates with two places, in points with one.
function pointsBetween(current: number, previous: number): number {
  return fromTenths((toHundredths(current) - toHundredths(previous)) / 10);
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
        ? pointsBetween(current.cancellationRate, previous.cancellationRate)
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

// The detailed analysis (RF091, RN039, RN040) ---------------------------------

// A number of the period next to the previous one; null without a previous
// period (UC27 FA03).
type ComparedCount = {
  current: number | null;
  previous: number | null;
  variationPercent: number | null;
};

type ComparedRate = {
  current: number;
  previous: number | null;
  variationPoints: number | null;
};

function compareCount(
  current: number | null,
  previous: number | null | undefined,
): ComparedCount {
  const hasPrevious = previous !== null && previous !== undefined;
  return {
    current,
    previous: hasPrevious ? previous : null,
    variationPercent:
      hasPrevious && current !== null
        ? calculateVariation(current, previous)
        : null,
  };
}

// RN040: the indicators of the detailed analysis, as the model receives them:
// with the labels of the screen, the hours with appointments only and the
// previous values of items 3, 6, 7, 8 and 13. Only aggregated values.
export type DetailedAnalysisInput = AnalysisInput & {
  details: {
    services: DashboardDetails["services"];
    categories: DashboardDetails["categories"];
    extrasRate: ComparedRate;
    vehicleTypes: { type: string; count: number }[];
    vehicleSizes: { size: string; count: number; averageTicket: number }[];
    payments: { method: string; count: number; revenue: number }[];
    surcharges: number;
    discounts: number;
    channel: { client: ComparedCount; panel: ComparedCount };
    clients: { new: ComparedCount; returning: ComparedCount };
    returns: ComparedCount;
    weekdays: {
      weekday: string;
      appointments: number;
      cancelled: number;
      revenue: number;
    }[];
    hours: { hour: number; count: number }[];
    cancelledServices: DashboardDetails["cancelledServices"];
    cancellationReasons: { reason: string; count: number }[];
    reviews: {
      average: ComparedCount;
      ratings: DashboardDetails["reviews"]["ratings"];
    };
    margin: Omit<DashboardDetails["margin"], "percent"> & {
      percent: ComparedRate | null;
    };
    open: DashboardDetails["open"];
    leadTimeDays: ComparedCount;
    leadTimeBands: {
      sameDay: number;
      upToThree: number;
      upToSeven: number;
      overSeven: number;
    };
  };
};

export function buildDetailedAnalysisInput({
  base,
  details,
  previousDetails,
}: {
  base: AnalysisInput;
  details: DashboardDetails;
  previousDetails: DashboardDetails | null;
}): DetailedAnalysisInput {
  const previous = previousDetails;
  return {
    ...base,
    details: {
      services: details.services,
      categories: details.categories,
      extrasRate: {
        current: details.extrasRate,
        previous: previous ? previous.extrasRate : null,
        variationPoints: previous
          ? pointsBetween(details.extrasRate, previous.extrasRate)
          : null,
      },
      vehicleTypes: details.vehicleTypes.map(({ type, count }) => ({
        type: VEHICLE_TYPE_LABELS[type],
        count,
      })),
      vehicleSizes: details.vehicleSizes.map(
        ({ size, count, averageTicket }) => ({
          size: VEHICLE_SIZE_LABELS[size],
          count,
          averageTicket,
        }),
      ),
      payments: details.payments.map(({ method, count, revenue }) => ({
        method: PAYMENT_METHOD_LABELS[method],
        count,
        revenue,
      })),
      surcharges: details.surcharges,
      discounts: details.discounts,
      channel: {
        client: compareCount(details.channel.client, previous?.channel.client),
        panel: compareCount(details.channel.panel, previous?.channel.panel),
      },
      clients: {
        new: compareCount(details.clients.new, previous?.clients.new),
        returning: compareCount(
          details.clients.returning,
          previous?.clients.returning,
        ),
      },
      returns: compareCount(details.returns, previous?.returns),
      weekdays: details.weekdays.map(({ weekday, ...day }) => ({
        weekday: WEEKDAY_LABELS[weekday],
        ...day,
      })),
      hours: details.hours.filter(({ count }) => count > 0),
      cancelledServices: details.cancelledServices,
      cancellationReasons: details.cancellationReasons.map(
        ({ reason, count }) => ({
          reason:
            reason === "not_informed"
              ? NOT_INFORMED_REASON_LABEL
              : CANCELLATION_REASON_LABELS[reason],
          count,
        }),
      ),
      reviews: {
        average: compareCount(
          details.reviews.average,
          previous?.reviews.average,
        ),
        ratings: details.reviews.ratings,
      },
      margin: {
        ...details.margin,
        percent:
          details.margin.percent === null
            ? null
            : {
                current: details.margin.percent,
                previous: previous?.margin.percent ?? null,
                variationPoints:
                  previous?.margin.percent != null
                    ? pointsBetween(
                        details.margin.percent,
                        previous.margin.percent,
                      )
                    : null,
              },
      },
      open: details.open,
      leadTimeDays: compareCount(
        details.leadTime.averageDays,
        previous?.leadTime.averageDays,
      ),
      leadTimeBands: {
        sameDay: details.leadTime.sameDay,
        upToThree: details.leadTime.upToThree,
        upToSeven: details.leadTime.upToSeven,
        overSeven: details.leadTime.overSeven,
      },
    },
  };
}

// The instructions of the detailed analysis (detalhada-1): the same report of
// the summary, with a section for each area of the business and the
// recommendations.
const DETAILED_INSTRUCTIONS = [
  SUMMARY_INSTRUCTIONS,
  "Este é o relatório detalhado: além do resumo e das observações, analise cada área do negócio com os dados de details.",
  `Responda também sections, as cinco seções, uma vez cada, com uma a ${MAX_OBSERVATIONS} observações de até ${COMMENT_MAX_LENGTH} caracteres: revenue (receita: os indicadores, a receita ao longo do período, os agendamentos em aberto e a margem bruta sobre os insumos), services (serviços: os que mais faturam, as categorias, a venda de complementos e os serviços mais cancelados), clients (clientes e veículos: novos e recorrentes, retornos, tipos e portes e a avaliação média dos atendimentos, de um a cinco), operation (operação: dias da semana, horários, canal de agendamento, antecedência e motivos de cancelamento) e payments (pagamentos: formas de pagamento, acréscimos e descontos).`,
  `Responda também recommendations, de nenhuma a ${MAX_RECOMMENDATIONS} sugestões práticas de até ${COMMENT_MAX_LENGTH} caracteres para o dono avaliar, apoiadas nos dados e escritas como sugestões, nunca como ordens.`,
].join("\n");

export function buildDetailedAnalysisMessages(
  input: DetailedAnalysisInput,
): AnalysisMessage[] {
  return [
    { role: "system", content: DETAILED_INSTRUCTIONS },
    { role: "user", content: JSON.stringify(input) },
  ];
}

export const DETAILED_ANALYSIS_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "highlights", "sections", "recommendations"],
  properties: {
    ...ANALYSIS_RESPONSE_SCHEMA.properties,
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["section", "observations"],
        properties: {
          section: { type: "string", enum: [...DASHBOARD_SECTIONS] },
          observations: { type: "array", items: { type: "string" } },
        },
      },
    },
    recommendations: { type: "array", items: { type: "string" } },
  },
} as const;

const detailedAnswerSchema = answerSchema.extend({
  sections: z
    .array(
      z.object({
        section: z.enum(DASHBOARD_SECTIONS),
        observations: z
          .array(textSchema(COMMENT_MAX_LENGTH))
          .min(1)
          .max(MAX_OBSERVATIONS),
      }),
    )
    .length(DASHBOARD_SECTIONS.length)
    .refine(
      (sections) =>
        new Set(sections.map(({ section }) => section)).size ===
        sections.length,
    ),
  recommendations: z
    .array(textSchema(COMMENT_MAX_LENGTH))
    .max(MAX_RECOMMENDATIONS),
});

export type ParsedDetailedAnalysis = ParsedAnalysis & {
  sections: DashboardAnalysisSection[];
  recommendations: string[];
};

// RN039: the detailed answer, with the five sections in the order of the
// screen, checked as the summary.
export function parseDetailedAnalysis(
  text: string,
):
  | { ok: true; analysis: ParsedDetailedAnalysis }
  | { ok: false; refusal: AnalysisRefusal } {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, refusal: "INVALID_RESPONSE" };
  }
  const parsed = detailedAnswerSchema.safeParse(value);
  if (!parsed.success) return { ok: false, refusal: "INVALID_RESPONSE" };
  const { summary, highlights, sections, recommendations } = parsed.data;
  const texts = [
    summary,
    ...highlights.map(({ comment }) => comment),
    ...sections.flatMap(({ observations }) => observations),
    ...recommendations,
  ];
  if (texts.some((item) => DIGIT.test(item))) {
    return { ok: false, refusal: "NUMBERS_IN_TEXT" };
  }
  const bySection = new Map(
    sections.map(({ section, observations }) => [section, observations]),
  );
  return {
    ok: true,
    analysis: {
      summary,
      highlights: highlights.map(({ indicator, comment }) => ({
        indicator,
        comment,
      })),
      sections: DASHBOARD_SECTIONS.map((section) => ({
        section,
        observations: bySection.get(section) ?? [],
      })),
      recommendations,
    },
  };
}
