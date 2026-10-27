import { describe, expect, it } from "vitest";
import { dashboardPeriodQuerySchema } from "@/shared/validation/dashboard";

// The query of GET /api/admin/dashboard (UC09, RN035, docs/agendamento/
// rotas.md).

// Messages from docs/plataforma/mensagens-de-validacao.md.
const REQUIRED = "Preencha este campo.";
const INVALID_DATE = "Informe uma data válida.";
const REVERSED = "A data final não pode ser anterior à inicial.";
const TOO_LONG = "O período não pode passar de 12 meses.";

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
