import { requirePermission } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondPage } from "@/server/http/respond";
import { lookUpClients } from "@/server/services/appointments";
import { clientLookupQuerySchema } from "@/shared/validation/appointments";

// UC11 step 2.
export const GET = handleRoute(async ({ request }) => {
  await requirePermission("appointments");
  const query = clientLookupQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  const { clients, total } = await lookUpClients(
    query.search,
    query.page,
    query.pageSize,
  );
  return respondPage(clients, query, total);
});
