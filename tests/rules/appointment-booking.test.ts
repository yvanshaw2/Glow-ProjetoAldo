import { describe, expect, it } from "vitest";
import { findBookingErrors } from "@/server/rules/appointment-booking";
import type { CompositionService } from "@/server/rules/pricing";
import type { BusinessDay } from "@/server/rules/scheduling";
import { COMPANY_TIME_ZONE } from "@/shared/constants/time-zone";

// The fields and messages of the refusals of a new appointment (UC11 FE03,
// RN005, RN006, RN013, RN015), as in docs/plataforma/mensagens-de-validacao.md.
// The hours are those of supabase/seed.sql: Monday to Friday from 08:00 to
// 18:00, with a break from 12:00 to 13:00; Sunday closed. Monday is 23
// November 2026, and the instants carry the offset of Maceió.

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

const NOW = new Date("2026-11-20T12:00:00-03:00");
const MAIN = { id: "main", type: "main", linkedMainServiceIds: [] } as const;
const COMPLEMENTARY = {
  id: "complementary",
  type: "complementary",
  linkedMainServiceIds: [],
} as const;
const ADDITIONAL = {
  id: "additional",
  type: "additional",
  linkedMainServiceIds: ["main"],
} as const;

function check({
  requested = ["main"],
  bookable = [MAIN, COMPLEMENTARY, ADDITIONAL],
  startsAt = "2026-11-23T09:00:00-03:00",
}: {
  requested?: string[];
  bookable?: CompositionService[];
  startsAt?: string;
} = {}) {
  return findBookingErrors({
    requestedServiceIds: requested,
    bookableServices: bookable,
    startsAt: new Date(startsAt),
    businessHours: BUSINESS_HOURS,
    timeZone: COMPANY_TIME_ZONE,
    now: NOW,
  });
}

describe("findBookingErrors", () => {
  it("returns no error for a valid order", () => {
    expect(check()).toEqual({});
    expect(check({ requested: ["main", "additional"] })).toEqual({});
  });

  it("rejects an order with only additional services", () => {
    expect(check({ requested: ["additional"] })).toEqual({
      serviceIds: "Escolha ao menos um serviço principal ou complementar.",
    });
  });

  it("rejects an additional service whose main service was not chosen", () => {
    expect(check({ requested: ["complementary", "additional"] })).toEqual({
      serviceIds: "Escolha o serviço principal a que o adicional está ligado.",
    });
  });

  it("rejects a service that cannot be booked", () => {
    expect(check({ requested: ["main", "inactive"] })).toEqual({
      serviceIds: "Escolha serviços disponíveis para agendamento.",
    });
  });

  it("rejects a closed day", () => {
    expect(check({ startsAt: "2026-11-22T09:00:00-03:00" })).toEqual({
      scheduledAt: "A empresa não atende neste dia.",
    });
  });

  it("rejects the closing time and the time before the opening", () => {
    const message = "Escolha um horário dentro do funcionamento da empresa.";
    expect(check({ startsAt: "2026-11-23T18:00:00-03:00" })).toEqual({
      scheduledAt: message,
    });
    expect(check({ startsAt: "2026-11-23T07:30:00-03:00" })).toEqual({
      scheduledAt: message,
    });
  });

  it("rejects the break but accepts the end of it", () => {
    expect(check({ startsAt: "2026-11-23T12:30:00-03:00" })).toEqual({
      scheduledAt: "Escolha um horário fora da pausa.",
    });
    expect(check({ startsAt: "2026-11-23T13:00:00-03:00" })).toEqual({});
    expect(check({ startsAt: "2026-11-23T17:30:00-03:00" })).toEqual({});
  });

  it("rejects a time out of the half hours", () => {
    expect(check({ startsAt: "2026-11-23T09:15:00-03:00" })).toEqual({
      scheduledAt: "Escolha um horário em hora cheia ou meia hora.",
    });
  });

  it("rejects an instant in the past", () => {
    expect(check({ startsAt: "2026-11-19T09:00:00-03:00" })).toEqual({
      scheduledAt: "Escolha uma data e um horário que ainda não passaram.",
    });
  });

  it("reports the services and the date together", () => {
    expect(
      check({
        requested: ["additional"],
        startsAt: "2026-11-22T09:00:00-03:00",
      }),
    ).toEqual({
      serviceIds: "Escolha ao menos um serviço principal ou complementar.",
      scheduledAt: "A empresa não atende neste dia.",
    });
  });
});
