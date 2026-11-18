import { requireClient } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondOk } from "@/server/http/respond";
import { previewMyAppointment } from "@/server/services/appointments";
import { appointmentPreviewSchema } from "@/shared/validation/appointments";

// UC06 steps 6, 8 and 11: only works out, nothing is saved.
export const POST = handleRoute(async ({ body }) => {
  const account = await requireClient();
  const input = appointmentPreviewSchema.parse(body);
  return respondOk(await previewMyAppointment(account.id, input));
});
