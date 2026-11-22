import { requireClient } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondCreated } from "@/server/http/respond";
import { reviewMyAppointment } from "@/server/services/appointments";
import { AppError } from "@/shared/errors/app-error";
import { myAppointmentReviewSchema } from "@/shared/validation/appointments";
import { idSchema } from "@/shared/validation/params";

type Context = { body: unknown; params: { id: string } };

// UC28, RN043: the client rates, once, a completed appointment of theirs
// (RS009). An id that is not a UUID gets the 404 of a missing appointment.
export const POST = handleRoute(async ({ body, params }: Context) => {
  const account = await requireClient();
  const id = idSchema.safeParse(params.id);
  if (!id.success) {
    throw new AppError("NOT_FOUND");
  }
  const input = myAppointmentReviewSchema.parse(body);
  return respondCreated(
    await reviewMyAppointment(account.id, id.data, input, new Date()),
  );
});
