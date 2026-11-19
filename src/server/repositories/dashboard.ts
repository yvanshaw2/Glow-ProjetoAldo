import "server-only";
import type { DashboardDetailsFigures } from "@/server/rules/dashboard-details";
import type { DashboardFigures } from "@/server/rules/dashboard-indicators";
import { getServiceClient } from "@/server/supabase/clients";

// Functions dashboard_figures and dashboard_details (docs/agendamento/
// dados.md): the numbers of a period aggregated in the database, because a
// read stops at 1000 rows.

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

// RN040: the numbers of the detailed analysis between the two instants,
// [from, to), with the open appointments up to `openTo`, the end of the
// period shown.
export async function findDashboardDetails(
  from: string,
  to: string,
  openTo: string,
  timeZone: string,
): Promise<DashboardDetailsFigures> {
  const { data, error } = await getServiceClient().rpc("dashboard_details", {
    p_from: from,
    p_to: to,
    p_open_to: openTo,
    p_time_zone: timeZone,
  });
  if (error) {
    throw error;
  }
  return data as DashboardDetailsFigures;
}
