import "server-only";
import { findClientVehicleAccess } from "@/server/rules/vehicle-ownership";
import { getClient } from "@/server/services/clients";
import {
  accountsOfVehicles,
  findVehicle,
  findVehicleByPlate,
  linkVehicle,
  listVehiclesOfClient,
  updateVehicle as saveVehicle,
  type Vehicle,
} from "@/server/repositories/vehicles";
import type { ClientVehicle, VehicleLookup } from "@/shared/api/vehicles";
import { AppError } from "@/shared/errors/app-error";
import {
  vehicleDataSchema,
  type VehicleInput,
  type VehicleUpdate,
} from "@/shared/validation/vehicles";

// Module vehicles (docs/clientes/): the vehicles of the clients, in the panel
// (UC18) and in the client area (UC05).

// UC18 FE02: the panel tells the staff the vehicle is in the client's
// account, not "yours" as the portal does.
const PANEL_ALREADY_LINKED_MESSAGE =
  "Este veículo já está na conta do cliente.";

// RN036: a vehicle is shared when another account is linked to it too; the
// account of a deleted client counts, as the link stays (RN030).
function toClientVehicle(vehicle: Vehicle, accounts: string[]): ClientVehicle {
  return { ...vehicle, isShared: accounts.length > 1 };
}

// RF016, RF075: the links of a client, in the order they were made. A client
// that does not exist or was deleted is a 404.
export async function listClientVehicles(
  clientId: string,
  page: number,
  pageSize: number,
): Promise<{ vehicles: ClientVehicle[]; total: number }> {
  await getClient(clientId);
  const { vehicles, total } = await listVehiclesOfClient(
    clientId,
    page,
    pageSize,
  );
  const accounts = await accountsOfVehicles(vehicles.map(({ id }) => id));
  return {
    vehicles: vehicles.map((vehicle) =>
      toClientVehicle(vehicle, accounts.get(vehicle.id) ?? []),
    ),
    total,
  };
}

// UC18 step 4, RN036: null for a new plate; never the accounts of the vehicle.
export async function lookUpVehicle(
  plate: string,
): Promise<VehicleLookup | null> {
  return findVehicleByPlate(plate);
}

// UC18 steps 4 to 6: a registered plate links its vehicle as it is (FA01,
// RN036), and the data that came with it are ignored; a new plate needs the
// five data. The size comes from the type, by the database (RN002).
export async function addClientVehicle(
  clientId: string,
  { plate, ...data }: VehicleInput,
  audience: "panel" | "client" = "panel",
): Promise<ClientVehicle> {
  await getClient(clientId);
  const isRegistered = (await findVehicleByPlate(plate)) !== null;
  const newVehicle = isRegistered ? null : readNewVehicle(data);
  const vehicleId = await linkVehicle(clientId, plate, newVehicle);
  if (vehicleId === null) {
    // UC05 FE02: the portal keeps the catalog message, "in your account".
    throw new AppError(
      "VEHICLE_ALREADY_LINKED",
      audience === "panel" ? { message: PANEL_ALREADY_LINKED_MESSAGE } : {},
    );
  }
  return readClientVehicle(vehicleId);
}

// UC18 FE01: the field that is missing or wrong gets its message.
function readNewVehicle(data: Omit<VehicleInput, "plate">) {
  const result = vehicleDataSchema().safeParse(data);
  if (result.success) {
    return result.data;
  }
  const fields: Record<string, string> = {};
  result.error.issues.forEach(({ path, message }) => {
    fields[String(path[0])] ??= message;
  });
  throw new AppError("VALIDATION_ERROR", { fields });
}

// UC18 FA02, RNF011: the data are changed for every account the vehicle is
// linked to, and the appointments already made keep their own copy (RN037).
// The vehicle was read first, so a save that changes nothing means a
// conflict.
export async function updateVehicle(
  id: string,
  { updatedAt, ...changes }: VehicleUpdate,
): Promise<ClientVehicle> {
  await getVehicle(id);
  const vehicle = await saveVehicle(id, changes, updatedAt);
  if (vehicle === null) {
    throw new AppError("VERSION_CONFLICT");
  }
  const accounts = await accountsOfVehicles([id]);
  return toClientVehicle(vehicle, accounts.get(id) ?? []);
}

// UC05 FA02, RF018, RS009: the client edits only a vehicle that is in the
// account and in no other. A vehicle of another account is as missing as one
// that does not exist, and nothing is saved in either case.
export async function updateMyVehicle(
  clientId: string,
  id: string,
  update: VehicleUpdate,
): Promise<ClientVehicle> {
  const accounts = await accountsOfVehicles([id]);
  const access = findClientVehicleAccess(clientId, accounts.get(id) ?? []);
  if (access === "missing") {
    throw new AppError("NOT_FOUND");
  }
  if (access === "shared") {
    throw new AppError("VEHICLE_SHARED");
  }
  return updateVehicle(id, update);
}

async function getVehicle(id: string): Promise<Vehicle> {
  const vehicle = await findVehicle(id);
  if (vehicle === null) {
    throw new AppError("NOT_FOUND");
  }
  return vehicle;
}

async function readClientVehicle(id: string): Promise<ClientVehicle> {
  const vehicle = await getVehicle(id);
  const accounts = await accountsOfVehicles([id]);
  return toClientVehicle(vehicle, accounts.get(id) ?? []);
}
