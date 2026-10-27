import { requirePermission } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondCreated } from "@/server/http/respond";
import { uploadServiceImage } from "@/server/services/catalog";
import { AppError } from "@/shared/errors/app-error";

const FILE_FIELD = "file";

// UC13 step 4 and FE02: staff with the services permission (RS008, RS010). The
// handler leaves the multipart body to the route, after checking its type and
// size (RS015).
export const POST = handleRoute(
  async ({ request }) => {
    await requirePermission("services");
    // A body that is not a well-formed form is a bad request, not a failure.
    const form = await request.formData().catch(() => {
      throw new AppError("VALIDATION_ERROR");
    });
    const file = form.get(FILE_FIELD);
    return respondCreated(
      await uploadServiceImage(file instanceof File ? file : null),
    );
  },
  { body: "multipart" },
);
