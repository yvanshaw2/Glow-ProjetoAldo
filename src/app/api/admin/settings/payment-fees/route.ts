import { requirePermission } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondOk } from "@/server/http/respond";
import { getPaymentFees, updatePaymentFees } from "@/server/services/settings";
import { paymentFeesSchema } from "@/shared/validation/settings";

// UC24: staff with the settings permission (RS008, RS010).
export const GET = handleRoute(async () => {
  await requirePermission("settings");
  return respondOk(await getPaymentFees());
});

export const PUT = handleRoute(async ({ body }) => {
  await requirePermission("settings");
  const fees = paymentFeesSchema.parse(body);
  return respondOk(await updatePaymentFees(fees));
});
