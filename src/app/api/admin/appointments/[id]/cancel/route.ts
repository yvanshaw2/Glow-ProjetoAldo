import { requirePermission } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondOk } from "@/server/http/respond";
import { cancelAppointment } from "@/server/services/appointments";
import { AppError } from "@/shared/errors/app-error";
import { appointmentCancelSchema } from "@/shared/validation/appointments";
import { idSchema } from "@/shared/validation/params";

type Context = { body: unknown; params: { id: string } };

// UC12, RN041: staff with the appointments permission (RS008), with the
// reason of the cancellation. An id that is not a UUID gets the 404 of a
// missing appointment.
export const POST = handleRoute(async ({ body, params }: Context) => {
  await requirePermission("appointments");
  const id = idSchema.safeParse(params.id);
  if (!id.success) {
    throw new AppError("NOT_FOUND");
  }
  const input = appointmentCancelSchema.parse(body);
  return respondOk(await cancelAppointment(id.data, input, new Date()));
});
