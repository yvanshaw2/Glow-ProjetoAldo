import { requirePermission } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondOk } from "@/server/http/respond";
import { generateDashboardAnalysis } from "@/server/services/dashboard";
import { dashboardAnalysisSchema } from "@/shared/validation/dashboard";

// UC27: staff with the dashboard permission (RS008, RS019). A POST because it
// is an action with a cost that is never repeated; nothing is saved.
export const POST = handleRoute(async ({ body }) => {
  await requirePermission("dashboard");
  const input = dashboardAnalysisSchema.parse(body);
  return respondOk(await generateDashboardAnalysis(input, new Date()));
});
