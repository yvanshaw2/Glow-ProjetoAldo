import { requirePermission } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondPage } from "@/server/http/respond";
import { lookUpServices } from "@/server/services/appointments";
import { serviceLookupQuerySchema } from "@/shared/validation/appointments";

// UC11 step 4.
export const GET = handleRoute(async ({ request }) => {
  await requirePermission("appointments");
  const query = serviceLookupQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  const { services, total } = await lookUpServices(
    query.vehicleId,
    query.page,
    query.pageSize,
  );
  return respondPage(services, query, total);
});
