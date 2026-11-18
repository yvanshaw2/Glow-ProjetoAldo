import { requirePermission } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondOk } from "@/server/http/respond";
import { completeAppointment } from "@/server/services/appointments";
import { AppError } from "@/shared/errors/app-error";
import { appointmentCompleteSchema } from "@/shared/validation/appointments";
import { idSchema } from "@/shared/validation/params";

type Context = { body: unknown; params: { id: string } };

// UC12 FA01: staff with the appointments permission (RS008).
export const POST = handleRoute(async ({ body, params }: Context) => {
  await requirePermission("appointments");
  const id = idSchema.safeParse(params.id);
  if (!id.success) {
    throw new AppError("NOT_FOUND");
  }
  const { paymentMethod } = appointmentCompleteSchema.parse(body);
  return respondOk(
    await completeAppointment(id.data, paymentMethod, new Date()),
  );
});
