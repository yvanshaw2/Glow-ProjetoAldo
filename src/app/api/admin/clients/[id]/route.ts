import { requirePermission } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondNoContent, respondOk } from "@/server/http/respond";
import {
  deleteClient,
  getClient,
  updateClient,
} from "@/server/services/clients";
import { AppError } from "@/shared/errors/app-error";
import { clientUpdateSchema } from "@/shared/validation/clients";
import { idSchema } from "@/shared/validation/params";

type Context = { body: unknown; params: { id: string } };

// An id that is not a UUID gets the 404 of a missing client.
function readId({ params }: Context): string {
  const id = idSchema.safeParse(params.id);
  if (!id.success) {
    throw new AppError("NOT_FOUND");
  }
  return id.data;
}

// UC17: staff with the clients permission (RS008, RS010).
export const GET = handleRoute(async (context: Context) => {
  await requirePermission("clients");
  return respondOk(await getClient(readId(context)));
});

export const PATCH = handleRoute(async (context: Context) => {
  await requirePermission("clients");
  const id = readId(context);
  const update = clientUpdateSchema.parse(context.body);
  return respondOk(await updateClient(id, update));
});

export const DELETE = handleRoute(async (context: Context) => {
  await requirePermission("clients");
  await deleteClient(readId(context));
  return respondNoContent();
});
