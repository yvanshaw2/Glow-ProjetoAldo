import { describe, expect, it } from "vitest";
import { adminAppointmentListQuerySchema } from "@/shared/validation/appointments";

// The query of GET /api/admin/appointments (UC10, RF044 to RF047, docs/
// agendamento/rotas.md).

// Messages from docs/plataforma/mensagens-de-validacao.md.
const VIEW = "Escolha uma visão válida.";
const STATUS = "Escolha um status desta visão.";
const SORT = "Escolha uma ordenação válida.";
const PAGINATION = "Informe um número inteiro a partir de 1.";
const SEARCH_LENGTH = "Use até 100 caracteres.";

function messages(query: Record<string, string>) {
  const result = adminAppointmentListQuerySchema.safeParse(query);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((issue) => [issue.path.join("."), issue.message]),
  );
}

describe("adminAppointmentListQuerySchema", () => {
  it("accepts a view and applies the defaults", () => {
    expect(adminAppointmentListQuerySchema.parse({ view: "today" })).toEqual({
      view: "today",
      sort: "time",
      page: 1,
      pageSize: 20,
    });
  });

  it("rejects an absent view and a view outside the three", () => {
    expect(messages({})).toEqual({ view: VIEW });
    expect(messages({ view: "week" })).toEqual({ view: VIEW });
    expect(messages({ view: "" })).toEqual({ view: VIEW });
  });

  it("accepts a status of the view", () => {
    expect(
      adminAppointmentListQuerySchema.parse({
        view: "today",
        status: "in_progress",
      }).status,
    ).toBe("in_progress");
    expect(
      adminAppointmentListQuerySchema.parse({
        view: "history",
        status: "cancelled",
      }).status,
    ).toBe("cancelled");
  });

  it("rejects a status of another view", () => {
    expect(messages({ view: "today", status: "completed" })).toEqual({
      status: STATUS,
    });
    expect(messages({ view: "future", status: "cancelled" })).toEqual({
      status: STATUS,
    });
    expect(messages({ view: "history", status: "scheduled" })).toEqual({
      status: STATUS,
    });
    expect(messages({ view: "today", status: "unknown" })).toEqual({
      status: STATUS,
    });
  });

  it("treats an empty status and an empty search as no filter", () => {
    const query = adminAppointmentListQuerySchema.parse({
      view: "today",
      status: "",
      search: "   ",
    });
    expect(query.status).toBeUndefined();
    expect(query.search).toBeUndefined();
  });

  it("accepts the two sorts and rejects another", () => {
    expect(
      adminAppointmentListQuerySchema.parse({ view: "future", sort: "status" })
        .sort,
    ).toBe("status");
    expect(
      adminAppointmentListQuerySchema.parse({ view: "future", sort: "time" })
        .sort,
    ).toBe("time");
    expect(messages({ view: "future", sort: "client" })).toEqual({
      sort: SORT,
    });
  });

  it("keeps the search normalized and rejects one over 100 characters", () => {
    expect(
      adminAppointmentListQuerySchema.parse({
        view: "today",
        search: "  ana   souza ",
      }).search,
    ).toBe("ana souza");
    expect(messages({ view: "today", search: "a".repeat(101) })).toEqual({
      search: SEARCH_LENGTH,
    });
  });

  it("caps the page size at 50 and rejects a page below 1", () => {
    expect(
      adminAppointmentListQuerySchema.parse({ view: "today", pageSize: "100" })
        .pageSize,
    ).toBe(50);
    expect(messages({ view: "today", page: "0" })).toEqual({
      page: PAGINATION,
    });
  });

  it("discards the unknown parameters", () => {
    expect(
      adminAppointmentListQuerySchema.parse({ view: "today", clientId: "x" }),
    ).not.toHaveProperty("clientId");
  });
});
