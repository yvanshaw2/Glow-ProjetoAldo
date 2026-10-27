import "server-only";
import {
  findCompositionError,
  type CompositionError,
  type CompositionService,
} from "@/server/rules/pricing";
import {
  findStartError,
  type BusinessDay,
  type StartError,
} from "@/server/rules/scheduling";

// The refusals of a new appointment (UC11 FE03; RN005, RN006, RN013, RN015),
// as the field of the body and the message of
// docs/plataforma/mensagens-de-validacao.md. The checks are those of the pure
// functions of pricing.ts and scheduling.ts.

export type BookingFields = Partial<
  Record<"serviceIds" | "scheduledAt", string>
>;

const UNAVAILABLE_SERVICE_MESSAGE =
  "Escolha serviços disponíveis para agendamento.";

const COMPOSITION_MESSAGES: Record<CompositionError, string> = {
  NO_MAIN_OR_COMPLEMENTARY:
    "Escolha ao menos um serviço principal ou complementar.",
  ADDITIONAL_WITHOUT_MAIN:
    "Escolha o serviço principal a que o adicional está ligado.",
};

const START_MESSAGES: Record<StartError, string> = {
  CLOSED_DAY: "A empresa não atende neste dia.",
  OUTSIDE_BUSINESS_HOURS:
    "Escolha um horário dentro do funcionamento da empresa.",
  DURING_BREAK: "Escolha um horário fora da pausa.",
  OFF_TIME_SLOT: "Escolha um horário em hora cheia ou meia hora.",
  IN_THE_PAST: "Escolha uma data e um horário que ainda não passaram.",
};

// `bookableServices` are the services of the order that can be booked
// (RN008, RN030, RN031), found by the service; a requested one that is not
// among them is refused.
export function findBookingErrors({
  requestedServiceIds,
  bookableServices,
  startsAt,
  businessHours,
  timeZone,
  now,
}: {
  requestedServiceIds: readonly string[];
  bookableServices: readonly CompositionService[];
  startsAt: Date;
  businessHours: readonly BusinessDay[];
  timeZone: string;
  now: Date;
}): BookingFields {
  const fields: BookingFields = {};
  const bookableIds = new Set(bookableServices.map(({ id }) => id));
  const chosen = bookableServices.filter(({ id }) =>
    requestedServiceIds.includes(id),
  );
  if (requestedServiceIds.some((id) => !bookableIds.has(id))) {
    fields.serviceIds = UNAVAILABLE_SERVICE_MESSAGE;
  } else {
    const compositionError = findCompositionError(chosen);
    if (compositionError) {
      fields.serviceIds = COMPOSITION_MESSAGES[compositionError];
    }
  }
  const startError = findStartError({
    startsAt,
    businessHours,
    timeZone,
    now,
  });
  if (startError) {
    fields.scheduledAt = START_MESSAGES[startError];
  }
  return fields;
}
