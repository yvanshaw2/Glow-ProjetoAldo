import { describe, expect, it } from "vitest";
import {
  describeClientInvalidStatus,
  describeInvalidStatus,
  findEditChanges,
  findEditErrors,
} from "@/server/rules/appointment-editing";
import type { CompositionService } from "@/server/rules/pricing";
import type { BusinessDay } from "@/server/rules/scheduling";
import type { AppointmentStatus } from "@/shared/constants/appointment-statuses";
import { COMPANY_TIME_ZONE } from "@/shared/constants/time-zone";

// UC12 FE01: the refusal of a transition names the current status, with the
// names of RN017.

describe("describeInvalidStatus", () => {
  it("names the status in execution", () => {
    expect(describeInvalidStatus("in_progress")).toBe(
      "Este agendamento está Em execução. Esta ação não está disponível para esse status.",
    );
  });

  it.each([
    ["scheduled", "Agendado"],
    ["checked_in", "Em espera"],
    ["awaiting_payment", "Finalizado"],
    ["completed", "Concluído"],
    ["cancelled", "Cancelado"],
    ["rescheduled", "Reagendado"],
  ] as const)("names the status %s as %s", (status, name) => {
    expect(describeInvalidStatus(status)).toContain(`está ${name}.`);
  });
});

// UC26 FA01, RN033: what an edit changed, and the refusals with the field and
// the message of docs/plataforma/mensagens-de-validacao.md. The hours are those
// of supabase/seed.sql: Monday to Friday from 08:00 to 18:00, with a break from
// 12:00 to 13:00; Sunday and Saturday closed. Monday is 23 November 2026.

const CLOSED = {
  isOpen: false,
  opensAt: null,
  closesAt: null,
  breakStartsAt: null,
  breakEndsAt: null,
};
const WEEKDAY = {
  isOpen: true,
  opensAt: "08:00",
  closesAt: "18:00",
  breakStartsAt: "12:00",
  breakEndsAt: "13:00",
};
const BUSINESS_HOURS: BusinessDay[] = [
  { weekday: 0, ...CLOSED },
  ...[1, 2, 3, 4, 5].map((weekday) => ({ weekday, ...WEEKDAY })),
  { weekday: 6, ...CLOSED },
];
const NOW = new Date("2026-11-23T10:00:00-03:00");
const MAIN = { id: "main", type: "main", linkedMainServiceIds: [] } as const;
const ADDITIONAL = {
  id: "additional",
  type: "additional",
  linkedMainServiceIds: ["main"],
} as const;

const CURRENT = {
  vehicleId: "vehicle",
  serviceIds: ["main", "additional"],
  paymentMethod: "pix",
  scheduledAt: new Date("2026-11-23T09:00:00-03:00"),
} as const;

describe("findEditChanges", () => {
  it("sees no change in an empty request", () => {
    expect(findEditChanges(CURRENT, {})).toEqual({
      vehicle: false,
      services: false,
      payment: false,
      schedule: false,
    });
  });

  it("sees no change in the values the appointment already has", () => {
    expect(
      findEditChanges(CURRENT, {
        vehicleId: "vehicle",
        serviceIds: ["additional", "main"],
        paymentMethod: "pix",
        scheduledAt: new Date("2026-11-23T12:00:00Z"),
      }),
    ).toEqual({
      vehicle: false,
      services: false,
      payment: false,
      schedule: false,
    });
  });

  it("sees each change on its own", () => {
    expect(findEditChanges(CURRENT, { vehicleId: "other" })).toMatchObject({
      vehicle: true,
      services: false,
    });
    expect(findEditChanges(CURRENT, { serviceIds: ["main"] })).toMatchObject({
      services: true,
      vehicle: false,
    });
    expect(findEditChanges(CURRENT, { paymentMethod: "cash" })).toMatchObject({
      payment: true,
    });
    expect(
      findEditChanges(CURRENT, {
        scheduledAt: new Date("2026-11-23T09:30:00-03:00"),
      }),
    ).toMatchObject({ schedule: true });
  });
});

function errors({
  actor = "staff",
  status = "scheduled",
  request = {},
  bookable = [MAIN, ADDITIONAL],
}: {
  actor?: "client" | "staff";
  status?: AppointmentStatus;
  request?: Parameters<typeof findEditChanges>[1];
  bookable?: CompositionService[];
} = {}) {
  return findEditErrors({
    actor,
    status,
    current: CURRENT,
    request,
    bookableServices: bookable,
    now: NOW,
    businessHours: BUSINESS_HOURS,
    timeZone: COMPANY_TIME_ZONE,
  });
}

const at = (iso: string) => ({ scheduledAt: new Date(iso) });

describe("findEditErrors", () => {
  it("accepts an edit that changes nothing", () => {
    expect(errors()).toEqual({});
  });

  it("does not check a kept date, even if it has passed", () => {
    expect(
      findEditErrors({
        actor: "staff",
        status: "scheduled",
        current: {
          ...CURRENT,
          scheduledAt: new Date("2026-11-20T09:00:00-03:00"),
        },
        request: { scheduledAt: new Date("2026-11-20T09:00:00-03:00") },
        bookableServices: [MAIN, ADDITIONAL],
        now: NOW,
        businessHours: BUSINESS_HOURS,
        timeZone: COMPANY_TIME_ZONE,
      }),
    ).toEqual({});
  });

  it("refuses a date in the past in a scheduled appointment", () => {
    expect(errors({ request: at("2026-11-23T08:30:00-03:00") })).toEqual({
      scheduledAt: "Escolha uma data e um horário que ainda não passaram.",
    });
  });

  it("lets the staff bring a scheduled appointment forward to the future", () => {
    expect(errors({ request: at("2026-11-23T10:30:00-03:00") })).toEqual({});
    expect(errors({ request: at("2026-11-24T08:00:00-03:00") })).toEqual({});
  });

  it("refuses a date after the moment of the change once the vehicle arrived", () => {
    expect(
      errors({
        status: "in_progress",
        request: at("2026-11-23T13:00:00-03:00"),
      }),
    ).toEqual({
      scheduledAt:
        "Escolha uma data e um horário que não sejam posteriores ao momento da alteração.",
    });
  });

  it("accepts a date before the moment of the change once the vehicle arrived", () => {
    expect(
      errors({
        status: "in_progress",
        request: at("2026-11-23T08:00:00-03:00"),
      }),
    ).toEqual({});
  });

  it("checks only the business hours in a cancelled appointment", () => {
    expect(
      errors({
        status: "cancelled",
        request: at("2026-12-07T09:00:00-03:00"),
      }),
    ).toEqual({});
    expect(
      errors({
        status: "cancelled",
        request: at("2026-11-22T09:00:00-03:00"),
      }),
    ).toEqual({ scheduledAt: "A empresa não atende neste dia." });
  });

  it.each([
    ["2026-11-22T09:00:00-03:00", "A empresa não atende neste dia."],
    [
      "2026-11-24T07:30:00-03:00",
      "Escolha um horário dentro do funcionamento da empresa.",
    ],
    ["2026-11-24T12:00:00-03:00", "Escolha um horário fora da pausa."],
    [
      "2026-11-24T09:15:00-03:00",
      "Escolha um horário em hora cheia ou meia hora.",
    ],
  ])("maps the availability error of %s", (iso, message) => {
    expect(errors({ request: at(iso) })).toEqual({ scheduledAt: message });
  });

  it("refuses a change of services that leaves only an additional one", () => {
    expect(errors({ request: { serviceIds: ["additional"] } })).toEqual({
      serviceIds: "Escolha ao menos um serviço principal ou complementar.",
    });
  });

  it("refuses a service that cannot be booked when the services change", () => {
    expect(errors({ request: { serviceIds: ["main", "inactive"] } })).toEqual({
      serviceIds: "Escolha serviços disponíveis para agendamento.",
    });
  });

  it("checks the services again when only the vehicle changes", () => {
    expect(
      errors({ request: { vehicleId: "other" }, bookable: [MAIN] }),
    ).toEqual({
      serviceIds: "Escolha serviços disponíveis para agendamento.",
    });
  });

  it("keeps a service that is no longer offered when the services and the vehicle are kept", () => {
    expect(
      errors({
        request: { paymentMethod: "cash", ...at("2026-11-24T09:00:00-03:00") },
        bookable: [],
      }),
    ).toEqual({});
  });
});

// UC26 FE02, RN033: the client only postpones the date, to a future moment
// after the one scheduled; the Monday of the fixtures is 23 November 2026 and
// the appointment is at 09:00, before NOW (10:00).
describe("findEditErrors by the client", () => {
  it("refuses a date before the one scheduled", () => {
    expect(
      errors({ actor: "client", request: at("2026-11-23T08:30:00-03:00") }),
    ).toEqual({
      scheduledAt: "Escolha uma data e um horário posteriores aos marcados.",
    });
  });

  it("refuses a date after the one scheduled that has already passed", () => {
    expect(
      errors({ actor: "client", request: at("2026-11-23T09:30:00-03:00") }),
    ).toEqual({
      scheduledAt: "Escolha uma data e um horário que ainda não passaram.",
    });
  });

  it("accepts a future date after the one scheduled", () => {
    expect(
      errors({ actor: "client", request: at("2026-11-23T10:30:00-03:00") }),
    ).toEqual({});
    expect(
      errors({ actor: "client", request: at("2026-11-24T08:00:00-03:00") }),
    ).toEqual({});
  });

  it("does not check a kept date, even if it has passed", () => {
    expect(
      errors({
        actor: "client",
        request: { paymentMethod: "cash", ...at("2026-11-23T09:00:00-03:00") },
      }),
    ).toEqual({});
  });

  it("still checks the business hours of the new date", () => {
    expect(
      errors({ actor: "client", request: at("2026-11-28T09:00:00-03:00") }),
    ).toEqual({ scheduledAt: "A empresa não atende neste dia." });
  });
});

// UC07 FE02, UC26 FE01: the refusal of the client names the status and says
// what to do.
describe("describeClientInvalidStatus", () => {
  it("tells that the portal cannot cancel it", () => {
    expect(describeClientInvalidStatus("cancel", "checked_in")).toBe(
      "Este agendamento está Em espera e não pode ser cancelado pelo portal. Para mudar algo, fale com a empresa.",
    );
  });

  it("tells that it can no longer be changed here", () => {
    expect(describeClientInvalidStatus("edit", "in_progress")).toBe(
      "Este agendamento está Em execução e não pode mais ser alterado por aqui. Para mudar algo, fale com a empresa.",
    );
  });

  it("tells that only a completed service is rescheduled", () => {
    expect(describeClientInvalidStatus("reschedule", "scheduled")).toBe(
      "Este agendamento está Agendado. Só um serviço concluído pode ser reagendado.",
    );
  });
});
