import { describe, expect, it } from "vitest";
import {
  ANALYSIS_PROMPT_VERSIONS,
  buildAnalysisInput,
  buildAnalysisMessages,
  buildComparison,
  buildDetailedAnalysisInput,
  buildDetailedAnalysisMessages,
  buildRevenueSeries,
  calculateVariation,
  findComparisonPeriods,
  parseAnalysis,
  parseDetailedAnalysis,
} from "@/server/rules/dashboard-analysis";
import {
  buildDetails,
  type DashboardDetailsFigures,
} from "@/server/rules/dashboard-details";
import type { DashboardIndicators } from "@/server/rules/dashboard-indicators";
import type { Dashboard } from "@/shared/api/dashboard";
import { APPOINTMENT_STATUSES } from "@/shared/constants/appointment-statuses";
import { listCalendarDays, type CalendarPeriod } from "@/shared/format/date";

// The analysis of the dashboard (UC27, RN038, RN039, docs/agendamento/
// calculos.md, section 6): the periods compared, the variations, the input of
// the model and the check of its answer.

const TODAY = "2026-11-18";

function indicators(
  period: CalendarPeriod,
  values: Partial<Omit<DashboardIndicators, "revenueByDay">> = {},
  revenue: Record<string, number> = {},
): DashboardIndicators {
  return {
    revenue: 0,
    appointmentCount: 0,
    averageTicket: 0,
    cancellationRate: 0,
    appointmentsByStatus: APPOINTMENT_STATUSES.map((status) => ({
      status,
      count: 0,
    })),
    ...values,
    revenueByDay: listCalendarDays(period).map((date) => ({
      date,
      revenue: revenue[date] ?? 0,
    })),
  };
}

describe("findComparisonPeriods", () => {
  it("compares whole calendar months with the months before them (L18)", () => {
    expect(
      findComparisonPeriods({ from: "2026-10-01", to: "2026-10-31" }, TODAY),
    ).toEqual({
      analyzed: { from: "2026-10-01", to: "2026-10-31" },
      previous: { from: "2026-09-01", to: "2026-09-30" },
      isPartial: false,
    });
    expect(
      findComparisonPeriods({ from: "2025-01-01", to: "2025-12-31" }, TODAY),
    ).toEqual({
      analyzed: { from: "2025-01-01", to: "2025-12-31" },
      previous: { from: "2024-01-01", to: "2024-12-31" },
      isPartial: false,
    });
  });

  it("ends the previous month on its last day, in a leap year too", () => {
    expect(
      findComparisonPeriods(
        { from: "2028-03-01", to: "2028-03-31" },
        "2028-04-10",
      )?.previous,
    ).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    expect(
      findComparisonPeriods(
        { from: "2027-02-01", to: "2027-02-28" },
        "2027-03-10",
      )?.previous,
    ).toEqual({ from: "2027-01-01", to: "2027-01-31" });
  });

  it("compares other periods with the same number of days just before", () => {
    expect(
      findComparisonPeriods({ from: "2026-10-21", to: "2026-10-21" }, TODAY)
        ?.previous,
    ).toEqual({ from: "2026-10-20", to: "2026-10-20" });
    expect(
      findComparisonPeriods({ from: "2026-10-15", to: "2026-10-21" }, TODAY)
        ?.previous,
    ).toEqual({ from: "2026-10-08", to: "2026-10-14" });
    expect(
      findComparisonPeriods({ from: "2026-01-01", to: "2026-01-07" }, TODAY)
        ?.previous,
    ).toEqual({ from: "2025-12-25", to: "2025-12-31" });
  });

  it("cuts a period that ends after today and compares the same days", () => {
    expect(
      findComparisonPeriods({ from: "2026-11-01", to: "2026-11-30" }, TODAY),
    ).toEqual({
      analyzed: { from: "2026-11-01", to: "2026-11-18" },
      previous: { from: "2026-10-01", to: "2026-10-18" },
      isPartial: true,
    });
    expect(
      findComparisonPeriods(
        { from: "2027-03-01", to: "2027-03-31" },
        "2027-03-30",
      )?.previous,
    ).toEqual({ from: "2027-02-01", to: "2027-02-28" });
  });

  it("does not cut a period that ends today", () => {
    expect(
      findComparisonPeriods({ from: "2026-11-12", to: TODAY }, TODAY),
    ).toEqual({
      analyzed: { from: "2026-11-12", to: TODAY },
      previous: { from: "2026-11-05", to: "2026-11-11" },
      isPartial: false,
    });
  });

  it("cuts a period of days that ends after today by the days analyzed", () => {
    expect(
      findComparisonPeriods({ from: "2026-11-10", to: "2026-11-25" }, TODAY),
    ).toEqual({
      analyzed: { from: "2026-11-10", to: TODAY },
      previous: { from: "2026-11-01", to: "2026-11-09" },
      isPartial: true,
    });
  });

  it("has nothing to analyze in a period that starts after today", () => {
    expect(
      findComparisonPeriods({ from: "2026-12-01", to: "2026-12-31" }, TODAY),
    ).toBeNull();
  });
});

describe("calculateVariation", () => {
  it("calculates the percentage over the previous value, with one place", () => {
    expect(calculateVariation(12_500, 10_000)).toBe(25);
    expect(calculateVariation(60, 80)).toBe(-25);
    expect(calculateVariation(4, 3)).toBe(33.3);
    expect(calculateVariation(250, 250)).toBe(0);
  });

  it("rounds the half away from zero", () => {
    expect(calculateVariation(2001, 2000)).toBe(0.1);
    expect(calculateVariation(1999, 2000)).toBe(-0.1);
  });

  it("has no variation when the previous value is zero", () => {
    expect(calculateVariation(5, 0)).toBeNull();
    expect(calculateVariation(0, 0)).toBeNull();
  });
});

describe("buildComparison", () => {
  const OCTOBER = { from: "2026-10-01", to: "2026-10-31" };
  const SEPTEMBER = { from: "2026-09-01", to: "2026-09-30" };

  it("compares the four indicators, the cancellation rate in points", () => {
    const comparison = buildComparison(
      indicators(OCTOBER, {
        revenue: 12_500,
        appointmentCount: 50,
        averageTicket: 250,
        cancellationRate: 15.25,
      }),
      indicators(SEPTEMBER, {
        revenue: 10_000,
        appointmentCount: 40,
        averageTicket: 250,
        cancellationRate: 10.1,
      }),
    );
    expect(comparison).toEqual({
      revenue: { current: 12_500, previous: 10_000, variation: 25 },
      appointmentCount: { current: 50, previous: 40, variation: 25 },
      averageTicket: { current: 250, previous: 250, variation: 0 },
      cancellationRate: { current: 15.25, previous: 10.1, variation: 5.2 },
    });
  });

  it("uses points even when the previous rate is zero", () => {
    expect(
      buildComparison(
        indicators(OCTOBER, { appointmentCount: 10, cancellationRate: 10 }),
        indicators(SEPTEMBER, { appointmentCount: 8, cancellationRate: 0 }),
      ).cancellationRate,
    ).toEqual({ current: 10, previous: 0, variation: 10 });
  });

  it("has no previous values without a comparison", () => {
    expect(
      buildComparison(
        indicators(OCTOBER, { revenue: 300, appointmentCount: 2 }),
        null,
      ),
    ).toEqual({
      revenue: { current: 300, previous: null, variation: null },
      appointmentCount: { current: 2, previous: null, variation: null },
      averageTicket: { current: 0, previous: null, variation: null },
      cancellationRate: { current: 0, previous: null, variation: null },
    });
  });
});

describe("buildRevenueSeries", () => {
  function days(from: string, count: number) {
    const to = listCalendarDays({ from, to: "2030-12-31" })[count - 1];
    return indicators({ from, to }, {}, {}).revenueByDay;
  }

  it("keeps one position per day up to 62 days", () => {
    const series = buildRevenueSeries(
      days("2026-09-01", 62),
      days("2026-07-01", 62),
    );
    expect(series.unit).toBe("day");
    expect(series.points).toHaveLength(62);
    expect(series.points[0]).toEqual({
      currentStart: "2026-09-01",
      currentRevenue: 0,
      previousStart: "2026-07-01",
      previousRevenue: 0,
    });
  });

  it("sums blocks of seven days from the first one above 62 days", () => {
    const current = days("2026-01-01", 63).map((day, index) => ({
      ...day,
      revenue: index >= 56 ? 10.1 : 0,
    }));
    const series = buildRevenueSeries(current, null);
    expect(series.unit).toBe("week");
    expect(series.points).toHaveLength(9);
    expect(series.points[8]).toEqual({
      currentStart: "2026-02-26",
      currentRevenue: 70.7,
      previousStart: null,
      previousRevenue: null,
    });
  });

  it("leaves the last block with the days that are left", () => {
    const current = days("2026-01-01", 366).map((day, index) => ({
      ...day,
      revenue: index >= 364 ? 50 : 0,
    }));
    const series = buildRevenueSeries(current, null);
    expect(series.points).toHaveLength(53);
    expect(series.points[52]).toMatchObject({
      currentStart: "2026-12-31",
      currentRevenue: 100,
    });
  });

  it("aligns the periods by position and leaves the shorter one empty", () => {
    const series = buildRevenueSeries(
      days("2026-10-01", 31),
      days("2026-09-01", 30),
    );
    expect(series.points).toHaveLength(31);
    expect(series.points[29].previousStart).toBe("2026-09-30");
    expect(series.points[30]).toEqual({
      currentStart: "2026-10-31",
      currentRevenue: 0,
      previousStart: null,
      previousRevenue: null,
    });
  });
});

describe("buildAnalysisInput", () => {
  const periods = {
    analyzed: { from: "2026-10-01", to: "2026-10-31" },
    previous: { from: "2026-09-01", to: "2026-09-30" },
    isPartial: false,
  };
  const current = indicators(periods.analyzed, {
    revenue: 12_500,
    appointmentCount: 50,
    averageTicket: 250,
    cancellationRate: 15,
    appointmentsByStatus: APPOINTMENT_STATUSES.map((status) => ({
      status,
      count: status === "completed" ? 30 : status === "cancelled" ? 8 : 2,
    })),
  });
  const previous = indicators(periods.previous, {
    revenue: 10_000,
    appointmentCount: 40,
    averageTicket: 250,
    cancellationRate: 10,
  });

  it("builds the input only with aggregated values", () => {
    const dashboard: Dashboard = {
      ...periods.analyzed,
      ...current,
      agenda: [
        {
          id: "7d1f2c3a-0000-4000-8000-000000000001",
          status: "scheduled",
          scheduledAt: "2026-10-21T13:00:00Z",
          estimatedEndAt: "2026-10-21T14:00:00Z",
          clientName: "Maria da Silva",
          vehicle: { plate: "GLW1A23", brand: "Fiat", model: "Argo" },
          services: [
            { id: "7d1f2c3a-0000-4000-8000-000000000002", name: "Lavagem" },
          ],
          total: 80,
        },
      ],
    };
    const input = buildAnalysisInput({
      periods,
      current: dashboard,
      comparison: buildComparison(dashboard, previous),
      series: buildRevenueSeries(dashboard.revenueByDay, previous.revenueByDay),
      hasComparison: true,
    });
    const text = JSON.stringify(input);
    expect(input).not.toHaveProperty("agenda");
    for (const value of [
      "Maria",
      "GLW1A23",
      "Fiat",
      "Argo",
      "7d1f2c3a",
      "@",
      "Lavagem",
    ]) {
      expect(text).not.toContain(value);
    }
    expect(input.period).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
      days: 31,
      isPartial: false,
    });
    expect(input.previousPeriod).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
      hasAppointments: true,
    });
    expect(input.indicators).toEqual({
      revenue: { current: 12_500, previous: 10_000, variationPercent: 25 },
      appointmentCount: { current: 50, previous: 40, variationPercent: 25 },
      averageTicket: { current: 250, previous: 250, variationPercent: 0 },
      cancellationRate: { current: 15, previous: 10, variationPoints: 5 },
    });
  });

  it("uses the status labels of RN017", () => {
    const input = buildAnalysisInput({
      periods,
      current,
      comparison: buildComparison(current, previous),
      series: buildRevenueSeries(current.revenueByDay, previous.revenueByDay),
      hasComparison: true,
    });
    expect(input.appointmentsByStatus).toMatchObject({
      Concluído: 30,
      Cancelado: 8,
      Agendado: 2,
    });
    expect(input.appointmentsByStatus).not.toHaveProperty("completed");
  });

  it("marks the comparison as unavailable without a previous period", () => {
    const input = buildAnalysisInput({
      periods,
      current,
      comparison: buildComparison(current, null),
      series: buildRevenueSeries(current.revenueByDay, null),
      hasComparison: false,
    });
    expect(input.previousPeriod.hasAppointments).toBe(false);
    expect(input.indicators.revenue).toEqual({
      current: 12_500,
      previous: null,
      variationPercent: null,
    });
    expect(input.revenueSeries.points[0]).toEqual({
      position: 1,
      current: 0,
      previous: null,
    });
  });
});

describe("buildAnalysisMessages", () => {
  it("sends the fixed instructions and the input as JSON", () => {
    const input = buildAnalysisInput({
      periods: {
        analyzed: { from: "2026-11-01", to: TODAY },
        previous: { from: "2026-10-01", to: "2026-10-18" },
        isPartial: true,
      },
      current: indicators({ from: "2026-11-01", to: TODAY }, {}),
      comparison: buildComparison(
        indicators({ from: "2026-11-01", to: TODAY }, {}),
        null,
      ),
      series: buildRevenueSeries(
        indicators({ from: "2026-11-01", to: TODAY }, {}).revenueByDay,
        null,
      ),
      hasComparison: false,
    });
    const messages = buildAnalysisMessages(input);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("algarismo");
    expect(messages[1].role).toBe("user");
    expect(JSON.parse(messages[1].content)).toEqual(input);
  });

  it("has a version for the instructions of the summary", () => {
    expect(ANALYSIS_PROMPT_VERSIONS.summary).toBe("resumida-1");
  });
});

describe("parseAnalysis", () => {
  const VALID = {
    summary: "A receita  subiu   em relação ao período anterior.",
    highlights: [
      { indicator: "revenue", comment: "A receita cresceu." },
      {
        indicator: "cancellationRate",
        comment: "Os cancelamentos pedem atenção.",
      },
    ],
  };

  it("accepts a valid analysis, with repeated spaces removed", () => {
    expect(parseAnalysis(JSON.stringify(VALID))).toEqual({
      ok: true,
      analysis: {
        summary: "A receita subiu em relação ao período anterior.",
        highlights: VALID.highlights,
      },
    });
  });

  it("accepts an analysis with no highlights", () => {
    expect(
      parseAnalysis(
        JSON.stringify({ summary: "Período estável.", highlights: [] }),
      ),
    ).toEqual({
      ok: true,
      analysis: { summary: "Período estável.", highlights: [] },
    });
  });

  it("discards the unknown fields of the response", () => {
    const result = parseAnalysis(
      JSON.stringify({
        ...VALID,
        extra: "x",
        highlights: [{ ...VALID.highlights[0], score: 1 }],
      }),
    );
    expect(result).toEqual({
      ok: true,
      analysis: {
        summary: "A receita subiu em relação ao período anterior.",
        highlights: [VALID.highlights[0]],
      },
    });
  });

  it("rejects a response that is not JSON or not an object", () => {
    for (const text of ["", "A receita subiu.", "[]", "null"]) {
      expect(parseAnalysis(text)).toEqual({
        ok: false,
        refusal: "INVALID_RESPONSE",
      });
    }
  });

  it("rejects a missing, empty or over 600-character summary", () => {
    for (const summary of [undefined, "   ", "a".repeat(601)]) {
      expect(parseAnalysis(JSON.stringify({ ...VALID, summary }))).toEqual({
        ok: false,
        refusal: "INVALID_RESPONSE",
      });
    }
    expect(
      parseAnalysis(JSON.stringify({ ...VALID, summary: "a".repeat(600) })).ok,
    ).toBe(true);
  });

  it("rejects five highlights, an unknown indicator or a long comment", () => {
    const highlight = VALID.highlights[0];
    for (const highlights of [
      Array.from({ length: 5 }, () => highlight),
      [{ indicator: "profit", comment: "A margem subiu." }],
      [{ ...highlight, comment: "a".repeat(241) }],
      [{ ...highlight, comment: "" }],
      "revenue",
    ]) {
      expect(parseAnalysis(JSON.stringify({ ...VALID, highlights }))).toEqual({
        ok: false,
        refusal: "INVALID_RESPONSE",
      });
    }
  });

  it("rejects digits in the summary or in a comment (RN039)", () => {
    expect(
      parseAnalysis(
        JSON.stringify({ ...VALID, summary: "A receita subiu 25%." }),
      ),
    ).toEqual({ ok: false, refusal: "NUMBERS_IN_TEXT" });
    expect(
      parseAnalysis(
        JSON.stringify({
          ...VALID,
          highlights: [
            { indicator: "revenue", comment: "Foram 3 dias fortes." },
          ],
        }),
      ),
    ).toEqual({ ok: false, refusal: "NUMBERS_IN_TEXT" });
  });
});

// The detailed analysis (RF091, RN039, RN040): the indicators of RN040 go to
// the model with the summary input, and the answer has five sections and the
// recommendations.
const DETAIL_FIGURES: DashboardDetailsFigures = {
  services: [
    { name: "Polimento técnico", revenue: 1800, count: 3 },
    { name: "Lavagem simples", revenue: 600, count: 12 },
  ],
  categories: [{ name: "Polimento", revenue: 1800, count: 3 }],
  paidCount: 15,
  paidWithExtras: 5,
  vehicleTypes: [{ type: "suv", count: 6 }],
  scheduledSizes: [{ size: "large", count: 6 }],
  paidSizes: [{ size: "large", paidCount: 5, paidRevenue: 1500 }],
  payments: [{ method: "pix", count: 9, revenue: 1450 }],
  surcharges: 30,
  discounts: 12.5,
  channel: { client: 4, panel: 16 },
  clients: { total: 18, new: 5 },
  returns: 2,
  scheduledByWeekday: [{ weekday: 1, count: 6, cancelled: 1 }],
  revenueByWeekday: [{ weekday: 1, revenue: 700 }],
  hours: [{ hour: 9, count: 4 }],
  cancelledServices: [{ name: "Lavagem simples", count: 2 }],
  cancellationReasons: [],
  reviews: [
    { rating: 5, count: 3 },
    { rating: 3, count: 1 },
  ],
  margin: { revenue: 1000, cost: 300, withCostCount: 10, withoutCostCount: 2 },
  open: { count: 3, total: 420 },
  leadTime: {
    count: 20,
    totalDays: 50,
    sameDay: 4,
    upToThree: 8,
    upToSeven: 6,
    overSeven: 2,
  },
};

const VALID_DETAILED = {
  summary: "O período teve alta de receita, puxada pelos polimentos.",
  highlights: [{ indicator: "revenue", comment: "A receita subiu." }],
  sections: [
    {
      section: "payments",
      observations: ["O Pix segue como a forma preferida."],
    },
    {
      section: "revenue",
      observations: ["A receita cresceu na segunda metade."],
    },
    {
      section: "services",
      observations: ["O polimento técnico liderou.", "A lavagem simples caiu."],
    },
    { section: "clients", observations: ["Os clientes recorrentes dominam."] },
    {
      section: "operation",
      observations: ["As segundas foram as mais cheias."],
    },
  ],
  recommendations: ["Considere uma promoção de polimento nas quintas."],
};

describe("buildDetailedAnalysisInput", () => {
  const periods = {
    analyzed: { from: "2026-10-01", to: "2026-10-31" },
    previous: { from: "2026-09-01", to: "2026-09-30" },
    isPartial: false,
  };
  const current = indicators(periods.analyzed, {
    revenue: 2400,
    appointmentCount: 20,
  });
  const previous = indicators(periods.previous, {
    revenue: 2000,
    appointmentCount: 16,
  });
  const base = buildAnalysisInput({
    periods,
    current,
    comparison: buildComparison(current, previous),
    series: buildRevenueSeries(current.revenueByDay, previous.revenueByDay),
    hasComparison: true,
  });

  it("adds the indicators of RN040, with labels and no personal data", () => {
    const input = buildDetailedAnalysisInput({
      base,
      details: buildDetails(DETAIL_FIGURES),
      previousDetails: buildDetails({
        ...DETAIL_FIGURES,
        clients: { total: 15, new: 3 },
        returns: 1,
        paidCount: 10,
        paidWithExtras: 2,
      }),
    });
    expect(input.indicators).toEqual(base.indicators);
    expect(input.details.services.top[0]).toEqual({
      name: "Polimento técnico",
      revenue: 1800,
      count: 3,
    });
    expect(input.details.payments).toContainEqual({
      method: "Pix",
      count: 9,
      revenue: 1450,
    });
    expect(input.details.weekdays[0]).toEqual({
      weekday: "Segunda-feira",
      appointments: 6,
      cancelled: 1,
      revenue: 700,
    });
    expect(input.details.hours).toEqual([{ hour: 9, count: 4 }]);
    expect(input.details.clients).toEqual({
      new: { current: 5, previous: 3, variationPercent: 66.7 },
      returning: { current: 13, previous: 12, variationPercent: 8.3 },
    });
    expect(input.details.extrasRate).toEqual({
      current: 33.33,
      previous: 20,
      variationPoints: 13.3,
    });
    expect(input.details.returns).toEqual({
      current: 2,
      previous: 1,
      variationPercent: 100,
    });
    const text = JSON.stringify(input);
    for (const value of ["client_id", "GLW", "@", "Maria"]) {
      expect(text).not.toContain(value);
    }
  });

  it("has no previous values without a comparison", () => {
    const input = buildDetailedAnalysisInput({
      base,
      details: buildDetails(DETAIL_FIGURES),
      previousDetails: null,
    });
    expect(input.details.returns).toEqual({
      current: 2,
      previous: null,
      variationPercent: null,
    });
    expect(input.details.leadTimeDays).toEqual({
      current: 2.5,
      previous: null,
      variationPercent: null,
    });
  });

  it("sends the instructions of the detailed analysis and the input as JSON", () => {
    const input = buildDetailedAnalysisInput({
      base,
      details: buildDetails(DETAIL_FIGURES),
      previousDetails: null,
    });
    const messages = buildDetailedAnalysisMessages(input);
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("sections");
    expect(messages[0].content).not.toBe(
      buildAnalysisMessages(base)[0].content,
    );
    expect(JSON.parse(messages[1].content)).toEqual(input);
  });
});

describe("parseDetailedAnalysis", () => {
  it("accepts a valid analysis and orders the sections as the screen", () => {
    const result = parseDetailedAnalysis(JSON.stringify(VALID_DETAILED));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.analysis.sections.map(({ section }) => section)).toEqual([
      "revenue",
      "services",
      "clients",
      "operation",
      "payments",
    ]);
    expect(result.analysis.recommendations).toEqual(
      VALID_DETAILED.recommendations,
    );
    expect(result.analysis.summary).toBe(VALID_DETAILED.summary);
  });

  it("accepts no recommendations", () => {
    expect(
      parseDetailedAnalysis(
        JSON.stringify({ ...VALID_DETAILED, recommendations: [] }),
      ).ok,
    ).toBe(true);
  });

  it("rejects a missing, unknown or repeated section", () => {
    const [first, ...others] = VALID_DETAILED.sections;
    for (const sections of [
      others,
      [...others, { ...first, section: "staff" }],
      [...others, { ...others[0] }],
    ]) {
      expect(
        parseDetailedAnalysis(JSON.stringify({ ...VALID_DETAILED, sections })),
      ).toEqual({ ok: false, refusal: "INVALID_RESPONSE" });
    }
  });

  it("rejects no or four observations, five recommendations and long texts", () => {
    const [first, ...others] = VALID_DETAILED.sections;
    for (const change of [
      { sections: [{ ...first, observations: [] }, ...others] },
      {
        sections: [
          { ...first, observations: ["Alta.", "Queda.", "Alta.", "Queda."] },
          ...others,
        ],
      },
      { sections: [{ ...first, observations: ["a".repeat(241)] }, ...others] },
      { recommendations: ["Uma.", "Duas.", "Três.", "Quatro.", "Cinco."] },
      { recommendations: ["a".repeat(241)] },
    ]) {
      expect(
        parseDetailedAnalysis(JSON.stringify({ ...VALID_DETAILED, ...change })),
      ).toEqual({ ok: false, refusal: "INVALID_RESPONSE" });
    }
  });

  it("rejects digits in a section or in a recommendation (RN039)", () => {
    const [first, ...others] = VALID_DETAILED.sections;
    for (const change of [
      {
        sections: [
          { ...first, observations: ["Foram 12 polimentos."] },
          ...others,
        ],
      },
      { recommendations: ["Abra mais cedo, às 7h, aos sábados."] },
    ]) {
      expect(
        parseDetailedAnalysis(JSON.stringify({ ...VALID_DETAILED, ...change })),
      ).toEqual({ ok: false, refusal: "NUMBERS_IN_TEXT" });
    }
  });
});

describe("buildDetailedAnalysisInput, cancellation reasons", () => {
  it("sends the reasons by their labels", () => {
    const periods = {
      analyzed: { from: "2026-10-01", to: "2026-10-31" },
      previous: { from: "2026-09-01", to: "2026-09-30" },
      isPartial: false,
    };
    const current = indicators(periods.analyzed, { appointmentCount: 5 });
    const input = buildDetailedAnalysisInput({
      base: buildAnalysisInput({
        periods,
        current,
        comparison: buildComparison(current, null),
        series: buildRevenueSeries(current.revenueByDay, null),
        hasComparison: false,
      }),
      details: buildDetails({
        ...DETAIL_FIGURES,
        cancellationReasons: [
          { reason: "no_show", count: 2 },
          { reason: null, count: 1 },
        ],
      }),
      previousDetails: null,
    });
    expect(input.details.cancellationReasons).toEqual([
      { reason: "Não comparecimento", count: 2 },
      { reason: "Não informado", count: 1 },
    ]);
  });
});

describe("buildDetailedAnalysisInput, margin", () => {
  it("sends the margin with the previous one in points", () => {
    const periods = {
      analyzed: { from: "2026-10-01", to: "2026-10-31" },
      previous: { from: "2026-09-01", to: "2026-09-30" },
      isPartial: false,
    };
    const current = indicators(periods.analyzed, { appointmentCount: 5 });
    const input = buildDetailedAnalysisInput({
      base: buildAnalysisInput({
        periods,
        current,
        comparison: buildComparison(current, null),
        series: buildRevenueSeries(current.revenueByDay, null),
        hasComparison: true,
      }),
      details: buildDetails(DETAIL_FIGURES),
      previousDetails: buildDetails({
        ...DETAIL_FIGURES,
        margin: {
          revenue: 1000,
          cost: 350,
          withCostCount: 9,
          withoutCostCount: 0,
        },
      }),
    });
    expect(input.details.margin).toEqual({
      revenue: 1000,
      cost: 300,
      gross: 700,
      percent: { current: 70, previous: 65, variationPoints: 5 },
      withoutCostCount: 2,
    });
  });
});

describe("buildDetailedAnalysisInput, reviews", () => {
  it("sends the average with the previous one and the count of each rating", () => {
    const periods = {
      analyzed: { from: "2026-10-01", to: "2026-10-31" },
      previous: { from: "2026-09-01", to: "2026-09-30" },
      isPartial: false,
    };
    const current = indicators(periods.analyzed, { appointmentCount: 5 });
    const input = buildDetailedAnalysisInput({
      base: buildAnalysisInput({
        periods,
        current,
        comparison: buildComparison(current, null),
        series: buildRevenueSeries(current.revenueByDay, null),
        hasComparison: true,
      }),
      details: buildDetails(DETAIL_FIGURES),
      previousDetails: buildDetails({
        ...DETAIL_FIGURES,
        reviews: [{ rating: 4, count: 2 }],
      }),
    });
    expect(input.details.reviews).toEqual({
      average: { current: 4.5, previous: 4, variationPercent: 12.5 },
      ratings: [
        { rating: 5, count: 3 },
        { rating: 4, count: 0 },
        { rating: 3, count: 1 },
        { rating: 2, count: 0 },
        { rating: 1, count: 0 },
      ],
    });
    expect(ANALYSIS_PROMPT_VERSIONS.detailed).toBe("detalhada-4");
  });
});
