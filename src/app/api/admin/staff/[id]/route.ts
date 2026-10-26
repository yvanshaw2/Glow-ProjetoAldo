import { requirePermission } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondOk } from "@/server/http/respond";
import { updateStaff } from "@/server/services/staff";
import { AppError } from "@/shared/errors/app-error";
import { idSchema } from "@/shared/validation/params";
import { staffUpdateSchema } from "@/shared/validation/staff";

// UC20 steps 5 and 6, FA02: edits, deactivates or reactivates (RS008, RS010).
export const PATCH = handleRoute(
  async ({ body, params }: { body: unknown; params: { id: string } }) => {
    await requirePermission("staff");
    // An id that is not a UUID gets the 404 of a missing member.
    const id = idSchema.safeParse(params.id);
    if (!id.success) {
      throw new AppError("NOT_FOUND");
    }
    const update = staffUpdateSchema.parse(body);
    return respondOk(await updateStaff(id.data, update));
  },
);
