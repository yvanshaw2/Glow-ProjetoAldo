import { describe, expect, it } from "vitest";
import type { DashboardAnalysis } from "@/shared/api/dashboard";
import {
  buildAnalysisText,
  describeComparedValue,
  describeVariation,
  formatIndicatorValue,
} from "@/shared/format/analysis-text";

// The values next to the analysis and the text copied (RF092, RF093,
// docs/agendamento/dashboard-do-painel.md). Intl writes R$ and the number
// with a no-break space.

const NBSP = " ";

const ANALYSIS: DashboardAnalysis = {
  from: "2026-10-01",
  to: "2026-10-31",
  analyzedTo: "2026-10-31",
  previousFrom: "2026-09-01",
  previousTo: "2026-09-30",
  hasComparison: true,
  detail: "summary",
  promptVersion: "resumida-1",
  summary: "A receita teve alta em relação a setembro.",
  highlights: [
    { indicator: "revenue", comment: "A receita subiu com mais concluídos." },
    { indicator: "revenueByDay", comment: "As segundas foram as mais fortes." },
  ],
  comparison: {
    revenue: { current: 12_500, previous: 10_000, variation: 25 },
    appointmentCount: { current: 50, previous: 40, variation: 25 },
    averageTicket: { current: 250, previous: 250, variation: 0 },
    cancellationRate: { current: 15, previous: 10, variation: 5 },
  },
  revenueSeries: { unit: "day", points: [] },
  details: null,
  sections: null,
  recommendations: null,
  generatedAt: "2026-11-18T17:32:00Z",
};

describe("formatIndicatorValue", () => {
  it("writes money, counts and rates as the indicators do", () => {
    expect(formatIndicatorValue("revenue", 12_500)).toBe(`R$${NBSP}12.500,00`);
    expect(formatIndicatorValue("averageTicket", 250)).toBe(`R$${NBSP}250,00`);
    expect(formatIndicatorValue("appointmentCount", 50)).toBe("50");
    expect(formatIndicatorValue("cancellationRate", 15)).toBe("15,00%");
  });
});

describe("describeVariation", () => {
  it("writes a rise, a fall and no change, with one place", () => {
    expect(describeVariation("revenue", 25)).toBe("alta de 25,0%");
    expect(describeVariation("appointmentCount", -12.5)).toBe("queda de 12,5%");
    expect(describeVariation("averageTicket", 0)).toBe("estável");
  });

  it("writes the cancellation rate in percentage points", () => {
    expect(describeVariation("cancellationRate", 5)).toBe(
      "alta de 5,0 pontos percentuais",
    );
    expect(describeVariation("cancellationRate", -1.5)).toBe(
      "queda de 1,5 ponto percentual",
    );
  });

  it("has nothing to say without a previous value", () => {
    expect(describeVariation("revenue", null)).toBeNull();
  });
});

describe("describeComparedValue", () => {
  it("writes the value and the variation over the previous period", () => {
    expect(describeComparedValue("revenue", ANALYSIS.comparison.revenue)).toBe(
      `R$${NBSP}12.500,00, alta de 25,0% em relação ao período anterior`,
    );
    expect(
      describeComparedValue("averageTicket", ANALYSIS.comparison.averageTicket),
    ).toBe(`R$${NBSP}250,00, estável em relação ao período anterior`);
  });

  it("writes only the value without a comparison", () => {
    expect(
      describeComparedValue("appointmentCount", {
        current: 7,
        previous: null,
        variation: null,
      }),
    ).toBe("7");
  });
});

describe("buildAnalysisText", () => {
  it("writes the period, the summary, the observations and the note", () => {
    expect(buildAnalysisText(ANALYSIS)).toBe(
      [
        "Análise do período – 01/10/2026 a 31/10/2026",
        "Comparado com 01/09/2026 a 30/09/2026",
        "",
        "A receita teve alta em relação a setembro.",
        "",
        "Observações",
        `- Receita (R$${NBSP}12.500,00; alta de 25,0%): A receita subiu com mais concluídos.`,
        "- Receita por dia: As segundas foram as mais fortes.",
        "",
        "Gerado por inteligência artificial em 18/11/2026 às 14:32. Pode conter imprecisões: os números oficiais são os dos indicadores.",
      ].join("\n"),
    );
  });

  it("says up to which day a period in progress was analyzed", () => {
    const text = buildAnalysisText({
      ...ANALYSIS,
      from: "2026-11-01",
      to: "2026-11-30",
      analyzedTo: "2026-11-18",
      previousFrom: "2026-10-01",
      previousTo: "2026-10-18",
    });
    expect(text.split("\n").slice(0, 2)).toEqual([
      "Análise do período – 01/11/2026 a 30/11/2026",
      "Analisado até 18/11/2026, comparado com 01/10/2026 a 18/10/2026",
    ]);
  });

  it("says there is no comparison and leaves out empty observations", () => {
    const text = buildAnalysisText({
      ...ANALYSIS,
      hasComparison: false,
      highlights: [],
      comparison: {
        revenue: { current: 300, previous: null, variation: null },
        appointmentCount: { current: 2, previous: null, variation: null },
        averageTicket: { current: 150, previous: null, variation: null },
        cancellationRate: { current: 0, previous: null, variation: null },
      },
    });
    expect(text.split("\n")[1]).toBe(
      "O período anterior não tem agendamentos: a análise não compara os períodos.",
    );
    expect(text).not.toContain("Observações");
  });

  it("writes the value without a variation when there is no comparison", () => {
    const text = buildAnalysisText({
      ...ANALYSIS,
      hasComparison: false,
      highlights: [{ indicator: "revenue", comment: "Mês de abertura." }],
      comparison: {
        ...ANALYSIS.comparison,
        revenue: { current: 300, previous: null, variation: null },
      },
    });
    expect(text).toContain(`- Receita (R$${NBSP}300,00): Mês de abertura.`);
  });
});
