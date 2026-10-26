import {
  listBookableServices,
  notFound,
  previewOrder,
  type PreviewBody,
} from "@/lib/demo/appointments";
import { demoPage } from "@/lib/demo/list";
import type { DemoRequest } from "@/lib/demo/routes";
import { SEED_CLIENTS } from "@/lib/demo/clients";
import { SEED_VEHICLES, SIZE_BY_TYPE, VEHICLE_IDS } from "@/lib/demo/vehicles";
import type {
  AdminClientOption,
  AppointmentPreview,
  AppointmentVehicle,
  BookableService,
} from "@/shared/api/appointments";
import type { Page } from "@/shared/api/pagination";
import type { ClientVehicle } from "@/shared/api/vehicles";
import {
  CATALOG_PAGE_SIZE,
  SHORT_LIST_PAGE_SIZE,
} from "@/shared/constants/pagination";

// Demo data of the form of the appointments of the panel (decision 0055): the
// preview of the values and the three searches of the new appointment and of
// the edition, with the 13 clients (one with no vehicle) and the 14 vehicles
// of supabase/seed-demo.sql, the services and the prices by size of the same
// seed and the fees of supabase/seed.sql (all zero), worked out by the preview
// of src/lib/demo/appointments.ts. The listing and the detail are real
// (GET /api/admin/appointments, #46).

const UPDATED_AT = "2026-06-23T12:00:00+00:00";

// The 13 clients of supabase/seed-demo.sql (src/lib/demo/clients.ts), by full
// name; the last one has no vehicle (UC11 FE02).
const CLIENTS = SEED_CLIENTS.map(
  ({ id, firstName, lastName, email, plates }) =>
    [id, `${firstName} ${lastName}`, email, plates] as const,
);

const SHARED_PLATE = "GLW5L15";

const VEHICLES: readonly AppointmentVehicle[] = SEED_VEHICLES.map(
  ([plate, type, brand, model, color, year]) => ({
    id: VEHICLE_IDS[plate],
    plate,
    type,
    size: SIZE_BY_TYPE[type],
    brand,
    model,
    color,
    year,
  }),
);

// POST /api/admin/appointments/preview, worked out as the one of the client:
// only the vehicles of the seed, and the rules that count are the API's.
export function answerAdminAppointmentPreview({
  body,
}: DemoRequest): AppointmentPreview {
  const { vehicleId, ...order } = body as PreviewBody;
  const vehicle = VEHICLES.find(({ id }) => id === vehicleId);
  if (!vehicle) throw notFound();
  return previewOrder(vehicle.size, order);
}

// GET /api/admin/appointments/lookup/clients (UC11 step 2): the clients whose
// name or e-mail has the search, in alphabetical order.
export function answerClientLookup({
  query,
}: DemoRequest): Page<AdminClientOption> {
  const clients = CLIENTS.map(([id, name, email]) => ({
    id,
    name,
    email,
  })).sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));
  return demoPage(clients, query, {
    pageSize: SHORT_LIST_PAGE_SIZE,
    searchIn: ({ name, email }) => [name, email],
  });
}

// GET /api/admin/appointments/lookup/vehicles (UC11 step 3): the vehicles of
// the client, in the order of the seed's links (RN003).
export function answerVehicleLookup({
  query,
}: DemoRequest): Page<ClientVehicle> {
  const client = CLIENTS.find(([id]) => id === query.get("clientId"));
  if (!client) throw notFound();
  const vehicles = client[3].map((plate) => ({
    ...findVehicle(plate),
    isShared: plate === SHARED_PLATE,
    updatedAt: UPDATED_AT,
  }));
  return demoPage(vehicles, query, { pageSize: SHORT_LIST_PAGE_SIZE });
}

// GET /api/admin/appointments/lookup/services (UC11 step 4): the services to
// book with the prices of the size of the vehicle (RN009).
export function answerServiceLookup({
  query,
}: DemoRequest): Page<BookableService> {
  const vehicle = VEHICLES.find(({ id }) => id === query.get("vehicleId"));
  if (!vehicle) throw notFound();
  return demoPage(listBookableServices(vehicle.size), query, {
    pageSize: CATALOG_PAGE_SIZE,
  });
}

function findVehicle(plate: string): AppointmentVehicle {
  const vehicle = VEHICLES.find((item) => item.plate === plate);
  if (!vehicle)
    throw new Error(`No vehicle of the seed has the plate ${plate}`);
  return vehicle;
}
