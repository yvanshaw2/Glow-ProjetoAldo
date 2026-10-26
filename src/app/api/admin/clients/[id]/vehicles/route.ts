import { requirePermission } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondCreated, respondPage } from "@/server/http/respond";
import {
  addClientVehicle,
  listClientVehicles,
} from "@/server/services/vehicles";
import { SHORT_LIST_PAGE_SIZE } from "@/shared/constants/pagination";
import { AppError } from "@/shared/errors/app-error";
import { idSchema, paginationSchema } from "@/shared/validation/params";
import { vehicleInputSchema } from "@/shared/validation/vehicles";

type Context = { body: unknown; params: { id: string }; request: Request };

// An id that is not a UUID gets the 404 of a missing client.
function readId({ params }: Context): string {
  const id = idSchema.safeParse(params.id);
  if (!id.success) {
    throw new AppError("NOT_FOUND");
  }
  return id.data;
}

// UC18: staff with the clients permission (RS008, RS010).
export const GET = handleRoute(async (context: Context) => {
  await requirePermission("clients");
  const clientId = readId(context);
  const query = paginationSchema(SHORT_LIST_PAGE_SIZE).parse(
    Object.fromEntries(new URL(context.request.url).searchParams),
  );
  const { vehicles, total } = await listClientVehicles(
    clientId,
    query.page,
    query.pageSize,
  );
  return respondPage(vehicles, query, total);
});

export const POST = handleRoute(async (context: Context) => {
  await requirePermission("clients");
  const clientId = readId(context);
  const input = vehicleInputSchema.parse(context.body);
  return respondCreated(await addClientVehicle(clientId, input));
});
