import { SEED_CLIENTS } from "@/lib/demo/clients";
import { demoPage } from "@/lib/demo/list";
import type { DemoRequest } from "@/lib/demo/routes";
import { SEED_VEHICLES, SIZE_BY_TYPE, VEHICLE_IDS } from "@/lib/demo/vehicles";
import type { Page } from "@/shared/api/pagination";
import type { ClientVehicle } from "@/shared/api/vehicles";
import { SHORT_LIST_PAGE_SIZE } from "@/shared/constants/pagination";

// Demo data of the vehicles of the clients of the panel (decision 0055), from
// supabase/seed-demo.sql: the vehicles of its 13 clients, the SW4 in two
// accounts (RN036). The ids are the seed's, so the routes of #45 answer the
// same ones. The clients themselves are real (#42). The plate lookup is the
// one of the client area (src/lib/demo/vehicles.ts).

const UPDATED_AT = "2026-06-23T12:00:00+00:00";

// GET /api/admin/clients/:id/vehicles: in the order of the seed's links. A
// client that is not of the seed, created through the panel, has none.
export function answerAdminClientVehicles({
  params,
  query,
}: DemoRequest): Page<ClientVehicle> {
  const client = SEED_CLIENTS.find(({ id }) => id === params.id);
  const plates = client ? client.plates : [];
  const vehicles = plates.map((plate) => toClientVehicle(plate));
  return demoPage(vehicles, query, { pageSize: SHORT_LIST_PAGE_SIZE });
}

function toClientVehicle(plate: string): ClientVehicle {
  const seedVehicle = SEED_VEHICLES.find(([seedPlate]) => seedPlate === plate);
  if (!seedVehicle) {
    throw new Error(`No vehicle of the seed has the plate ${plate}`);
  }
  const [, type, brand, model, color, year] = seedVehicle;
  return {
    id: VEHICLE_IDS[plate],
    plate,
    type,
    size: SIZE_BY_TYPE[type],
    brand,
    model,
    color,
    year,
    // RN036: the vehicle is in more than one account.
    isShared:
      SEED_CLIENTS.filter((client) => client.plates.includes(plate)).length > 1,
    updatedAt: UPDATED_AT,
  };
}
