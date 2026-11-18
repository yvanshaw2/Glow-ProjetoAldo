import { requirePermission } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondOk } from "@/server/http/respond";
import {
  editAppointment,
  getAppointment,
} from "@/server/services/appointments";
import { AppError } from "@/shared/errors/app-error";
import { appointmentEditSchema } from "@/shared/validation/appointments";
import { idSchema } from "@/shared/validation/params";

type Context = { body: unknown; params: { id: string } };

// UC10: staff with the appointments permission (RS008).
export const GET = handleRoute(async ({ params }: Context) => {
  await requirePermission("appointments");
  // An id that is not a UUID gets the 404 of a missing appointment.
  const id = idSchema.safeParse(params.id);
  if (!id.success) {
    throw new AppError("NOT_FOUND");
  }
  return respondOk(await getAppointment(id.data));
});

// UC26 FA01: staff with the appointments permission edits any status (RS008).
export const PATCH = handleRoute(async ({ body, params }: Context) => {
  await requirePermission("appointments");
  const id = idSchema.safeParse(params.id);
  if (!id.success) {
    throw new AppError("NOT_FOUND");
  }
  const input = appointmentEditSchema.parse(body);
  return respondOk(await editAppointment(id.data, input, new Date()));
});
