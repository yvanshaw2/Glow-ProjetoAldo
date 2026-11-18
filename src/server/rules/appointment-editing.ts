import "server-only";
import {
  COMPOSITION_MESSAGES,
  START_MESSAGES,
  UNAVAILABLE_SERVICE_MESSAGE,
} from "@/server/rules/appointment-booking";
import {
  findScheduleChangeError,
  type ScheduleChangeError,
} from "@/server/rules/editing";
import {
  findCompositionError,
  type CompositionService,
} from "@/server/rules/pricing";
import type { BusinessDay } from "@/server/rules/scheduling";
import type { AppointmentActor } from "@/server/rules/status-transitions";
import {
  APPOINTMENT_STATUS_LABELS,
  type AppointmentStatus,
} from "@/shared/constants/appointment-statuses";
import type { PaymentMethod } from "@/shared/constants/payment-methods";

// The refusals and the messages of the actions on an appointment of the panel
// (UC12, UC26; docs/agendamento/rotas.md). The checks themselves are those of
// status-transitions.ts and editing.ts.

// UC12 FE01: a refused transition names the current status.
export function describeInvalidStatus(status: AppointmentStatus): string {
  return `Este agendamento está ${APPOINTMENT_STATUS_LABELS[status]}. Esta ação não está disponível para esse status.`;
}

// UC07 FE02, UC26 FE01: the refusal for the client names the status and sends
// it to the company.
export function describeClientInvalidStatus(
  action: "cancel" | "edit" | "reschedule",
  status: AppointmentStatus,
): string {
  const name = APPOINTMENT_STATUS_LABELS[status];
  const messages = {
    cancel: `Este agendamento está ${name} e não pode ser cancelado pelo portal. Para mudar algo, fale com a empresa.`,
    edit: `Este agendamento está ${name} e não pode mais ser alterado por aqui. Para mudar algo, fale com a empresa.`,
    reschedule: `Este agendamento está ${name}. Só um serviço concluído pode ser reagendado.`,
  };
  return messages[action];
}

// UC26 FA01, RN033: what an edit asks to change, compared with what the
// appointment has. The request has only the fields that came; the one that
// came with the value the appointment already has is no change. The order of
// the services and the format of the instant do not count.
export type EditCurrent = {
  vehicleId: string;
  serviceIds: readonly string[];
  paymentMethod: PaymentMethod;
  scheduledAt: Date;
};

export type EditRequest = {
  vehicleId?: string;
  serviceIds?: readonly string[];
  paymentMethod?: PaymentMethod;
  scheduledAt?: Date;
};

export type EditChanges = {
  vehicle: boolean;
  services: boolean;
  payment: boolean;
  schedule: boolean;
};

export function findEditChanges(
  current: EditCurrent,
  request: EditRequest,
): EditChanges {
  const currentIds = new Set(current.serviceIds);
  return {
    vehicle:
      request.vehicleId !== undefined &&
      request.vehicleId !== current.vehicleId,
    services:
      request.serviceIds !== undefined &&
      (request.serviceIds.length !== currentIds.size ||
        request.serviceIds.some((id) => !currentIds.has(id))),
    payment:
      request.paymentMethod !== undefined &&
      request.paymentMethod !== current.paymentMethod,
    schedule:
      request.scheduledAt !== undefined &&
      request.scheduledAt.getTime() !== current.scheduledAt.getTime(),
  };
}

export type EditFields = Partial<Record<"serviceIds" | "scheduledAt", string>>;

const SCHEDULE_MESSAGES: Record<ScheduleChangeError, string> = {
  ...START_MESSAGES,
  NOT_AFTER_SCHEDULED:
    "Escolha uma data e um horário posteriores aos marcados.",
  AFTER_NOW:
    "Escolha uma data e um horário que não sejam posteriores ao momento da alteração.",
};

// RN033: the refusals of an edit by the client or the staff, as the field of the body and
// its message. A change of the vehicle or of the services prices every service
// again by the current catalog, so they all must be bookable and make a valid
// order (RN005, RN006, RN008); otherwise the services are kept as they are,
// even if the catalog no longer offers them. The date and the time are checked
// only when they change (findScheduleChangeError).
export function findEditErrors({
  actor,
  status,
  current,
  request,
  bookableServices,
  now,
  businessHours,
  timeZone,
}: {
  actor: AppointmentActor;
  status: AppointmentStatus;
  current: EditCurrent;
  request: EditRequest;
  // The services of the order that can be booked, as the service found them.
  bookableServices: readonly CompositionService[];
  now: Date;
  businessHours: readonly BusinessDay[];
  timeZone: string;
}): EditFields {
  const changes = findEditChanges(current, request);
  const fields: EditFields = {};
  if (changes.vehicle || changes.services) {
    const serviceIds = request.serviceIds ?? current.serviceIds;
    const bookableIds = new Set(bookableServices.map(({ id }) => id));
    if (serviceIds.some((id) => !bookableIds.has(id))) {
      fields.serviceIds = UNAVAILABLE_SERVICE_MESSAGE;
    } else {
      const compositionError = findCompositionError(
        bookableServices.filter(({ id }) => serviceIds.includes(id)),
      );
      if (compositionError) {
        fields.serviceIds = COMPOSITION_MESSAGES[compositionError];
      }
    }
  }
  if (changes.schedule && request.scheduledAt) {
    const scheduleError = findScheduleChangeError({
      actor,
      status,
      scheduledAt: current.scheduledAt,
      newScheduledAt: request.scheduledAt,
      now,
      businessHours,
      timeZone,
    });
    if (scheduleError) {
      fields.scheduledAt = SCHEDULE_MESSAGES[scheduleError];
    }
  }
  return fields;
}
