import { requirePermission } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondCreated, respondPage } from "@/server/http/respond";
import { createClient, listClients } from "@/server/services/clients";
import {
  clientInputSchema,
  clientListQuerySchema,
} from "@/shared/validation/clients";

// UC16 and UC17: staff with the clients permission (RS008, RS010).
export const GET = handleRoute(async ({ request }) => {
  await requirePermission("clients");
  const query = clientListQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  const { clients, total } = await listClients(query);
  return respondPage(clients, query, total);
});

export const POST = handleRoute(async ({ body }) => {
  await requirePermission("clients");
  const input = clientInputSchema.parse(body);
  return respondCreated(await createClient(input));
});
