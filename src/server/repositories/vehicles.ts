import "server-only";
import { getServiceClient } from "@/server/supabase/clients";
import type { ClientVehicle, VehicleLookup } from "@/shared/api/vehicles";
import { AppError } from "@/shared/errors/app-error";
import type { VehicleData } from "@/shared/validation/vehicles";

// Tables vehicles and client_vehicles (docs/clientes/dados.md). A vehicle is
// never deleted, and the size is derived from the type by the database
// (RN002), so it is read and never written.

const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";
const PLATE_CONSTRAINT = "uq_vehicles_plate";

type VehicleRow = {
  id: string;
  plate: string;
  type: ClientVehicle["type"];
  size: ClientVehicle["size"];
  brand: string;
  model: string;
  color: string;
  year: number;
  updated_at: string;
};

const VEHICLE_COLUMNS =
  "id, plate, type, size, brand, model, color, year, updated_at";

// A vehicle as the table keeps it; whether the account is shared depends on
// the links (isSharedBy).
export type Vehicle = Omit<ClientVehicle, "isShared">;

export type VehicleChanges = Partial<VehicleData> & { plate?: string };

function toVehicle(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    plate: row.plate,
    type: row.type,
    size: row.size,
    brand: row.brand,
    model: row.model,
    color: row.color,
    year: row.year,
    updatedAt: row.updated_at,
  };
}

// RN036: the vehicle of a plate, with no data of its accounts.
export async function findVehicleByPlate(
  plate: string,
): Promise<VehicleLookup | null> {
  const { data, error } = await getServiceClient()
    .from("vehicles")
    .select(VEHICLE_COLUMNS)
    .eq("plate", plate)
    .maybeSingle<VehicleRow>();
  if (error) {
    throw error;
  }
  if (data === null) {
    return null;
  }
  const { type, brand, model, color, year } = toVehicle(data);
  return { type, brand, model, color, year };
}

export async function findVehicle(id: string): Promise<Vehicle | null> {
  const { data, error } = await getServiceClient()
    .from("vehicles")
    .select(VEHICLE_COLUMNS)
    .eq("id", id)
    .maybeSingle<VehicleRow>();
  if (error) {
    throw error;
  }
  return data === null ? null : toVehicle(data);
}

// The accounts each vehicle is linked to, in one query for all of them.
export async function accountsOfVehicles(
  vehicleIds: string[],
): Promise<Map<string, string[]>> {
  const accounts = new Map<string, string[]>(vehicleIds.map((id) => [id, []]));
  if (vehicleIds.length === 0) {
    return accounts;
  }
  const { data, error } = await getServiceClient()
    .from("client_vehicles")
    .select("client_id, vehicle_id")
    .in("vehicle_id", vehicleIds)
    .returns<{ client_id: string; vehicle_id: string }[]>();
  if (error) {
    throw error;
  }
  data.forEach(({ client_id, vehicle_id }) =>
    accounts.get(vehicle_id)?.push(client_id),
  );
  return accounts;
}

// UC17 step 5: the vehicles linked to the account, in the order of the links
// and, on a tie, by the id of the vehicle.
export async function listVehiclesOfClient(
  clientId: string,
  page: number,
  pageSize: number,
): Promise<{ vehicles: Vehicle[]; total: number }> {
  const from = (page - 1) * pageSize;
  const { data, error, count } = await getServiceClient()
    .from("client_vehicles")
    .select(`vehicles(${VEHICLE_COLUMNS})`, { count: "exact" })
    .eq("client_id", clientId)
    .order("created_at")
    .order("vehicle_id")
    .range(from, from + pageSize - 1)
    .returns<{ vehicles: VehicleRow }[]>();
  if (error) {
    throw error;
  }
  return {
    vehicles: data.map(({ vehicles }) => toVehicle(vehicles)),
    total: count ?? 0,
  };
}

// UC18 step 6: the vehicle, created when the plate is new (data given), and
// its link to the account, in one transaction (function link_vehicle). Null
// when the vehicle is already linked to the account.
export async function linkVehicle(
  clientId: string,
  plate: string,
  newVehicle: VehicleData | null,
): Promise<string | null> {
  const { data, error } = await getServiceClient().rpc("link_vehicle", {
    p_client_id: clientId,
    p_plate: plate,
    p_type: newVehicle?.type ?? null,
    p_brand: newVehicle?.brand ?? null,
    p_model: newVehicle?.model ?? null,
    p_color: newVehicle?.color ?? null,
    p_year: newVehicle?.year ?? null,
  });
  if (error) {
    // The client was deleted between the check and the link.
    if (error.code === FOREIGN_KEY_VIOLATION) {
      throw new AppError("NOT_FOUND");
    }
    throw error;
  }
  return (data as string | null) ?? null;
}

// RNF011, decision 0009: the version is checked by the update itself, so a
// change saved in between is never overwritten. Null when the vehicle has no
// such id or no longer has that updated_at; trg_vehicles_updated_at writes
// the new one. RN036: the plate of another vehicle is PLATE_IN_USE.
export async function updateVehicle(
  id: string,
  changes: VehicleChanges,
  updatedAt: string,
): Promise<Vehicle | null> {
  const { data, error } = await getServiceClient()
    .from("vehicles")
    .update({
      type: changes.type,
      plate: changes.plate,
      brand: changes.brand,
      model: changes.model,
      color: changes.color,
      year: changes.year,
    })
    .eq("id", id)
    .eq("updated_at", updatedAt)
    .select(VEHICLE_COLUMNS)
    .maybeSingle<VehicleRow>();
  if (error) {
    if (
      error.code === UNIQUE_VIOLATION &&
      error.message.includes(PLATE_CONSTRAINT)
    ) {
      throw new AppError("PLATE_IN_USE");
    }
    throw error;
  }
  return data === null ? null : toVehicle(data);
}
