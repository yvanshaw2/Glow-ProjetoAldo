import { requirePermission } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondCreated, respondPage } from "@/server/http/respond";
import { createRole, listRoles } from "@/server/services/roles";
import {
  roleInputSchema,
  roleListQuerySchema,
} from "@/shared/validation/staff";

// UC21: staff with the staff permission (RS008, RS010).
export const GET = handleRoute(async ({ request }) => {
  await requirePermission("staff");
  const query = roleListQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  const { roles, total } = await listRoles(query);
  return respondPage(roles, query, total);
});

export const POST = handleRoute(async ({ body }) => {
  await requirePermission("staff");
  const input = roleInputSchema.parse(body);
  return respondCreated(await createRole(input));
});
