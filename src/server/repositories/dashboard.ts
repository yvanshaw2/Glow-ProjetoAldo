import "server-only";
import type { DashboardFigures } from "@/server/rules/dashboard-indicators";
import { getServiceClient } from "@/server/supabase/clients";

// Function dashboard_figures (docs/agendamento/dados.md): the appointments of
// a period by status and the revenue by day, aggregated in the database
// because a read stops at 1000 rows.

// Between the two instants, [from, to), with the days of the revenue read in
// the time zone.
export async function findDashboardFigures(
  from: string,
  to: string,
  timeZone: string,
): Promise<DashboardFigures> {
  const { data, error } = await getServiceClient().rpc("dashboard_figures", {
    p_from: from,
    p_to: to,
    p_time_zone: timeZone,
  });
  if (error) {
    throw error;
  }
  return data as DashboardFigures;
}
