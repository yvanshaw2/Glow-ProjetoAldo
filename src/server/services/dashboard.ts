import "server-only";
import { listAppointmentsBetween } from "@/server/repositories/appointments";
import { findDashboardFigures } from "@/server/repositories/dashboard";
import {
  buildIndicators,
  type DashboardIndicators,
} from "@/server/rules/dashboard-indicators";
import type { Dashboard } from "@/shared/api/dashboard";
import { COMPANY_TIME_ZONE } from "@/shared/constants/time-zone";
import {
  companyDayRange,
  findMonthPeriod,
  formatCalendarDate,
  type CalendarPeriod,
} from "@/shared/format/date";
import type { DashboardPeriodQuery } from "@/shared/validation/dashboard";

// Module dashboard (docs/agendamento/): the indicators and the agenda of the
// day (UC09).

// RN021: the indicators of a period of calendar days in the company's time
// zone. The analysis (UC27) also asks for them, for the period and the
// previous one.
export async function calculateIndicators(
  period: CalendarPeriod,
): Promise<DashboardIndicators> {
  const { from, to } = companyDayRange(period);
  const figures = await findDashboardFigures(from, to, COMPANY_TIME_ZONE);
  return buildIndicators(period, figures);
}

// RN035: with no dates, the current month of the company's time zone.
export async function getDashboard(
  query: DashboardPeriodQuery,
  now: Date,
): Promise<Dashboard> {
  const today = formatCalendarDate(now.toISOString());
  const period: CalendarPeriod =
    query.from === undefined || query.to === undefined
      ? findMonthPeriod(today)
      : { from: query.from, to: query.to };
  const day = companyDayRange({ from: today, to: today });
  const [indicators, agenda] = await Promise.all([
    calculateIndicators(period),
    listAppointmentsBetween(day.from, day.to),
  ]);
  return { ...period, ...indicators, agenda };
}
