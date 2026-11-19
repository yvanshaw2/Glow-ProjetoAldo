import { requireClient } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondOk } from "@/server/http/respond";
import { cancelMyAppointment } from "@/server/services/appointments";
import { AppError } from "@/shared/errors/app-error";
import { myAppointmentCancelSchema } from "@/shared/validation/appointments";
import { idSchema } from "@/shared/validation/params";

type Context = { body: unknown; params: { id: string } };

// UC07 FA01: the client cancels a scheduled appointment of theirs (RN019,
// RS009), with one of the reasons of the client (RN041). An id that is not a
// UUID gets the 404 of a missing appointment.
export const POST = handleRoute(async ({ body, params }: Context) => {
  const account = await requireClient();
  const id = idSchema.safeParse(params.id);
  if (!id.success) {
    throw new AppError("NOT_FOUND");
  }
  const input = myAppointmentCancelSchema.parse(body);
  return respondOk(
    await cancelMyAppointment(account.id, id.data, input, new Date()),
  );
});
