import { requireClient } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondCreated } from "@/server/http/respond";
import { createMyAppointment } from "@/server/services/appointments";
import { myAppointmentInputSchema } from "@/shared/validation/appointments";

// UC06 steps 12 and 13: the client is the one of the session, never of the
// body (RS009).
export const POST = handleRoute(async ({ body }) => {
  const account = await requireClient();
  const input = myAppointmentInputSchema.parse(body);
  return respondCreated(
    await createMyAppointment(account.id, input, new Date()),
  );
});
