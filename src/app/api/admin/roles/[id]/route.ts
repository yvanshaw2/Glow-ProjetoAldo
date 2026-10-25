import { requirePermission } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondOk } from "@/server/http/respond";
import { updateRole } from "@/server/services/roles";
import { AppError } from "@/shared/errors/app-error";
import { idSchema } from "@/shared/validation/params";
import { roleUpdateSchema } from "@/shared/validation/staff";

// UC21 FA01 and FA02: edits, deactivates or reactivates (RS008, RS010).
export const PATCH = handleRoute(
  async ({ body, params }: { body: unknown; params: { id: string } }) => {
    await requirePermission("staff");
    // An id that is not a UUID gets the 404 of a missing role.
    const id = idSchema.safeParse(params.id);
    if (!id.success) {
      throw new AppError("NOT_FOUND");
    }
    const update = roleUpdateSchema.parse(body);
    return respondOk(await updateRole(id.data, update));
  },
);
