import { requireClient } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondOk } from "@/server/http/respond";
import { lookUpVehicle } from "@/server/services/vehicles";
import { vehicleLookupQuerySchema } from "@/shared/validation/vehicles";

// UC05 step 4: the body is null for a plate that is not registered, and
// never has data of the accounts of the vehicle (RN036).
export const GET = handleRoute(async ({ request }) => {
  await requireClient();
  const { plate } = vehicleLookupQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  return respondOk(await lookUpVehicle(plate));
});
