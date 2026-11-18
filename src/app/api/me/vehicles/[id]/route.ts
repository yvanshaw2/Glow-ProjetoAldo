import { requireClient } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondOk } from "@/server/http/respond";
import { updateMyVehicle } from "@/server/services/vehicles";
import { AppError } from "@/shared/errors/app-error";
import { idSchema } from "@/shared/validation/params";
import { vehicleUpdateSchema } from "@/shared/validation/vehicles";

type Context = { body: unknown; params: { id: string } };

// UC05 FA02: only a vehicle of the account of the session (RS009).
export const PATCH = handleRoute(async ({ body, params }: Context) => {
  const account = await requireClient();
  // An id that is not a UUID gets the 404 of a missing vehicle.
  const id = idSchema.safeParse(params.id);
  if (!id.success) {
    throw new AppError("NOT_FOUND");
  }
  const update = vehicleUpdateSchema().parse(body);
  return respondOk(await updateMyVehicle(account.id, id.data, update));
});
