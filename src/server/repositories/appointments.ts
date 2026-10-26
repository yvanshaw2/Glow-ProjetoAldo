import "server-only";
import { appointmentSearchFilters } from "@/server/repositories/appointment-search";
import { sortAppointmentServices } from "@/server/rules/appointment-services";
import { getServiceClient } from "@/server/supabase/clients";
import type {
  AdminAppointment,
  AdminAppointmentSummary,
} from "@/shared/api/appointments";
import type { AppointmentStatus } from "@/shared/constants/appointment-statuses";
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
  updated_at: string;
  appointment_services: ServiceRow[];
};

const APPOINTMENT_COLUMNS = `id, status, scheduled_at, estimated_end_at,
  estimated_duration_minutes, client_id, client_name, payment_method,
  subtotal, fee_percent, total, vehicle_id, vehicle_plate, vehicle_type,
  vehicle_size, vehicle_brand, vehicle_model, vehicle_color, vehicle_year,
  updated_at,
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
