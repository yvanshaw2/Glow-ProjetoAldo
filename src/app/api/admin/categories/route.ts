import { requirePermission } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondCreated, respondPage } from "@/server/http/respond";
import { createCategory, listCategories } from "@/server/services/catalog";
import {
  categoryInputSchema,
  categoryListQuerySchema,
} from "@/shared/validation/catalog";

// UC15: staff with the services permission (RS008, RS010).
export const GET = handleRoute(async ({ request }) => {
  await requirePermission("services");
  const query = categoryListQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  const { categories, total } = await listCategories(query);
  return respondPage(categories, query, total);
});

export const POST = handleRoute(async ({ body }) => {
  await requirePermission("services");
  const input = categoryInputSchema.parse(body);
  return respondCreated(await createCategory(input));
});
