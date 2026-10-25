import { requirePermission } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondOk } from "@/server/http/respond";
import { updateCategory } from "@/server/services/catalog";
import { AppError } from "@/shared/errors/app-error";
import { categoryUpdateSchema } from "@/shared/validation/catalog";
import { idSchema } from "@/shared/validation/params";

// UC15 FA01 and FA02: edits, deactivates or reactivates (RS008, RS010).
export const PATCH = handleRoute(
  async ({ body, params }: { body: unknown; params: { id: string } }) => {
    await requirePermission("services");
    // An id that is not a UUID gets the 404 of a missing category.
    const id = idSchema.safeParse(params.id);
    if (!id.success) {
      throw new AppError("NOT_FOUND");
    }
    const update = categoryUpdateSchema.parse(body);
    return respondOk(await updateCategory(id.data, update));
  },
);
