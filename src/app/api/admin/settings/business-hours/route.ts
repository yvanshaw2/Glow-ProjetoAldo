import { requirePermission } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondOk } from "@/server/http/respond";
import {
  getBusinessHours,
  updateBusinessHours,
} from "@/server/services/settings";
import { businessHoursSchema } from "@/shared/validation/settings";

// UC23: staff with the settings permission (RS008, RS010).
export const GET = handleRoute(async () => {
  await requirePermission("settings");
  return respondOk(await getBusinessHours());
});

export const PUT = handleRoute(async ({ body }) => {
  await requirePermission("settings");
  const input = businessHoursSchema.parse(body);
  return respondOk(await updateBusinessHours(input));
});
