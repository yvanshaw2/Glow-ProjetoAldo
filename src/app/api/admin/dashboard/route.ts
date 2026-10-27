import { requirePermission } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondOk } from "@/server/http/respond";
import { getDashboard } from "@/server/services/dashboard";
import { dashboardPeriodQuerySchema } from "@/shared/validation/dashboard";

// UC09: staff with the dashboard permission (RS008).
export const GET = handleRoute(async ({ request }) => {
  await requirePermission("dashboard");
  const query = dashboardPeriodQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  return respondOk(await getDashboard(query, new Date()));
});
