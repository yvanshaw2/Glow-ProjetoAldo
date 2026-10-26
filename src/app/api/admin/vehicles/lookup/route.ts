import { requirePermission } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondOk } from "@/server/http/respond";
import { lookUpVehicle } from "@/server/services/vehicles";
import { vehicleLookupQuerySchema } from "@/shared/validation/vehicles";

// UC18 step 4: staff with the clients permission (RS008). The body is null
// for a plate that is not registered.
export const GET = handleRoute(async ({ request }) => {
  await requirePermission("clients");
  const { plate } = vehicleLookupQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  return respondOk(await lookUpVehicle(plate));
});
