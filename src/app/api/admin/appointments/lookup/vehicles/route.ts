import { requirePermission } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondPage } from "@/server/http/respond";
import { lookUpVehicles } from "@/server/services/appointments";
import { vehicleLookupQuerySchema } from "@/shared/validation/appointments";

// UC11 step 3.
export const GET = handleRoute(async ({ request }) => {
  await requirePermission("appointments");
  const query = vehicleLookupQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  const { vehicles, total } = await lookUpVehicles(
    query.clientId,
    query.page,
    query.pageSize,
  );
  return respondPage(vehicles, query, total);
});
