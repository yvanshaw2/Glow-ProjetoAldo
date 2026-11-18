import { requireClient } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondOk } from "@/server/http/respond";
import { getProfile, updateProfile } from "@/server/services/clients";
import { clientUpdateSchema } from "@/shared/validation/clients";

// UC04: the account of the session; the id never comes from the request
// (RS009).
export const GET = handleRoute(async () => {
  const account = await requireClient();
  return respondOk(await getProfile(account.id));
});

export const PATCH = handleRoute(async ({ body }) => {
  const account = await requireClient();
  const update = clientUpdateSchema.parse(body);
  return respondOk(await updateProfile(account.id, update));
});
