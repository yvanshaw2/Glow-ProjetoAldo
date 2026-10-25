import { requirePermission } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondNoContent, respondOk } from "@/server/http/respond";
import {
  deleteService,
  getService,
  updateService,
} from "@/server/services/catalog";
import { AppError } from "@/shared/errors/app-error";
import { serviceUpdateSchema } from "@/shared/validation/catalog";
import { idSchema } from "@/shared/validation/params";

type Context = { params: { id: string } };

// An id that is not a UUID gets the 404 of a missing service.
function parseId(params: { id: string }): string {
  const id = idSchema.safeParse(params.id);
  if (!id.success) {
    throw new AppError("NOT_FOUND");
  }
  return id.data;
}

// UC14 (RS008, RS010).
export const GET = handleRoute(async ({ params }: Context) => {
  await requirePermission("services");
  return respondOk(await getService(parseId(params)));
});

// UC14 FA01 to FA03: edits, deactivates or reactivates.
export const PATCH = handleRoute(
  async ({ body, params }: Context & { body: unknown }) => {
    await requirePermission("services");
    const id = parseId(params);
    const update = serviceUpdateSchema.parse(body);
    return respondOk(await updateService(id, update));
  },
);

// UC14 FA04: logical deletion (RN030).
export const DELETE = handleRoute(async ({ params }: Context) => {
  await requirePermission("services");
  await deleteService(parseId(params));
  return respondNoContent();
});
