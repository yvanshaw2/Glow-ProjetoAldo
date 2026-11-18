import { requireClient } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondCreated } from "@/server/http/respond";
import { rescheduleMyAppointment } from "@/server/services/appointments";
import { AppError } from "@/shared/errors/app-error";
import { appointmentRescheduleSchema } from "@/shared/validation/appointments";
import { idSchema } from "@/shared/validation/params";

type Context = { body: unknown; params: { id: string } };

// UC25: the client reschedules a completed appointment of theirs (RN020,
// RS009); no staff member is recorded.
export const POST = handleRoute(async ({ body, params }: Context) => {
  const account = await requireClient();
  const id = idSchema.safeParse(params.id);
  if (!id.success) {
    throw new AppError("NOT_FOUND");
  }
  const input = appointmentRescheduleSchema.parse(body);
  return respondCreated(
    await rescheduleMyAppointment(account.id, id.data, input, new Date()),
  );
});
