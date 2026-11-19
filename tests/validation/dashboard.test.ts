import { describe, expect, it } from "vitest";
import {
  dashboardAnalysisSchema,
  dashboardPeriodQuerySchema,
} from "@/shared/validation/dashboard";

// The query of GET /api/admin/dashboard (UC09, RN035, docs/agendamento/
// rotas.md).

// Messages from docs/plataforma/mensagens-de-validacao.md.
const REQUIRED = "Preencha este campo.";
const INVALID_DATE = "Informe uma data válida.";
const REVERSED = "A data final não pode ser anterior à inicial.";
const TOO_LONG = "O período não pode passar de 12 meses.";
const UNKNOWN_DETAIL = "Escolha um tipo de análise válido.";

function messages(query: Record<string, string>) {
  const result = dashboardPeriodQuerySchema.safeParse(query);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((issue) => [issue.path.join("."), issue.message]),
  );
}

describe("dashboardPeriodQuerySchema", () => {
  it("accepts no dates and keeps both absent", () => {
    expect(dashboardPeriodQuerySchema.parse({})).toEqual({});
  });

  it("treats empty dates as absent", () => {
    expect(dashboardPeriodQuerySchema.parse({ from: "", to: "" })).toEqual({});
  });

  it("accepts a period of one day", () => {
    expect(
      dashboardPeriodQuerySchema.parse({
        from: "2026-10-05",
        to: "2026-10-05",
      }),
    ).toEqual({ from: "2026-10-05", to: "2026-10-05" });
  });

  it("accepts 366 days, in a common and in a leap year", () => {
    expect(messages({ from: "2026-01-01", to: "2027-01-01" })).toEqual({});
    expect(messages({ from: "2028-01-01", to: "2028-12-31" })).toEqual({});
  });

  it("rejects 367 days", () => {
    expect(messages({ from: "2026-01-01", to: "2027-01-02" })).toEqual({
      to: TOO_LONG,
    });
    expect(messages({ from: "2028-01-01", to: "2029-01-01" })).toEqual({
      to: TOO_LONG,
    });
  });

  it("rejects a first day after the last one", () => {
    expect(messages({ from: "2026-10-31", to: "2026-10-01" })).toEqual({
      to: REVERSED,
    });
  });

  it("rejects one date alone", () => {
    expect(messages({ from: "2026-10-01" })).toEqual({ to: REQUIRED });
    expect(messages({ to: "2026-10-31" })).toEqual({ from: REQUIRED });
    expect(messages({ from: "2026-10-01", to: "" })).toEqual({ to: REQUIRED });
  });

  it("rejects a malformed or non-existent date", () => {
    expect(messages({ from: "01/10/2026", to: "2026-10-31" })).toEqual({
      from: INVALID_DATE,
    });
    expect(messages({ from: "2026-10-01", to: "2026-02-30" })).toEqual({
      to: INVALID_DATE,
    });
  });

  it("discards the unknown parameters", () => {
    expect(
      dashboardPeriodQuerySchema.parse({
        from: "2026-10-01",
        to: "2026-10-31",
        page: "2",
      }),
    ).toEqual({ from: "2026-10-01", to: "2026-10-31" });
  });
});

// The body of POST /api/admin/dashboard/analysis (UC27, RN035,
// docs/agendamento/rotas.md).
function analysisMessages(body: Record<string, unknown>) {
  const result = dashboardAnalysisSchema.safeParse(body);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((issue) => [issue.path.join("."), issue.message]),
  );
}

describe("dashboardAnalysisSchema", () => {
  it("accepts a period and makes the summary the default analysis", () => {
    expect(
      dashboardAnalysisSchema.parse({ from: "2026-10-01", to: "2026-10-31" }),
    ).toEqual({ from: "2026-10-01", to: "2026-10-31", detail: "summary" });
  });

  it("requires both dates of the analysis", () => {
    expect(analysisMessages({})).toEqual({ from: REQUIRED, to: REQUIRED });
    expect(analysisMessages({ from: "2026-10-01" })).toEqual({ to: REQUIRED });
    expect(analysisMessages({ from: "", to: "2026-10-31" })).toEqual({
      from: REQUIRED,
    });
  });

  it("rejects a reversed period, a period over 366 days and a bad date", () => {
    expect(analysisMessages({ from: "2026-10-31", to: "2026-10-01" })).toEqual({
      to: REVERSED,
    });
    expect(analysisMessages({ from: "2026-01-01", to: "2027-01-02" })).toEqual({
      to: TOO_LONG,
    });
    expect(analysisMessages({ from: "2026-02-30", to: "2026-03-31" })).toEqual({
      from: INVALID_DATE,
    });
  });

  it("rejects an unknown analysis type", () => {
    expect(
      analysisMessages({
        from: "2026-10-01",
        to: "2026-10-31",
        detail: "full",
      }),
    ).toEqual({ detail: UNKNOWN_DETAIL });
  });

  it("discards the unknown fields", () => {
    expect(
      dashboardAnalysisSchema.parse({
        from: "2026-10-01",
        to: "2026-10-31",
        summary: "texto",
      }),
    ).toEqual({ from: "2026-10-01", to: "2026-10-31", detail: "summary" });
  });
});
