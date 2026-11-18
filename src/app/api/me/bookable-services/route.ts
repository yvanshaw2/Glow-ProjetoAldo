import { requireClient } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondPage } from "@/server/http/respond";
import { lookUpMyServices } from "@/server/services/appointments";
import { serviceLookupQuerySchema } from "@/shared/validation/appointments";

// UC06 step 4: the services with the prices of the client's vehicle (RS009).
export const GET = handleRoute(async ({ request }) => {
  const account = await requireClient();
  const query = serviceLookupQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  const { services, total } = await lookUpMyServices(
    account.id,
    query.vehicleId,
    query.page,
    query.pageSize,
  );
  return respondPage(services, query, total);
});
