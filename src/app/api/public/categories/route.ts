import { handleRoute } from "@/server/http/handler";
import { respondOk } from "@/server/http/respond";
import { listPublicCategories } from "@/server/services/catalog";

// UC01: public route, the categories of the catalog filter.
export const GET = handleRoute(async () =>
  respondOk(await listPublicCategories()),
);
