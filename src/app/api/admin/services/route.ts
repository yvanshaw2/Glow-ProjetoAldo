import { requirePermission } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondCreated, respondPage } from "@/server/http/respond";
import { createService, listServices } from "@/server/services/catalog";
import {
  serviceInputSchema,
  serviceListQuerySchema,
} from "@/shared/validation/catalog";

// UC13 and UC14: staff with the services permission (RS008, RS010).
export const GET = handleRoute(async ({ request }) => {
  await requirePermission("services");
  const query = serviceListQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  const { services, total } = await listServices(query);
  return respondPage(services, query, total);
});

export const POST = handleRoute(async ({ body }) => {
  await requirePermission("services");
  const input = serviceInputSchema.parse(body);
  return respondCreated(await createService(input));
});
