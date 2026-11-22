import "server-only";
import {
  changeAppointmentStatus,
  findAdminAppointment,
  insertAppointment,
  insertRescheduledAppointment,
  listAdminAppointments,
  listClientAppointments,
  type AppointmentFilters,
  type NewAppointment,
  type StatusChange,
  updateAppointment,
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
import {
  describeClientInvalidStatus,
  describeInvalidStatus,
  findEditChanges,
  findEditErrors,
} from "@/server/rules/appointment-editing";
import {
  calculateTotal,
  listPaymentOptions,
  priceServices,
} from "@/server/rules/pricing";
import {
  calculateEstimatedDuration,
  calculateEstimatedEnd,
} from "@/server/rules/scheduling";
import { insertReview } from "@/server/repositories/appointment-reviews";
import { findReviewRefusal } from "@/server/rules/appointment-review";
import { canEditAppointment } from "@/server/rules/editing";
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
  ClientAppointment,
  ClientAppointmentSummary,
} from "@/shared/api/appointments";
import type { ClientVehicle } from "@/shared/api/vehicles";
import {
  APPOINTMENT_SCOPE_STATUSES,
  APPOINTMENT_VIEW_STATUSES,
} from "@/shared/constants/appointment-views";
import type { AppointmentStatus } from "@/shared/constants/appointment-statuses";
import type { PaymentMethod } from "@/shared/constants/payment-methods";
import { COMPANY_TIME_ZONE } from "@/shared/constants/time-zone";
import type { VehicleSize } from "@/shared/constants/vehicle-sizes";
import { AppError } from "@/shared/errors/app-error";
import {
  formatCalendarDate,
  startOfNextCompanyDay,
} from "@/shared/format/date";
import type {
  AdminAppointmentListQuery,
  AppointmentCancelInput,
  AppointmentEditInput,
  AppointmentInput,
  AppointmentPreviewInput,
  AppointmentRescheduleInput,
  AppointmentReviewInput,
  MyAppointmentInput,
  MyAppointmentListQuery,
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

// The order of a vehicle already checked as the client's (RN003): the
// services and the date are checked (RN005, RN006, RN013, RN015), the values
// are worked out here, never read from the request (RS013), and the
// appointment is written scheduled. staffId is null when the client booked.
async function registerOrder(
  input: AppointmentInput,
  vehicleSize: VehicleSize,
  staffId: string | null,
  now: Date,
): Promise<string> {
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
  const order = workOutOrder(services, vehicleSize, feePercent);
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
  // The client or the link was removed since the checks.
  if (id === null) {
    throw new AppError("NOT_FOUND");
  }
  return id;
}

// UC11 steps 7 and 8: the staff registers the appointment of a client. The
// client and the vehicle are checked first (RN003, RN030).
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
  return getAppointment(await registerOrder(input, vehicle.size, staffId, now));
}

// RS009: a vehicle that is not in the account of the client is answered as
// one that does not exist, so nothing is told about the vehicles of others.
async function findMyVehicle(clientId: string, vehicleId: string) {
  const vehicle = await findVehicle(vehicleId);
  if (vehicle === null || !(await isVehicleOfClient(clientId, vehicleId))) {
    throw new AppError("NOT_FOUND");
  }
  return vehicle;
}

// UC06 step 4, RN009: the services with the prices of the size of the
// client's vehicle.
export async function lookUpMyServices(
  clientId: string,
  vehicleId: string,
  page: number,
  pageSize: number,
): Promise<{ services: BookableService[]; total: number }> {
  const vehicle = await findMyVehicle(clientId, vehicleId);
  return listBookableServices(vehicle.size, page, pageSize);
}

// UC06 steps 6, 8 and 11: only works out, for the client's vehicle.
export async function previewMyAppointment(
  clientId: string,
  input: AppointmentPreviewInput,
): Promise<AppointmentPreview> {
  await findMyVehicle(clientId, input.vehicleId);
  return previewAppointment(input);
}

// UC06 steps 12 and 13: the client of the session books for a vehicle of the
// account (RN003, RS009); no staff member is recorded. The answer has the
// shape of the detail of the client, without the panel's fields.
export async function createMyAppointment(
  clientId: string,
  input: MyAppointmentInput,
  now: Date,
): Promise<ClientAppointment> {
  const vehicle = await findMyVehicle(clientId, input.vehicleId);
  const id = await registerOrder(
    { ...input, clientId },
    vehicle.size,
    null,
    now,
  );
  return toClientAppointment(await getAppointment(id));
}

// The detail of the client: the one of the panel without the client and the
// payment options, and whether it can be rated today (RN043).
function toClientAppointment(
  created: AdminAppointment,
  now: Date = new Date(),
): ClientAppointment {
  return {
    id: created.id,
    status: created.status,
    scheduledAt: created.scheduledAt,
    estimatedEndAt: created.estimatedEndAt,
    estimatedDurationMinutes: created.estimatedDurationMinutes,
    paymentMethod: created.paymentMethod,
    subtotal: created.subtotal,
    feePercent: created.feePercent,
    total: created.total,
    vehicle: created.vehicle,
    services: created.services,
    cancellationReason: created.cancellationReason,
    completedAt: created.completedAt,
    rating: created.rating,
    canReview:
      findReviewRefusal(created, formatCalendarDate(now.toISOString())) ===
      null,
    updatedAt: created.updatedAt,
  };
}

// Who asks: the staff of the panel, with the permission checked by the route,
// or the client of the session, who only reaches what is theirs (RS009).
type Caller = { actor: "staff" } | { actor: "client"; clientId: string };

const STAFF: Caller = { actor: "staff" };

// RS009: the appointment of another client is answered as one that does not
// exist.
async function getAppointmentOf(
  id: string,
  caller: Caller,
): Promise<AdminAppointment> {
  const appointment = await getAppointment(id);
  if (caller.actor === "client" && appointment.clientId !== caller.clientId) {
    throw new AppError("NOT_FOUND");
  }
  return appointment;
}

// UC07 steps 2 to 4, RF028, RF029: the appointments of the client by scope.
export async function listMyAppointments(
  clientId: string,
  { scope, page, pageSize }: MyAppointmentListQuery,
): Promise<{ appointments: ClientAppointmentSummary[]; total: number }> {
  return listClientAppointments(
    clientId,
    APPOINTMENT_SCOPE_STATUSES[scope],
    scope === "history",
    page,
    pageSize,
  );
}

// UC07: the detail of an appointment of the client, with the copies (RN037).
export async function getMyAppointment(
  clientId: string,
  id: string,
): Promise<ClientAppointment> {
  return toClientAppointment(
    await getAppointmentOf(id, { actor: "client", clientId }),
  );
}

// UC12 FE01, UC07 FE02, UC26 FE01: the transition is refused with the current
// status; the client reads what the portal does not do.
function refuseStatus(
  status: AppointmentStatus,
  caller: Caller,
  action: "cancel" | "edit" | "reschedule" | "other" = "other",
): never {
  throw new AppError("INVALID_STATUS", {
    message:
      caller.actor === "client" && action !== "other"
        ? describeClientInvalidStatus(action, status)
        : describeInvalidStatus(status),
  });
}

// RN017 to RN019: the staff moves the appointment along the table of
// status-transitions.ts. The write holds only if the status is still the one
// read (changeAppointmentStatus); otherwise the new status is read for the
// message.
async function changeStatus(
  id: string,
  action: AppointmentAction,
  caller: Caller,
  buildChange: (
    appointment: AdminAppointment,
    status: AppointmentStatus,
  ) => StatusChange,
): Promise<AdminAppointment> {
  const appointment = await getAppointmentOf(id, caller);
  const nextStatus = findNextStatus({
    action,
    status: appointment.status,
    actor: caller.actor,
  });
  if (nextStatus === null) {
    refuseStatus(appointment.status, caller, refusalOf(action));
  }
  const isChanged = await changeAppointmentStatus(
    id,
    appointment.status,
    buildChange(appointment, nextStatus),
  );
  if (!isChanged) {
    refuseStatus((await getAppointment(id)).status, caller, refusalOf(action));
  }
  return getAppointment(id);
}

function refusalOf(action: AppointmentAction) {
  return action === "cancel" || action === "reschedule" ? action : "other";
}

// UC12 steps 2 to 5.
export function advanceAppointment(id: string): Promise<AdminAppointment> {
  return changeStatus(id, "advance", STAFF, (_, status) => ({ status }));
}

// UC12 FA02, RN019, RN041: the reason is any of the list.
export function cancelAppointment(
  id: string,
  { reason }: AppointmentCancelInput,
  now: Date,
): Promise<AdminAppointment> {
  return changeStatus(id, "cancel", STAFF, (_, status) => ({
    status,
    cancelledAt: now.toISOString(),
    cancellationReason: reason,
  }));
}

// UC07 FA01, RN019, RN041: the client cancels only a scheduled appointment of
// theirs, with one of the reasons of the client (the route checks it).
export async function cancelMyAppointment(
  clientId: string,
  id: string,
  { reason }: AppointmentCancelInput,
  now: Date,
): Promise<ClientAppointment> {
  return toClientAppointment(
    await changeStatus(
      id,
      "cancel",
      { actor: "client", clientId },
      (_, status) => ({
        status,
        cancelledAt: now.toISOString(),
        cancellationReason: reason,
      }),
    ),
  );
}

// UC12 FA01, RN018: the method of the appointment keeps the percent and the
// total recorded in it; another one takes the percent of today over the
// subtotal (listPaymentOptions, the totals the dialog showed).
export function completeAppointment(
  id: string,
  paymentMethod: PaymentMethod,
  now: Date,
): Promise<AdminAppointment> {
  return changeStatus(id, "complete", STAFF, (appointment, status) => {
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

// UC26 FA01, RN032, RN033, RN037: the staff edits an appointment of any status;
// the status never changes. What did not change stays as recorded: the
// services, their prices and the copy of the vehicle when neither the vehicle
// nor the services change, and the percent when the payment method does not
// change. A change of the vehicle or of the services prices every service
// again by the current catalog. The subtotal, the total, the duration and the
// end are always worked out here, never read from the request (RS013).
export function editAppointment(
  id: string,
  input: AppointmentEditInput,
  now: Date,
): Promise<AdminAppointment> {
  return applyEdit(id, input, now, STAFF);
}

// UC26, RN032, RN033: the client edits only a scheduled appointment of theirs
// and only postpones the date; a vehicle that is not in the account is
// answered as one that does not exist (RS009).
export async function editMyAppointment(
  clientId: string,
  id: string,
  input: AppointmentEditInput,
  now: Date,
): Promise<ClientAppointment> {
  return toClientAppointment(
    await applyEdit(id, input, now, { actor: "client", clientId }),
  );
}

async function applyEdit(
  id: string,
  input: AppointmentEditInput,
  now: Date,
  caller: Caller,
): Promise<AdminAppointment> {
  const appointment = await getAppointmentOf(id, caller);
  if (
    !canEditAppointment({ actor: caller.actor, status: appointment.status })
  ) {
    refuseStatus(appointment.status, caller, "edit");
  }
  const current = {
    vehicleId: appointment.vehicle.id,
    serviceIds: appointment.services.map((service) => service.id),
    paymentMethod: appointment.paymentMethod,
    scheduledAt: new Date(appointment.scheduledAt),
  };
  const request = {
    vehicleId: input.vehicleId,
    serviceIds: input.serviceIds,
    paymentMethod: input.paymentMethod,
    scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
  };
  const changes = findEditChanges(current, request);
  if (
    changes.vehicle &&
    input.vehicleId &&
    !(await isVehicleOfClient(appointment.clientId, input.vehicleId))
  ) {
    if (caller.actor === "client") {
      throw new AppError("NOT_FOUND");
    }
    throw new AppError("VALIDATION_ERROR", {
      fields: { vehicleId: NOT_YOUR_VEHICLE_MESSAGE },
    });
  }
  const isRepriced = changes.vehicle || changes.services;
  const services = isRepriced
    ? await findOrderServices(input.serviceIds ?? current.serviceIds)
    : [];
  const businessHours = await listBusinessHours();
  const fields = findEditErrors({
    actor: caller.actor,
    status: appointment.status,
    current,
    request,
    bookableServices: services,
    now,
    businessHours,
    timeZone: COMPANY_TIME_ZONE,
  });
  if (Object.keys(fields).length > 0) {
    throw new AppError("VALIDATION_ERROR", { fields });
  }

  const feePercent = changes.payment
    ? await findFeePercent(input.paymentMethod ?? current.paymentMethod)
    : appointment.feePercent;
  let items: NewAppointment["items"] | null = null;
  let subtotal = appointment.subtotal;
  let durationMinutes = appointment.estimatedDurationMinutes;
  if (isRepriced) {
    const vehicle = changes.vehicle
      ? await findVehicle(input.vehicleId ?? current.vehicleId)
      : { size: appointment.vehicle.size };
    if (vehicle === null) {
      throw new AppError("NOT_FOUND");
    }
    const order = workOutOrder(services, vehicle.size, feePercent);
    items = services.map(({ id: serviceId, durationMinutes: minutes }) => ({
      serviceId,
      price: order.priceOf(serviceId),
      durationMinutes: minutes,
    }));
    subtotal = order.subtotal;
    durationMinutes = order.durationMinutes;
  }
  const scheduledAt = changes.schedule
    ? (request.scheduledAt as Date).toISOString()
    : appointment.scheduledAt;
  const estimatedEnd = calculateEstimatedEnd({
    startsAt: new Date(scheduledAt),
    durationMinutes,
    businessHours,
    timeZone: COMPANY_TIME_ZONE,
  });
  if (estimatedEnd === null) {
    throw new Error("The business hours have no working time.");
  }
  const savedId = await updateAppointment({
    id,
    updatedAt: input.updatedAt,
    vehicleId: input.vehicleId ?? current.vehicleId,
    scheduledAt,
    paymentMethod: input.paymentMethod ?? current.paymentMethod,
    feePercent,
    subtotal,
    total: calculateTotal({ subtotal, feePercent }),
    estimatedDurationMinutes: durationMinutes,
    estimatedEndAt: estimatedEnd.toISOString(),
    items,
  });
  // Someone saved it after the version the caller read (RNF011).
  if (savedId === null) {
    throw new AppError("VERSION_CONFLICT");
  }
  return getAppointment(id);
}

// UC25 FA01, RN020: a new scheduled appointment for the vehicle and the
// services of a completed one, priced by the current catalog; the services the
// catalog no longer offers are left out (RN008, FE02), and what is left must
// still make a valid order. The original becomes rescheduled.
export function rescheduleAppointment(
  id: string,
  input: AppointmentRescheduleInput,
  staffId: string,
  now: Date,
): Promise<AdminAppointment> {
  return applyReschedule(id, input, STAFF, staffId, now);
}

// UC25: the client reschedules a completed appointment of theirs; no staff
// member is recorded.
export async function rescheduleMyAppointment(
  clientId: string,
  id: string,
  input: AppointmentRescheduleInput,
  now: Date,
): Promise<ClientAppointment> {
  return toClientAppointment(
    await applyReschedule(id, input, { actor: "client", clientId }, null, now),
  );
}

async function applyReschedule(
  id: string,
  input: AppointmentRescheduleInput,
  caller: Caller,
  staffId: string | null,
  now: Date,
): Promise<AdminAppointment> {
  const original = await getAppointmentOf(id, caller);
  if (
    findNextStatus({
      action: "reschedule",
      status: original.status,
      actor: caller.actor,
    }) === null
  ) {
    refuseStatus(original.status, caller, "reschedule");
  }
  const vehicle = await findVehicle(original.vehicle.id);
  if (vehicle === null) {
    throw new AppError("NOT_FOUND");
  }
  const services = await findOrderServices(
    original.services.map((service) => service.id),
  );
  const businessHours = await listBusinessHours();
  const startsAt = new Date(input.scheduledAt);
  const fields = findBookingErrors({
    requestedServiceIds: services.map((service) => service.id),
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
  const newId = await insertRescheduledAppointment({
    originalId: id,
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
  if (newId === null) {
    // Not completed any more, or the client was deleted.
    const { status } = await getAppointment(id);
    if (status !== "completed") refuseStatus(status, caller, "reschedule");
    throw new AppError("NOT_FOUND");
  }
  return getAppointment(newId);
}

// UC28, RN043: the client rates, once, an appointment of theirs Concluído or
// Reagendado, up to 30 days after the conclusion. The one of another client
// is answered as one that does not exist (RS009).
export async function reviewMyAppointment(
  clientId: string,
  id: string,
  { rating }: AppointmentReviewInput,
  now: Date,
): Promise<ClientAppointment> {
  const appointment = await getAppointmentOf(id, { actor: "client", clientId });
  if (
    findReviewRefusal(appointment, formatCalendarDate(now.toISOString())) !==
    null
  ) {
    throw new AppError("REVIEW_NOT_ALLOWED");
  }
  await insertReview(id, rating);
  return toClientAppointment(await getAppointment(id), now);
}
