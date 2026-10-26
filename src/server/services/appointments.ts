import "server-only";
import {
  findAdminAppointment,
  listAdminAppointments,
  type AppointmentFilters,
} from "@/server/repositories/appointments";
import { listPaymentFees } from "@/server/repositories/payment-fees";
import { listPaymentOptions } from "@/server/rules/pricing";
import type {
  AdminAppointment,
  AdminAppointmentSummary,
} from "@/shared/api/appointments";
import { APPOINTMENT_VIEW_STATUSES } from "@/shared/constants/appointment-views";
import { AppError } from "@/shared/errors/app-error";
import { startOfNextCompanyDay } from "@/shared/format/date";
import type { AdminAppointmentListQuery } from "@/shared/validation/appointments";

// Module appointments (docs/agendamento/): the appointments in the panel
// (UC10).

// RF044: "Hoje" holds today and the days before it, "Futuros" the days after
// today, in the time zone of the company; the history has every date. Each
// appointment is in one view only, by the status and by the day.
function viewFilters(
  { view, status, sort, search }: AdminAppointmentListQuery,
  now: Date,
): AppointmentFilters {
  const statuses = status ? [status] : APPOINTMENT_VIEW_STATUSES[view];
  const nextDay = startOfNextCompanyDay(now);
  return {
    statuses,
    scheduledBefore: view === "today" ? nextDay : undefined,
    scheduledFrom: view === "future" ? nextDay : undefined,
    search,
    sort,
    latestFirst: view === "history",
  };
}

export async function listAppointments(
  query: AdminAppointmentListQuery,
  now: Date,
): Promise<{ appointments: AdminAppointmentSummary[]; total: number }> {
  return listAdminAppointments(
    viewFilters(query, now),
    query.page,
    query.pageSize,
  );
}

// UC10, RN037: the copies in the appointment. RF053: the Finalizado also has
// the total of each payment method, for the conclusion.
export async function getAppointment(id: string): Promise<AdminAppointment> {
  const appointment = await findAdminAppointment(id);
  if (appointment === null) {
    throw new AppError("NOT_FOUND");
  }
  if (appointment.status !== "awaiting_payment") {
    return appointment;
  }
  return {
    ...appointment,
    paymentOptions: listPaymentOptions({
      subtotal: appointment.subtotal,
      recorded: {
        paymentMethod: appointment.paymentMethod,
        feePercent: appointment.feePercent,
        total: appointment.total,
      },
      fees: await listPaymentFees(),
    }),
  };
}
