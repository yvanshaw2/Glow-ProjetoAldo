import { handleRoute } from "@/server/http/handler";
import { respondPage } from "@/server/http/respond";
import { listPublicServices } from "@/server/services/catalog";
import { publicServiceQuerySchema } from "@/shared/validation/catalog";

// UC01: public route (RN008, RN031).
export const GET = handleRoute(async ({ request }) => {
  const query = publicServiceQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  const { services, total } = await listPublicServices(query);
  return respondPage(services, query, total);
});
