import { requirePermission } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondOk } from "@/server/http/respond";
import { advanceAppointment } from "@/server/services/appointments";
import { AppError } from "@/shared/errors/app-error";
import { idSchema } from "@/shared/validation/params";

type Context = { body: unknown; params: { id: string } };

// UC12: staff with the appointments permission (RS008). An id that is not a
// UUID gets the 404 of a missing appointment.
export const POST = handleRoute(async ({ params }: Context) => {
  await requirePermission("appointments");
  const id = idSchema.safeParse(params.id);
  if (!id.success) {
    throw new AppError("NOT_FOUND");
  }
  return respondOk(await advanceAppointment(id.data));
});
