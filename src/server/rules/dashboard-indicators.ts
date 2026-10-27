import type { Dashboard } from "@/shared/api/dashboard";
import {
  APPOINTMENT_STATUSES,
  type AppointmentStatus,
} from "@/shared/constants/appointment-statuses";
import { listCalendarDays, type CalendarPeriod } from "@/shared/format/date";

// The indicators of a period (UC09, RN021; docs/agendamento/calculos.md,
// section 5), worked out from the numbers the database aggregates.

// What the database gives (function dashboard_figures): the appointments of
// the period by status, by the scheduled day; and the revenue and the number
// of the paid ones by the day of completion.
export type DashboardFigures = {
  statusCounts: { status: AppointmentStatus; count: number }[];
  revenueByDay: { date: string; revenue: number; paidCount: number }[];
};

export type DashboardIndicators = Omit<Dashboard, "from" | "to" | "agenda">;

const CENTS_PER_REAL = 100;
const PERCENT_BASIS = 10_000;

// The integer division rounded half up, with no float: 5 cents over 2 is
// 3 cents (L3 of the plan of #51, as the total of RN012).
function divideHalfUp(dividend: number, divisor: number): number {
  return Math.floor((2 * dividend + divisor) / (2 * divisor));
}

export function buildIndicators(
  period: CalendarPeriod,
  { statusCounts, revenueByDay }: DashboardFigures,
): DashboardIndicators {
  const days = listCalendarDays(period);
  const centsByDay = new Map<string, number>();
  let paidCount = 0;
  for (const day of revenueByDay) {
    // A day outside the period is not part of it.
    if (!days.includes(day.date)) continue;
    centsByDay.set(day.date, Math.round(day.revenue * CENTS_PER_REAL));
    paidCount += day.paidCount;
  }
  const revenueCents = [...centsByDay.values()].reduce(
    (sum, cents) => sum + cents,
    0,
  );

  const countByStatus = new Map(
    statusCounts.map(({ status, count }) => [status, count]),
  );
  const appointmentsByStatus = APPOINTMENT_STATUSES.map((status) => ({
    status,
    count: countByStatus.get(status) ?? 0,
  }));
  const appointmentCount = appointmentsByStatus.reduce(
    (sum, { count }) => sum + count,
    0,
  );
  const cancelled = countByStatus.get("cancelled") ?? 0;

  return {
    revenue: revenueCents / CENTS_PER_REAL,
    appointmentCount,
    averageTicket:
      paidCount === 0
        ? 0
        : divideHalfUp(revenueCents, paidCount) / CENTS_PER_REAL,
    cancellationRate:
      appointmentCount === 0
        ? 0
        : divideHalfUp(cancelled * PERCENT_BASIS, appointmentCount) /
          CENTS_PER_REAL,
    revenueByDay: days.map((date) => ({
      date,
      revenue: (centsByDay.get(date) ?? 0) / CENTS_PER_REAL,
    })),
    appointmentsByStatus,
  };
}
