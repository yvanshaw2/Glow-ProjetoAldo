import { describe, expect, it } from "vitest";
import type {
  DashboardAnalysis,
  DashboardDetails,
} from "@/shared/api/dashboard";
import {
  buildAnalysisText,
  describeComparedValue,
  describeSectionNumbers,
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

// The numbers of each section of the detailed analysis and its copied text
// (RF091, RF093, docs/agendamento/dashboard-do-painel.md).
const DETAILS: DashboardDetails = {
  services: {
    top: [
      { name: "Polimento técnico", revenue: 1800, count: 3 },
      { name: "Lavagem simples", revenue: 600, count: 1 },
    ],
    others: { revenue: 200.5, count: 15 },
  },
  categories: [
    { name: "Polimento", revenue: 1800, count: 3 },
    { name: "Lavagem", revenue: 600, count: 12 },
  ],
  extrasRate: 33.33,
  vehicleTypes: [
    { type: "hatch", count: 2 },
    { type: "sedan", count: 0 },
    { type: "suv", count: 6 },
    { type: "pickup", count: 1 },
  ],
  vehicleSizes: [
    { size: "small", count: 2, averageTicket: 80 },
    { size: "medium", count: 0, averageTicket: 0 },
    { size: "large", count: 6, averageTicket: 300 },
    { size: "extra_large", count: 1, averageTicket: 0 },
  ],
  payments: [
    { method: "credit", count: 1, revenue: 300 },
    { method: "debit", count: 0, revenue: 0 },
    { method: "pix", count: 9, revenue: 1450 },
    { method: "cash", count: 0, revenue: 0 },
  ],
  surcharges: 30,
  discounts: 12.5,
  channel: { client: 4, panel: 16 },
  clients: { total: 18, new: 5, returning: 13 },
  returns: 2,
  weekdays: [
    { weekday: 1, appointments: 6, cancelled: 1, revenue: 700 },
    { weekday: 2, appointments: 1, cancelled: 0, revenue: 80 },
    { weekday: 3, appointments: 0, cancelled: 0, revenue: 0 },
    { weekday: 4, appointments: 0, cancelled: 0, revenue: 0 },
    { weekday: 5, appointments: 0, cancelled: 0, revenue: 0 },
    { weekday: 6, appointments: 2, cancelled: 2, revenue: 0 },
    { weekday: 0, appointments: 0, cancelled: 0, revenue: 0 },
  ],
  hours: Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count:
      hour === 9 ? 4 : hour === 14 ? 4 : hour === 10 ? 3 : hour === 8 ? 1 : 0,
  })),
  cancelledServices: [{ name: "Lavagem simples", count: 2 }],
  open: { count: 3, total: 420 },
  leadTime: {
    averageDays: 2.5,
    sameDay: 4,
    upToThree: 8,
    upToSeven: 6,
    overSeven: 2,
  },
};

describe("describeSectionNumbers", () => {
  it("writes the open appointments in the revenue", () => {
    expect(describeSectionNumbers("revenue", DETAILS)).toEqual([
      `Agendamentos em aberto no período: 3 (R$${NBSP}420,00)`,
    ]);
  });

  it("writes the services, the categories, the extras and the cancelled", () => {
    expect(describeSectionNumbers("services", DETAILS)).toEqual([
      `Polimento técnico: R$${NBSP}1.800,00 (3 vezes)`,
      `Lavagem simples: R$${NBSP}600,00 (1 vez)`,
      `Demais: R$${NBSP}200,50 (15 vezes)`,
      `Categorias: Polimento R$${NBSP}1.800,00 · Lavagem R$${NBSP}600,00`,
      "Com complementos ou adicionais: 33,33% dos pagos",
      "Mais cancelados: Lavagem simples (2)",
    ]);
  });

  it("writes the clients, the returns, the types and the sizes", () => {
    expect(describeSectionNumbers("clients", DETAILS)).toEqual([
      "Clientes: 18 (5 novos e 13 recorrentes)",
      "Retornos de serviços concluídos: 2",
      "Tipos: Hatch 2 · Sedan 0 · SUV 6 · Picape 1",
      "Portes: P 2 · M 0 · G 6 · GG 1",
      `Ticket médio por porte: P R$${NBSP}80,00 · G R$${NBSP}300,00`,
    ]);
  });

  it("writes the weekdays with appointments, the busiest hours, the channel and the lead time", () => {
    expect(describeSectionNumbers("operation", DETAILS)).toEqual([
      `Segunda-feira: 6 agendamentos, 1 cancelado, R$${NBSP}700,00`,
      `Terça-feira: 1 agendamento, 0 cancelados, R$${NBSP}80,00`,
      `Sábado: 2 agendamentos, 2 cancelados, R$${NBSP}0,00`,
      "Horários mais procurados: 9h (4) · 14h (4) · 10h (3)",
      "Canal: 4 pelo portal e 16 pelo painel",
      "Antecedência média: 2,5 dias (no mesmo dia: 4 · de 1 a 3 dias: 8 · de 4 a 7 dias: 6 · mais de 7 dias: 2)",
    ]);
  });

  it("says when there is no lead time to average", () => {
    expect(
      describeSectionNumbers("operation", {
        ...DETAILS,
        leadTime: { ...DETAILS.leadTime, averageDays: null },
      }),
    ).toContain("Antecedência média: sem agendamentos no período");
  });

  it("writes the payment methods used, the surcharges and the discounts", () => {
    expect(describeSectionNumbers("payments", DETAILS)).toEqual([
      `Crédito: 1 pagamento, R$${NBSP}300,00`,
      `Pix: 9 pagamentos, R$${NBSP}1.450,00`,
      `Acréscimos: R$${NBSP}30,00 · Descontos: R$${NBSP}12,50`,
    ]);
  });
});

describe("buildAnalysisText of the detailed analysis", () => {
  const DETAILED: DashboardAnalysis = {
    ...ANALYSIS,
    detail: "detailed",
    promptVersion: "detalhada-1",
    details: DETAILS,
    sections: [
      { section: "revenue", observations: ["A receita cresceu."] },
      { section: "services", observations: ["O polimento liderou."] },
      { section: "clients", observations: ["Os recorrentes dominam."] },
      { section: "operation", observations: ["As segundas lotam."] },
      { section: "payments", observations: ["O Pix lidera."] },
    ],
    recommendations: ["Considere divulgar o polimento."],
  };

  it("writes each section with its numbers and the recommendations", () => {
    const lines = buildAnalysisText(DETAILED).split("\n");
    const revenue = lines.indexOf("Receita");
    expect(lines.slice(revenue, revenue + 3)).toEqual([
      "Receita",
      "- A receita cresceu.",
      `Números: Agendamentos em aberto no período: 3 (R$${NBSP}420,00)`,
    ]);
    const recommendations = lines.indexOf("Sugestões");
    expect(lines.slice(recommendations, recommendations + 3)).toEqual([
      "Sugestões",
      "- Considere divulgar o polimento.",
      "Sugestões geradas por IA: avalie antes de colocar em prática.",
    ]);
    expect(lines.indexOf("Pagamentos")).toBeGreaterThan(
      lines.indexOf("Operação"),
    );
    expect(lines.at(-1)).toContain("Gerado por inteligência artificial");
  });

  it("leaves the recommendations out when there are none", () => {
    expect(
      buildAnalysisText({ ...DETAILED, recommendations: [] }),
    ).not.toContain("Sugestões");
  });
});
