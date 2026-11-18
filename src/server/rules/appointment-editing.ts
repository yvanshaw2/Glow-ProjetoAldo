import "server-only";
import { APPOINTMENT_STATUS_LABELS } from "@/shared/constants/appointment-statuses";
import type { AppointmentStatus } from "@/shared/constants/appointment-statuses";

// The refusals and the messages of the actions on an appointment of the panel
// (UC12, UC26; docs/agendamento/rotas.md). The checks themselves are those of
// status-transitions.ts and editing.ts.

// UC12 FE01: a refused transition names the current status.
export function describeInvalidStatus(status: AppointmentStatus): string {
  return `Este agendamento está ${APPOINTMENT_STATUS_LABELS[status]}. Esta ação não está disponível para esse status.`;
}
