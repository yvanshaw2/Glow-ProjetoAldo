import { requireClient } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondCreated, respondPage } from "@/server/http/respond";
import {
  addClientVehicle,
  listClientVehicles,
} from "@/server/services/vehicles";
import { SHORT_LIST_PAGE_SIZE } from "@/shared/constants/pagination";
import { paginationSchema } from "@/shared/validation/params";
import { vehicleInputSchema } from "@/shared/validation/vehicles";

// UC05: the vehicles of the account of the session (RS009).
export const GET = handleRoute(async ({ request }) => {
  const account = await requireClient();
  const query = paginationSchema(SHORT_LIST_PAGE_SIZE).parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  const { vehicles, total } = await listClientVehicles(
    account.id,
    query.page,
    query.pageSize,
  );
  return respondPage(vehicles, query, total);
});

export const POST = handleRoute(async ({ body }) => {
  const account = await requireClient();
  const input = vehicleInputSchema.parse(body);
  return respondCreated(await addClientVehicle(account.id, input, "client"));
});
