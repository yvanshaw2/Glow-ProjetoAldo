import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  adminAppointmentListQuerySchema,
  appointmentCancelSchema,
  appointmentCompleteSchema,
  appointmentEditSchema,
  appointmentRescheduleSchema,
  appointmentInputSchema,
  appointmentPreviewSchema,
  bookingFormSchema,
  clientLookupQuerySchema,
  myAppointmentCancelSchema,
  myAppointmentInputSchema,
  myAppointmentListQuerySchema,
  portalBookingFormSchema,
  serviceLookupQuerySchema,
  vehicleLookupQuerySchema,
} from "@/shared/validation/appointments";

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

// The routes of the form of a new appointment (UC11, docs/agendamento/
// rotas.md). The messages are those of docs/plataforma/mensagens-de-validacao.md.

const CLIENT_ID = "11111111-1111-4111-8111-111111111111";
const VEHICLE_ID = "22222222-2222-4222-8222-222222222222";
const SERVICE_A = "33333333-3333-4333-8333-333333333333";
const SERVICE_B = "44444444-4444-4444-8444-444444444444";

const SEARCH_REQUIRED = "Digite o nome ou o e-mail para buscar o cliente.";
const CLIENT_CHOICE = "Escolha o cliente.";
const VEHICLE_CHOICE = "Escolha o veículo.";
const SERVICES_COUNT = "Escolha de 1 a 20 serviços, sem repetir.";
const SERVICES_REGISTERED = "Escolha serviços cadastrados.";
const PAYMENT_CHOICE = "Escolha a forma de pagamento.";
const DATE_CHOICE = "Escolha a data e o horário.";

const VALID_ORDER = {
  clientId: CLIENT_ID,
  vehicleId: VEHICLE_ID,
  serviceIds: [SERVICE_A, SERVICE_B],
  paymentMethod: "pix",
  scheduledAt: "2026-11-03T12:00:00.000Z",
};

function issues(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((issue) => [issue.path.join("."), issue.message]),
  );
}

describe("clientLookupQuerySchema", () => {
  it("requires a search for the clients", () => {
    expect(issues(clientLookupQuerySchema, {})).toEqual({
      search: SEARCH_REQUIRED,
    });
    expect(issues(clientLookupQuerySchema, { search: "   " })).toEqual({
      search: SEARCH_REQUIRED,
    });
  });

  it("normalizes the search and applies the page of 10", () => {
    expect(clientLookupQuerySchema.parse({ search: "  ana   souza " })).toEqual(
      { search: "ana souza", page: 1, pageSize: 10 },
    );
  });

  it("rejects a search over 100 characters", () => {
    expect(
      issues(clientLookupQuerySchema, { search: "a".repeat(101) }),
    ).toEqual({ search: "Use até 100 caracteres." });
  });
});

describe("vehicleLookupQuerySchema and serviceLookupQuerySchema", () => {
  it("require the id of the client and of the vehicle", () => {
    expect(issues(vehicleLookupQuerySchema, {})).toEqual({
      clientId: CLIENT_CHOICE,
    });
    expect(issues(vehicleLookupQuerySchema, { clientId: "x" })).toEqual({
      clientId: CLIENT_CHOICE,
    });
    expect(issues(serviceLookupQuerySchema, {})).toEqual({
      vehicleId: VEHICLE_CHOICE,
    });
  });

  it("apply the page of 10 to the vehicles and of 12 to the services", () => {
    expect(vehicleLookupQuerySchema.parse({ clientId: CLIENT_ID })).toEqual({
      clientId: CLIENT_ID,
      page: 1,
      pageSize: 10,
    });
    expect(serviceLookupQuerySchema.parse({ vehicleId: VEHICLE_ID })).toEqual({
      vehicleId: VEHICLE_ID,
      page: 1,
      pageSize: 12,
    });
  });
});

describe("appointmentInputSchema", () => {
  it("accepts a complete order", () => {
    expect(appointmentInputSchema.parse(VALID_ORDER)).toEqual(VALID_ORDER);
  });

  it("requires every field, each with its message", () => {
    expect(issues(appointmentInputSchema, {})).toEqual({
      clientId: CLIENT_CHOICE,
      vehicleId: VEHICLE_CHOICE,
      serviceIds: SERVICES_COUNT,
      paymentMethod: PAYMENT_CHOICE,
      scheduledAt: DATE_CHOICE,
    });
  });

  it("discards the price, the total, the status and the copies", () => {
    const parsed = appointmentInputSchema.parse({
      ...VALID_ORDER,
      subtotal: 1,
      total: 1,
      feePercent: -100,
      status: "completed",
      createdByStaffId: CLIENT_ID,
      clientName: "Outro",
      estimatedEndAt: "2026-11-03T12:00:00.000Z",
    });
    expect(parsed).toEqual(VALID_ORDER);
  });

  it("rejects an empty list, a repeated id and more than 20 services", () => {
    const check = (serviceIds: unknown) =>
      issues(appointmentInputSchema, { ...VALID_ORDER, serviceIds });
    expect(check([])).toEqual({ serviceIds: SERVICES_COUNT });
    expect(check([SERVICE_A, SERVICE_A])).toEqual({
      serviceIds: SERVICES_COUNT,
    });
    const many = Array.from(
      { length: 21 },
      (_, index) =>
        `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    );
    expect(check(many)).toEqual({ serviceIds: SERVICES_COUNT });
    expect(check(many.slice(0, 20))).toEqual({});
  });

  it("rejects a service id that is not an id", () => {
    expect(
      issues(appointmentInputSchema, { ...VALID_ORDER, serviceIds: ["x"] }),
    ).toEqual({ "serviceIds.0": SERVICES_REGISTERED });
  });

  it("rejects an unknown payment method", () => {
    expect(
      issues(appointmentInputSchema, {
        ...VALID_ORDER,
        paymentMethod: "boleto",
      }),
    ).toEqual({ paymentMethod: PAYMENT_CHOICE });
  });

  it("rejects a scheduledAt without an offset or that is not an instant", () => {
    for (const scheduledAt of ["2026-11-03T09:00:00", "2026-11-03", "amanhã"]) {
      expect(
        issues(appointmentInputSchema, { ...VALID_ORDER, scheduledAt }),
      ).toEqual({ scheduledAt: DATE_CHOICE });
    }
    expect(
      appointmentInputSchema.parse({
        ...VALID_ORDER,
        scheduledAt: "2026-11-03T09:00:00-03:00",
      }).scheduledAt,
    ).toBe("2026-11-03T09:00:00-03:00");
  });
});

describe("myAppointmentInputSchema", () => {
  const ORDER = {
    vehicleId: VALID_ORDER.vehicleId,
    serviceIds: VALID_ORDER.serviceIds,
    paymentMethod: VALID_ORDER.paymentMethod,
    scheduledAt: VALID_ORDER.scheduledAt,
  };

  it("accepts an order without the client", () => {
    expect(myAppointmentInputSchema.parse(ORDER)).toEqual(ORDER);
  });

  it("discards the client, the staff, the total and the status (RS009, RS013)", () => {
    expect(
      myAppointmentInputSchema.parse({
        ...ORDER,
        clientId: CLIENT_ID,
        staffId: CLIENT_ID,
        total: 1,
        status: "completed",
      }),
    ).toEqual(ORDER);
  });

  it("requires every field, each with its message", () => {
    expect(issues(myAppointmentInputSchema, {})).toEqual({
      vehicleId: VEHICLE_CHOICE,
      serviceIds: SERVICES_COUNT,
      paymentMethod: PAYMENT_CHOICE,
      scheduledAt: DATE_CHOICE,
    });
  });

  it("rejects a repeated service and an instant without an offset", () => {
    expect(
      issues(myAppointmentInputSchema, {
        ...ORDER,
        serviceIds: [SERVICE_A, SERVICE_A],
        scheduledAt: "2026-11-03T09:00:00",
      }),
    ).toEqual({ serviceIds: SERVICES_COUNT, scheduledAt: DATE_CHOICE });
  });
});

describe("appointmentPreviewSchema", () => {
  it("accepts a preview without the payment method and the date", () => {
    expect(
      appointmentPreviewSchema.parse({
        vehicleId: VEHICLE_ID,
        serviceIds: [SERVICE_A],
      }),
    ).toEqual({ vehicleId: VEHICLE_ID, serviceIds: [SERVICE_A] });
  });

  it("accepts the appointmentId of an edition", () => {
    const parsed = appointmentPreviewSchema.parse({
      vehicleId: VEHICLE_ID,
      serviceIds: [SERVICE_A],
      paymentMethod: "cash",
      scheduledAt: "2026-11-03T12:00:00.000Z",
      appointmentId: CLIENT_ID,
    });
    expect(parsed.appointmentId).toBe(CLIENT_ID);
  });

  it("applies the same rules of the services and of the vehicle", () => {
    expect(issues(appointmentPreviewSchema, {})).toEqual({
      vehicleId: VEHICLE_CHOICE,
      serviceIds: SERVICES_COUNT,
    });
  });
});

describe("bookingFormSchema", () => {
  const values = {
    client: { id: CLIENT_ID, name: "Ana", email: "ana@example.com" },
    vehicle: { id: VEHICLE_ID },
    serviceIds: [SERVICE_A],
    additionalIds: [],
    date: "2026-11-03",
    time: "09:00",
    paymentMethod: "pix",
  };

  it("keeps the fields of the choices it was given", () => {
    expect(bookingFormSchema.parse(values)).toEqual(values);
  });

  it("asks for each choice with the message of its step", () => {
    expect(
      issues(bookingFormSchema, {
        ...values,
        client: null,
        vehicle: null,
        serviceIds: [],
        date: null,
        time: null,
        paymentMethod: null,
      }),
    ).toEqual({
      client: "Escolha o cliente.",
      vehicle: "Escolha o veículo.",
      serviceIds: "Escolha ao menos um serviço principal ou complementar.",
      date: "Escolha a data.",
      time: "Escolha o horário.",
      paymentMethod: "Escolha a forma de pagamento.",
    });
  });
});

describe("portalBookingFormSchema", () => {
  const values = {
    vehicle: { id: VEHICLE_ID },
    serviceIds: [SERVICE_A],
    additionalIds: [],
    date: "2026-11-03",
    time: "09:00",
    paymentMethod: "pix",
  };

  it("accepts the form of the portal, which has no client", () => {
    expect(portalBookingFormSchema.parse(values)).toEqual(values);
  });

  it("asks for each choice with the message of its step", () => {
    expect(
      issues(portalBookingFormSchema, {
        vehicle: null,
        serviceIds: [],
        additionalIds: [],
        date: null,
        time: null,
        paymentMethod: null,
      }),
    ).toEqual({
      vehicle: "Escolha o veículo.",
      serviceIds: "Escolha ao menos um serviço principal ou complementar.",
      date: "Escolha a data.",
      time: "Escolha o horário.",
      paymentMethod: "Escolha a forma de pagamento.",
    });
  });

  it("does not take an additional alone as a service (RN005)", () => {
    expect(
      issues(portalBookingFormSchema, {
        ...values,
        serviceIds: [],
        additionalIds: [SERVICE_A],
      }),
    ).toEqual({
      serviceIds: "Escolha ao menos um serviço principal ou complementar.",
    });
  });
});

describe("appointmentCompleteSchema", () => {
  it("accepts a payment method", () => {
    expect(appointmentCompleteSchema.parse({ paymentMethod: "pix" })).toEqual({
      paymentMethod: "pix",
    });
  });

  it("requires the payment method, with its message", () => {
    expect(issues(appointmentCompleteSchema, {})).toEqual({
      paymentMethod: PAYMENT_CHOICE,
    });
    expect(
      issues(appointmentCompleteSchema, { paymentMethod: "boleto" }),
    ).toEqual({ paymentMethod: PAYMENT_CHOICE });
  });

  it("discards the total, the status and the completion date", () => {
    expect(
      appointmentCompleteSchema.parse({
        paymentMethod: "cash",
        total: 1,
        status: "completed",
        completedAt: "2026-11-03T12:00:00.000Z",
      }),
    ).toEqual({ paymentMethod: "cash" });
  });
});

const STALE_VERSION = "Atualize a página e tente novamente.";
const NO_FIELD = "Informe ao menos um campo para alterar.";
const UPDATED_AT = "2026-10-25T13:45:12.345678+00:00";

describe("appointmentEditSchema", () => {
  it("requires updatedAt and keeps it as text", () => {
    expect(issues(appointmentEditSchema, { paymentMethod: "pix" })).toEqual({
      updatedAt: STALE_VERSION,
    });
    expect(
      appointmentEditSchema.parse({
        paymentMethod: "pix",
        updatedAt: UPDATED_AT,
      }).updatedAt,
    ).toBe(UPDATED_AT);
  });

  it("requires at least one field to change", () => {
    expect(issues(appointmentEditSchema, { updatedAt: UPDATED_AT })).toEqual({
      "": NO_FIELD,
    });
  });

  it("accepts a single field", () => {
    expect(
      appointmentEditSchema.parse({
        scheduledAt: "2026-11-03T09:00:00-03:00",
        updatedAt: UPDATED_AT,
      }),
    ).toEqual({
      scheduledAt: "2026-11-03T09:00:00-03:00",
      updatedAt: UPDATED_AT,
    });
  });

  it("checks each field it receives, with its message", () => {
    expect(
      issues(appointmentEditSchema, {
        vehicleId: "x",
        serviceIds: [],
        paymentMethod: "boleto",
        scheduledAt: "amanhã",
        updatedAt: UPDATED_AT,
      }),
    ).toEqual({
      vehicleId: VEHICLE_CHOICE,
      serviceIds: SERVICES_COUNT,
      paymentMethod: PAYMENT_CHOICE,
      scheduledAt: DATE_CHOICE,
    });
  });

  it("rejects a repeated service and more than 20", () => {
    expect(
      issues(appointmentEditSchema, {
        serviceIds: [SERVICE_A, SERVICE_A],
        updatedAt: UPDATED_AT,
      }),
    ).toEqual({ serviceIds: SERVICES_COUNT });
  });

  it("discards the status, the totals, the client and the dates", () => {
    expect(
      appointmentEditSchema.parse({
        vehicleId: VEHICLE_ID,
        status: "completed",
        total: 1,
        subtotal: 1,
        feePercent: -100,
        clientId: CLIENT_ID,
        completedAt: "2026-11-03T12:00:00.000Z",
        updatedAt: UPDATED_AT,
      }),
    ).toEqual({ vehicleId: VEHICLE_ID, updatedAt: UPDATED_AT });
  });
});

describe("appointmentRescheduleSchema", () => {
  it("requires the payment method and the date", () => {
    expect(issues(appointmentRescheduleSchema, {})).toEqual({
      paymentMethod: PAYMENT_CHOICE,
      scheduledAt: DATE_CHOICE,
    });
  });

  it("discards the services, the vehicle and the totals", () => {
    expect(
      appointmentRescheduleSchema.parse({
        paymentMethod: "debit",
        scheduledAt: "2026-11-03T09:00:00-03:00",
        serviceIds: [SERVICE_A],
        vehicleId: VEHICLE_ID,
        total: 1,
      }),
    ).toEqual({
      paymentMethod: "debit",
      scheduledAt: "2026-11-03T09:00:00-03:00",
    });
  });
});

// The query of GET /api/me/appointments (UC07, RF028, RF029).

describe("myAppointmentListQuerySchema", () => {
  const SCOPE = "Escolha uma lista válida.";

  function scopeMessages(query: Record<string, string>) {
    const result = myAppointmentListQuerySchema.safeParse(query);
    if (result.success) return {};
    return Object.fromEntries(
      result.error.issues.map((issue) => [issue.path.join("."), issue.message]),
    );
  }

  it.each(["current", "history"])(
    "accepts the scope %s with the defaults",
    (scope) => {
      expect(myAppointmentListQuerySchema.parse({ scope })).toEqual({
        scope,
        page: 1,
        pageSize: 10,
      });
    },
  );

  it("rejects an absent scope and a scope outside the two", () => {
    expect(scopeMessages({})).toEqual({ scope: SCOPE });
    expect(scopeMessages({ scope: "future" })).toEqual({ scope: SCOPE });
    expect(scopeMessages({ scope: "" })).toEqual({ scope: SCOPE });
  });

  it("discards an unknown parameter and applies the maximum page size", () => {
    expect(
      myAppointmentListQuerySchema.parse({
        scope: "current",
        clientId: "other",
        pageSize: "500",
      }),
    ).toEqual({ scope: "current", page: 1, pageSize: 50 });
  });
});

// The body of the two cancellations (RN041, docs/agendamento/rotas.md).
describe("appointmentCancelSchema and myAppointmentCancelSchema", () => {
  const REASON = "Escolha um motivo da lista.";

  function reasonMessage(schema: z.ZodType, body: unknown) {
    const result = schema.safeParse(body);
    return result.success ? null : result.error.issues[0]?.message;
  }

  it("lets the staff choose any reason of the list", () => {
    for (const reason of [
      "client_gave_up",
      "client_unavailable",
      "weather",
      "no_show",
      "business_unavailable",
      "other",
    ]) {
      expect(appointmentCancelSchema.parse({ reason })).toEqual({ reason });
    }
  });

  it("lets the client choose only the reasons of the client", () => {
    for (const reason of [
      "client_gave_up",
      "client_unavailable",
      "weather",
      "other",
    ]) {
      expect(myAppointmentCancelSchema.parse({ reason })).toEqual({ reason });
    }
    expect(
      reasonMessage(myAppointmentCancelSchema, { reason: "no_show" }),
    ).toBe(REASON);
    expect(
      reasonMessage(myAppointmentCancelSchema, {
        reason: "business_unavailable",
      }),
    ).toBe(REASON);
  });

  it("requires a reason of the list", () => {
    for (const body of [{}, { reason: "" }, { reason: "late" }, null]) {
      expect(reasonMessage(appointmentCancelSchema, body)).toBe(REASON);
      expect(reasonMessage(myAppointmentCancelSchema, body)).toBe(REASON);
    }
  });

  it("discards the unknown fields", () => {
    expect(
      appointmentCancelSchema.parse({ reason: "other", status: "cancelled" }),
    ).toEqual({ reason: "other" });
  });
});
