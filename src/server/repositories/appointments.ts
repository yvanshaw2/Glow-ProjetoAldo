import "server-only";
import { appointmentSearchFilters } from "@/server/repositories/appointment-search";
import { sortAppointmentServices } from "@/server/rules/appointment-services";
import { getServiceClient } from "@/server/supabase/clients";
import type {
  AdminAppointment,
  AdminAppointmentSummary,
  ClientAppointmentSummary,
} from "@/shared/api/appointments";
import type { AppointmentStatus } from "@/shared/constants/appointment-statuses";
import type { CancellationReason } from "@/shared/constants/cancellation-reasons";
import type { AppointmentSort } from "@/shared/constants/appointment-views";
import type { PaymentMethod } from "@/shared/constants/payment-methods";
import type { ServiceType } from "@/shared/constants/service-types";
import type { VehicleSize } from "@/shared/constants/vehicle-sizes";
import type { VehicleType } from "@/shared/constants/vehicle-types";

// Tables appointments and appointment_services (docs/agendamento/dados.md).
// Only the copies made in the appointment are read (RN037), never the client,
// the vehicle or the service.

type ServiceRow = {
  service_id: string;
  service_name: string;
  service_type: ServiceType;
  price: number | string;
  duration_minutes: number;
};

type AppointmentRow = {
  id: string;
  status: AppointmentStatus;
  scheduled_at: string;
  estimated_end_at: string;
  estimated_duration_minutes: number;
  client_id: string;
  client_name: string;
  payment_method: PaymentMethod;
  subtotal: number | string;
  fee_percent: number | string;
  total: number | string;
  vehicle_id: string;
  vehicle_plate: string;
  vehicle_type: VehicleType;
  vehicle_size: VehicleSize;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_color: string;
  vehicle_year: number;
  cancellation_reason: CancellationReason | null;
  updated_at: string;
  appointment_services: ServiceRow[];
};

const APPOINTMENT_COLUMNS = `id, status, scheduled_at, estimated_end_at,
  estimated_duration_minutes, client_id, client_name, payment_method,
  subtotal, fee_percent, total, vehicle_id, vehicle_plate, vehicle_type,
  vehicle_size, vehicle_brand, vehicle_model, vehicle_color, vehicle_year,
  cancellation_reason, updated_at,
  appointment_services (service_id, service_name, service_type, price,
    duration_minutes)`;

// numeric(10,2) may come as text; the API gives a number.
function toNumber(value: number | string): number {
  return Number(value);
}

// Main, complementary and additional, then by name (L4 of the plan of #46).
function sortServices(row: AppointmentRow) {
  return sortAppointmentServices(
    row.appointment_services.map((service) => ({
      ...service,
      name: service.service_name,
      type: service.service_type,
    })),
  );
}

export function toAdminAppointmentSummary(
  row: AppointmentRow,
): AdminAppointmentSummary {
  return {
    id: row.id,
    status: row.status,
    scheduledAt: row.scheduled_at,
    estimatedEndAt: row.estimated_end_at,
    clientName: row.client_name,
    vehicle: {
      plate: row.vehicle_plate,
      brand: row.vehicle_brand,
      model: row.vehicle_model,
    },
    services: sortServices(row).map((service) => ({
      id: service.service_id,
      name: service.service_name,
    })),
    total: toNumber(row.total),
  };
}

function toClientAppointmentSummary(
  row: AppointmentRow,
): ClientAppointmentSummary {
  const summary = toAdminAppointmentSummary(row);
  return {
    id: summary.id,
    status: summary.status,
    scheduledAt: summary.scheduledAt,
    estimatedEndAt: summary.estimatedEndAt,
    vehicle: { ...summary.vehicle, color: row.vehicle_color },
    services: summary.services,
    total: summary.total,
  };
}

// The payment options are filled by the service, only for a Finalizado.
function toAdminAppointment(row: AppointmentRow): AdminAppointment {
  return {
    id: row.id,
    status: row.status,
    scheduledAt: row.scheduled_at,
    estimatedEndAt: row.estimated_end_at,
    estimatedDurationMinutes: row.estimated_duration_minutes,
    clientId: row.client_id,
    clientName: row.client_name,
    paymentMethod: row.payment_method,
    subtotal: toNumber(row.subtotal),
    feePercent: toNumber(row.fee_percent),
    total: toNumber(row.total),
    vehicle: {
      id: row.vehicle_id,
      plate: row.vehicle_plate,
      type: row.vehicle_type,
      size: row.vehicle_size,
      brand: row.vehicle_brand,
      model: row.vehicle_model,
      color: row.vehicle_color,
      year: row.vehicle_year,
    },
    services: sortServices(row).map((service) => ({
      id: service.service_id,
      name: service.service_name,
      type: service.service_type,
      price: toNumber(service.price),
      durationMinutes: service.duration_minutes,
    })),
    cancellationReason: row.cancellation_reason,
    updatedAt: row.updated_at,
    paymentOptions: null,
  };
}

export type AppointmentFilters = {
  statuses: readonly AppointmentStatus[];
  // The day split of the views "Hoje" (before) and "Futuros" (from).
  scheduledBefore?: string;
  scheduledFrom?: string;
  search?: string;
  sort: AppointmentSort;
  // The history goes from the latest to the oldest.
  latestFirst: boolean;
};

// UC10, RF045 to RF047: the status order is the one of the enum (RN017); the
// id breaks a tie so the pages never repeat or skip an item.
export async function listAdminAppointments(
  filters: AppointmentFilters,
  page: number,
  pageSize: number,
): Promise<{ appointments: AdminAppointmentSummary[]; total: number }> {
  const from = (page - 1) * pageSize;
  let query = getServiceClient()
    .from("appointments")
    .select(APPOINTMENT_COLUMNS, { count: "exact" })
    .in("status", [...filters.statuses]);
  if (filters.scheduledBefore) {
    query = query.lt("scheduled_at", filters.scheduledBefore);
  }
  if (filters.scheduledFrom) {
    query = query.gte("scheduled_at", filters.scheduledFrom);
  }
  for (const filter of appointmentSearchFilters(filters.search ?? "")) {
    query = query.or(filter);
  }
  if (filters.sort === "status") {
    query = query.order("status");
  }
  const { data, error, count } = await query
    .order("scheduled_at", { ascending: !filters.latestFirst })
    .order("id")
    .range(from, from + pageSize - 1)
    .returns<AppointmentRow[]>();
  if (error) {
    throw error;
  }
  return {
    appointments: data.map(toAdminAppointmentSummary),
    total: count ?? 0,
  };
}

// UC07, RF028, RF029, RS009: the appointments of one client in the statuses
// of a scope, by time (the history from the latest to the oldest); the id
// breaks a tie so the pages never repeat or skip an item.
export async function listClientAppointments(
  clientId: string,
  statuses: readonly AppointmentStatus[],
  latestFirst: boolean,
  page: number,
  pageSize: number,
): Promise<{ appointments: ClientAppointmentSummary[]; total: number }> {
  const from = (page - 1) * pageSize;
  const { data, error, count } = await getServiceClient()
    .from("appointments")
    .select(APPOINTMENT_COLUMNS, { count: "exact" })
    .eq("client_id", clientId)
    .in("status", [...statuses])
    .order("scheduled_at", { ascending: !latestFirst })
    .order("id")
    .range(from, from + pageSize - 1)
    .returns<AppointmentRow[]>();
  if (error) {
    throw error;
  }
  return {
    appointments: data.map(toClientAppointmentSummary),
    total: count ?? 0,
  };
}

// What create_appointment saves, worked out by the service; the copies of
// RN037 are made by the function (docs/agendamento/dados.md).
export type NewAppointment = {
  clientId: string;
  vehicleId: string;
  // Null when the client booked.
  staffId: string | null;
  scheduledAt: string;
  paymentMethod: PaymentMethod;
  feePercent: number;
  subtotal: number;
  total: number;
  estimatedDurationMinutes: number;
  estimatedEndAt: string;
  items: { serviceId: string; price: number; durationMinutes: number }[];
};

// RNF010: the appointment, the copies and the services are written by
// create_appointment in one transaction. Null, with nothing written, when the
// client was deleted or the vehicle is not in the client's account.
export async function insertAppointment(
  appointment: NewAppointment,
): Promise<string | null> {
  const { data, error } = await getServiceClient().rpc("create_appointment", {
    p_client_id: appointment.clientId,
    p_vehicle_id: appointment.vehicleId,
    p_staff_id: appointment.staffId,
    p_scheduled_at: appointment.scheduledAt,
    p_payment_method: appointment.paymentMethod,
    p_fee_percent: appointment.feePercent,
    p_subtotal: appointment.subtotal,
    p_total: appointment.total,
    p_estimated_duration_minutes: appointment.estimatedDurationMinutes,
    p_estimated_end_at: appointment.estimatedEndAt,
    p_items: toItems(appointment.items),
  });
  if (error) {
    throw error;
  }
  return (data as string | null) ?? null;
}

export async function findAdminAppointment(
  id: string,
): Promise<AdminAppointment | null> {
  const { data, error } = await getServiceClient()
    .from("appointments")
    .select(APPOINTMENT_COLUMNS)
    .eq("id", id)
    .maybeSingle<AppointmentRow>();
  if (error) {
    throw error;
  }
  return data === null ? null : toAdminAppointment(data);
}

// UC09, RF043: the appointments scheduled in [from, to), of any status, by
// time and, in the same instant, by id.
export async function listAppointmentsBetween(
  from: string,
  to: string,
): Promise<AdminAppointmentSummary[]> {
  const { data, error } = await getServiceClient()
    .from("appointments")
    .select(APPOINTMENT_COLUMNS)
    .gte("scheduled_at", from)
    .lt("scheduled_at", to)
    .order("scheduled_at")
    .order("id")
    .returns<AppointmentRow[]>();
  if (error) {
    throw error;
  }
  return data.map(toAdminAppointmentSummary);
}

// What a status change writes besides the status; the completion also writes
// the payment method used, with its percent and total (RN018), and each end
// status its moment (completed_at and cancelled_at, docs/agendamento/dados.md).
export type StatusChange = {
  status: AppointmentStatus;
  payment?: { method: PaymentMethod; feePercent: number; total: number };
  completedAt?: string;
  cancelledAt?: string;
  // RN041
  cancellationReason?: CancellationReason;
};

// One statement, so a change made by someone else in the meantime is not
// overwritten: false, with nothing written, when the appointment no longer has
// the status the caller read. updated_at is written by
// trg_appointments_updated_at.
export async function changeAppointmentStatus(
  id: string,
  fromStatus: AppointmentStatus,
  change: StatusChange,
): Promise<boolean> {
  const { data, error } = await getServiceClient()
    .from("appointments")
    .update({
      status: change.status,
      ...(change.payment && {
        payment_method: change.payment.method,
        fee_percent: change.payment.feePercent,
        total: change.payment.total,
      }),
      ...(change.completedAt && { completed_at: change.completedAt }),
      ...(change.cancelledAt && { cancelled_at: change.cancelledAt }),
      ...(change.cancellationReason && {
        cancellation_reason: change.cancellationReason,
      }),
    })
    .eq("id", id)
    .eq("status", fromStatus)
    .select("id");
  if (error) {
    throw error;
  }
  return data.length > 0;
}

// What update_appointment saves, worked out by the service. The items are null
// when the services and their copies stay as they are (RN033).
export type AppointmentEdit = {
  id: string;
  // The version the caller read (RNF011), as text.
  updatedAt: string;
  vehicleId: string;
  scheduledAt: string;
  paymentMethod: PaymentMethod;
  feePercent: number;
  subtotal: number;
  total: number;
  estimatedDurationMinutes: number;
  estimatedEndAt: string;
  items: NewAppointment["items"] | null;
};

function toItems(items: NewAppointment["items"]) {
  return items.map((item) => ({
    service_id: item.serviceId,
    price: item.price,
    duration_minutes: item.durationMinutes,
  }));
}

// RNF010, RNF011: update_appointment changes the appointment, the copy of the
// vehicle and the services in one transaction, only if the appointment still
// has the version the caller read. Null, with nothing written, when it does
// not, or when the vehicle is not in the account of the client.
export async function updateAppointment(
  edit: AppointmentEdit,
): Promise<string | null> {
  const { data, error } = await getServiceClient().rpc("update_appointment", {
    p_id: edit.id,
    p_updated_at: edit.updatedAt,
    p_vehicle_id: edit.vehicleId,
    p_scheduled_at: edit.scheduledAt,
    p_payment_method: edit.paymentMethod,
    p_fee_percent: edit.feePercent,
    p_subtotal: edit.subtotal,
    p_total: edit.total,
    p_estimated_duration_minutes: edit.estimatedDurationMinutes,
    p_estimated_end_at: edit.estimatedEndAt,
    p_items: edit.items === null ? null : toItems(edit.items),
  });
  if (error) {
    throw error;
  }
  return (data as string | null) ?? null;
}

// What reschedule_appointment saves: the new appointment of the client and of
// the vehicle of the original.
export type RescheduledAppointment = Omit<
  NewAppointment,
  "clientId" | "vehicleId"
> & { originalId: string };

// RN020: the new appointment is created and the original becomes rescheduled
// in one transaction. Null, with nothing written, when the original is not
// completed any more, its client was deleted or its vehicle was unlinked.
export async function insertRescheduledAppointment(
  appointment: RescheduledAppointment,
): Promise<string | null> {
  const { data, error } = await getServiceClient().rpc(
    "reschedule_appointment",
    {
      p_original_id: appointment.originalId,
      p_staff_id: appointment.staffId,
      p_scheduled_at: appointment.scheduledAt,
      p_payment_method: appointment.paymentMethod,
      p_fee_percent: appointment.feePercent,
      p_subtotal: appointment.subtotal,
      p_total: appointment.total,
      p_estimated_duration_minutes: appointment.estimatedDurationMinutes,
      p_estimated_end_at: appointment.estimatedEndAt,
      p_items: toItems(appointment.items),
    },
  );
  if (error) {
    throw error;
  }
  return (data as string | null) ?? null;
}
