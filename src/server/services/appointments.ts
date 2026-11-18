import "server-only";
import {
  changeAppointmentStatus,
  findAdminAppointment,
  insertAppointment,
  listAdminAppointments,
  type AppointmentFilters,
  type StatusChange,
} from "@/server/repositories/appointments";
import {
  findBookableOrderServices,
  listBookableServices,
  type BookableOrderService,
} from "@/server/repositories/bookable-services";
import { listBusinessHours } from "@/server/repositories/business-hours";
import { listClientOptions } from "@/server/repositories/clients";
import { listPaymentFees } from "@/server/repositories/payment-fees";
import { findVehicle, isVehicleOfClient } from "@/server/repositories/vehicles";
import { findBookingErrors } from "@/server/rules/appointment-booking";
import { describeInvalidStatus } from "@/server/rules/appointment-editing";
import { listPaymentOptions, priceServices } from "@/server/rules/pricing";
import {
  calculateEstimatedDuration,
  calculateEstimatedEnd,
} from "@/server/rules/scheduling";
import {
  findNextStatus,
  type AppointmentAction,
} from "@/server/rules/status-transitions";
import { getClient } from "@/server/services/clients";
import { listClientVehicles } from "@/server/services/vehicles";
import type {
  AdminAppointment,
  AdminAppointmentSummary,
  AdminClientOption,
  AppointmentPreview,
  BookableService,
} from "@/shared/api/appointments";
import type { ClientVehicle } from "@/shared/api/vehicles";
import { APPOINTMENT_VIEW_STATUSES } from "@/shared/constants/appointment-views";
import type { AppointmentStatus } from "@/shared/constants/appointment-statuses";
import type { PaymentMethod } from "@/shared/constants/payment-methods";
import { COMPANY_TIME_ZONE } from "@/shared/constants/time-zone";
import type { VehicleSize } from "@/shared/constants/vehicle-sizes";
import { AppError } from "@/shared/errors/app-error";
import { startOfNextCompanyDay } from "@/shared/format/date";
import type {
  AdminAppointmentListQuery,
  AppointmentInput,
  AppointmentPreviewInput,
} from "@/shared/validation/appointments";

// Module appointments (docs/agendamento/): the appointments in the panel
// (UC10, UC11).

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

const NOT_YOUR_VEHICLE_MESSAGE = "Escolha um veículo deste cliente.";

// UC11 step 2, RN030: the clients not deleted.
export async function lookUpClients(
  search: string,
  page: number,
  pageSize: number,
): Promise<{ clients: AdminClientOption[]; total: number }> {
  return listClientOptions(search, page, pageSize);
}

// UC11 step 3, RN003: the vehicles of the client, as in Clientes.
export function lookUpVehicles(
  clientId: string,
  page: number,
  pageSize: number,
): Promise<{ vehicles: ClientVehicle[]; total: number }> {
  return listClientVehicles(clientId, page, pageSize);
}

// UC11 step 4, RN009: the prices are those of the size of the vehicle.
export async function lookUpServices(
  vehicleId: string,
  page: number,
  pageSize: number,
): Promise<{ services: BookableService[]; total: number }> {
  const vehicle = await findVehicle(vehicleId);
  if (vehicle === null) {
    throw new AppError("NOT_FOUND");
  }
  return listBookableServices(vehicle.size, page, pageSize);
}

// RN012, read on every call: the percent changes in the panel at any time.
async function findFeePercent(paymentMethod: PaymentMethod): Promise<number> {
  const fee = (await listPaymentFees()).find(
    (item) => item.paymentMethod === paymentMethod,
  );
  if (!fee) {
    throw new Error(`No percent for the payment method ${paymentMethod}.`);
  }
  return fee.percent;
}

// The services that can be booked, in the order they were asked for.
async function findOrderServices(
  serviceIds: string[],
): Promise<BookableOrderService[]> {
  const services = await findBookableOrderServices(serviceIds);
  return serviceIds
    .map((id) => services.find((service) => service.id === id))
    .filter((service) => service !== undefined);
}

// RN009 to RN012, RN014: the values of the order by the current catalog
// (decision 0021).
function workOutOrder(
  services: BookableOrderService[],
  vehicleSize: VehicleSize,
  feePercent: number,
) {
  const price = priceServices({
    services: services.map(({ id, pricing }) => ({ id, ...pricing })),
    vehicleSize,
    feePercent,
  });
  const priceOf = (serviceId: string) =>
    price.items.find((item) => item.serviceId === serviceId)?.price ?? 0;
  return {
    subtotal: price.subtotal,
    total: price.total,
    priceOf,
    durationMinutes: calculateEstimatedDuration(services),
  };
}

// UC11 step 6, RN010, RN014, RN034: only works out; the date, the time and
// the composition are checked when the appointment is registered
// (docs/agendamento/rotas.md).
export async function previewAppointment({
  vehicleId,
  serviceIds,
  paymentMethod,
  scheduledAt,
}: AppointmentPreviewInput): Promise<AppointmentPreview> {
  const vehicle = await findVehicle(vehicleId);
  if (vehicle === null) {
    throw new AppError("NOT_FOUND");
  }
  const services = await findOrderServices(serviceIds);
  const feePercent = paymentMethod ? await findFeePercent(paymentMethod) : null;
  const order = workOutOrder(services, vehicle.size, feePercent ?? 0);
  const estimatedEnd = scheduledAt
    ? calculateEstimatedEnd({
        startsAt: new Date(scheduledAt),
        durationMinutes: order.durationMinutes,
        businessHours: await listBusinessHours(),
        timeZone: COMPANY_TIME_ZONE,
      })
    : null;
  return {
    services: services.map(({ id, name, type, durationMinutes }) => ({
      id,
      name,
      type,
      price: order.priceOf(id),
      durationMinutes,
    })),
    subtotal: order.subtotal,
    feePercent,
    total: order.total,
    estimatedDurationMinutes: order.durationMinutes,
    estimatedEndAt: estimatedEnd?.toISOString() ?? null,
  };
}

// UC11 steps 7 and 8: the staff registers the appointment of a client. The
// client and the vehicle are checked first (RN003, RN030), then the services
// and the date (RN005, RN006, RN013, RN015), and the values are worked out
// here, never read from the request (RS013). The status is scheduled.
export async function createAppointment(
  input: AppointmentInput,
  staffId: string,
  now: Date,
): Promise<AdminAppointment> {
  await getClient(input.clientId);
  const vehicle = await findVehicle(input.vehicleId);
  if (
    vehicle === null ||
    !(await isVehicleOfClient(input.clientId, input.vehicleId))
  ) {
    throw new AppError("VALIDATION_ERROR", {
      fields: { vehicleId: NOT_YOUR_VEHICLE_MESSAGE },
    });
  }
  const services = await findOrderServices(input.serviceIds);
  const businessHours = await listBusinessHours();
  const startsAt = new Date(input.scheduledAt);
  const fields = findBookingErrors({
    requestedServiceIds: input.serviceIds,
    bookableServices: services,
    startsAt,
    businessHours,
    timeZone: COMPANY_TIME_ZONE,
    now,
  });
  if (Object.keys(fields).length > 0) {
    throw new AppError("VALIDATION_ERROR", { fields });
  }
  const feePercent = await findFeePercent(input.paymentMethod);
  const order = workOutOrder(services, vehicle.size, feePercent);
  const estimatedEnd = calculateEstimatedEnd({
    startsAt,
    durationMinutes: order.durationMinutes,
    businessHours,
    timeZone: COMPANY_TIME_ZONE,
  });
  if (estimatedEnd === null) {
    throw new Error("The business hours have no working time.");
  }
  const id = await insertAppointment({
    clientId: input.clientId,
    vehicleId: input.vehicleId,
    staffId,
    scheduledAt: startsAt.toISOString(),
    paymentMethod: input.paymentMethod,
    feePercent,
    subtotal: order.subtotal,
    total: order.total,
    estimatedDurationMinutes: order.durationMinutes,
    estimatedEndAt: estimatedEnd.toISOString(),
    items: services.map(({ id: serviceId, durationMinutes }) => ({
      serviceId,
      price: order.priceOf(serviceId),
      durationMinutes,
    })),
  });
  // The client or the link was removed since the checks above.
  if (id === null) {
    throw new AppError("NOT_FOUND");
  }
  return getAppointment(id);
}

// UC12 FE01: the transition is refused with the current status.
function refuseStatus(status: AppointmentStatus): never {
  throw new AppError("INVALID_STATUS", {
    message: describeInvalidStatus(status),
  });
}

// RN017 to RN019: the staff moves the appointment along the table of
// status-transitions.ts. The write holds only if the status is still the one
// read (changeAppointmentStatus); otherwise the new status is read for the
// message.
async function changeStatus(
  id: string,
  action: AppointmentAction,
  buildChange: (
    appointment: AdminAppointment,
    status: AppointmentStatus,
  ) => StatusChange,
): Promise<AdminAppointment> {
  const appointment = await getAppointment(id);
  const nextStatus = findNextStatus({
    action,
    status: appointment.status,
    actor: "staff",
  });
  if (nextStatus === null) {
    refuseStatus(appointment.status);
  }
  const isChanged = await changeAppointmentStatus(
    id,
    appointment.status,
    buildChange(appointment, nextStatus),
  );
  if (!isChanged) {
    refuseStatus((await getAppointment(id)).status);
  }
  return getAppointment(id);
}

// UC12 steps 2 to 5.
export function advanceAppointment(id: string): Promise<AdminAppointment> {
  return changeStatus(id, "advance", (_, status) => ({ status }));
}

// UC12 FA02, RN019.
export function cancelAppointment(
  id: string,
  now: Date,
): Promise<AdminAppointment> {
  return changeStatus(id, "cancel", (_, status) => ({
    status,
    cancelledAt: now.toISOString(),
  }));
}

// UC12 FA01, RN018: the method of the appointment keeps the percent and the
// total recorded in it; another one takes the percent of today over the
// subtotal (listPaymentOptions, the totals the dialog showed).
export function completeAppointment(
  id: string,
  paymentMethod: PaymentMethod,
  now: Date,
): Promise<AdminAppointment> {
  return changeStatus(id, "complete", (appointment, status) => {
    const option = appointment.paymentOptions?.find(
      (item) => item.paymentMethod === paymentMethod,
    );
    if (!option) {
      throw new Error("The appointment has no payment options.");
    }
    return {
      status,
      payment: {
        method: paymentMethod,
        feePercent: option.feePercent,
        total: option.total,
      },
      completedAt: now.toISOString(),
    };
  });
}
