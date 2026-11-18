import { requirePermission } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondCreated } from "@/server/http/respond";
import { rescheduleAppointment } from "@/server/services/appointments";
import { AppError } from "@/shared/errors/app-error";
import { appointmentRescheduleSchema } from "@/shared/validation/appointments";
import { idSchema } from "@/shared/validation/params";

type Context = { body: unknown; params: { id: string } };

// UC25 FA01: staff with the appointments permission (RS008); the staff member
// of the session registers the new appointment.
export const POST = handleRoute(async ({ body, params }: Context) => {
  const account = await requirePermission("appointments");
  const id = idSchema.safeParse(params.id);
  if (!id.success) {
    throw new AppError("NOT_FOUND");
  }
  const input = appointmentRescheduleSchema.parse(body);
  return respondCreated(
    await rescheduleAppointment(id.data, input, account.id, new Date()),
  );
});
