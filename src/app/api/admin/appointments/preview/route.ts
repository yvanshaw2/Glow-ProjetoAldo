import { requirePermission } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondOk } from "@/server/http/respond";
import { previewAppointment } from "@/server/services/appointments";
import { appointmentPreviewSchema } from "@/shared/validation/appointments";

// UC11 step 6: only works out, nothing is saved.
export const POST = handleRoute(async ({ body }) => {
  await requirePermission("appointments");
  const input = appointmentPreviewSchema.parse(body);
  return respondOk(await previewAppointment(input));
});
