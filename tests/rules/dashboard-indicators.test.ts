import { describe, expect, it } from "vitest";
import {
  buildIndicators,
  type DashboardFigures,
} from "@/server/rules/dashboard-indicators";
import { APPOINTMENT_STATUSES } from "@/shared/constants/appointment-statuses";

// The indicators of a period (UC09, RN021, docs/agendamento/calculos.md,
// section 5), worked out from the numbers the database aggregates.

const OCTOBER = { from: "2026-10-01", to: "2026-10-31" };
const EMPTY: DashboardFigures = { statusCounts: [], revenueByDay: [] };

function figures(
  paid: { date: string; revenue: number; paidCount: number }[],
  counts: Partial<Record<(typeof APPOINTMENT_STATUSES)[number], number>>,
): DashboardFigures {
  return {
    statusCounts: Object.entries(counts).map(([status, count]) => ({
      status: status as (typeof APPOINTMENT_STATUSES)[number],
      count,
    })),
    revenueByDay: paid,
  };
}

describe("buildIndicators", () => {
  it("sums the revenue of the days and counts every status", () => {
    const result = buildIndicators(
      OCTOBER,
      figures(
        [
          { date: "2026-10-05", revenue: 300, paidCount: 2 },
          { date: "2026-10-06", revenue: 150.5, paidCount: 1 },
        ],
        { completed: 2, rescheduled: 1, cancelled: 1, scheduled: 4 },
      ),
    );
    expect(result.revenue).toBe(450.5);
    expect(result.appointmentCount).toBe(8);
  });

  it("gives the average ticket as the revenue over the paid, half a cent up", () => {
    const ticket = (revenue: number, paidCount: number) =>
      buildIndicators(
        OCTOBER,
        figures([{ date: "2026-10-05", revenue, paidCount }], {
          completed: paidCount,
        }),
      ).averageTicket;
    expect(ticket(1000, 3)).toBe(333.33);
    expect(ticket(10, 8)).toBe(1.25);
    expect(ticket(0.05, 2)).toBe(0.03);
  });

  it("gives the average ticket zero with no paid appointment", () => {
    expect(
      buildIndicators(OCTOBER, figures([], { cancelled: 2 })).averageTicket,
    ).toBe(0);
  });

  it("gives the cancellation rate over the total, with two decimals", () => {
    const rate = (cancelled: number, total: number) =>
      buildIndicators(
        OCTOBER,
        figures([], { cancelled, scheduled: total - cancelled }),
      ).cancellationRate;
    expect(rate(1, 3)).toBe(33.33);
    expect(rate(2, 3)).toBe(66.67);
    expect(rate(1, 8)).toBe(12.5);
    expect(rate(0, 5)).toBe(0);
    expect(rate(5, 5)).toBe(100);
  });

  it("gives the cancellation rate zero with no appointment", () => {
    expect(buildIndicators(OCTOBER, EMPTY).cancellationRate).toBe(0);
  });

  it("lists every day of the period, with 0 on the days without revenue", () => {
    const { revenueByDay } = buildIndicators(
      { from: "2026-10-30", to: "2026-11-02" },
      figures([{ date: "2026-11-01", revenue: 80, paidCount: 1 }], {
        completed: 1,
      }),
    );
    expect(revenueByDay).toEqual([
      { date: "2026-10-30", revenue: 0 },
      { date: "2026-10-31", revenue: 0 },
      { date: "2026-11-01", revenue: 80 },
      { date: "2026-11-02", revenue: 0 },
    ]);
  });

  it("lists the seven statuses in the order of RN017, with 0 on the absent ones", () => {
    const { appointmentsByStatus } = buildIndicators(
      OCTOBER,
      figures([], { cancelled: 2, scheduled: 1 }),
    );
    expect(appointmentsByStatus).toEqual([
      { status: "scheduled", count: 1 },
      { status: "checked_in", count: 0 },
      { status: "in_progress", count: 0 },
      { status: "awaiting_payment", count: 0 },
      { status: "completed", count: 0 },
      { status: "cancelled", count: 2 },
      { status: "rescheduled", count: 0 },
    ]);
  });

  it("gives zeros and the full lists for an empty period", () => {
    const result = buildIndicators(OCTOBER, EMPTY);
    expect(result).toMatchObject({
      revenue: 0,
      appointmentCount: 0,
      averageTicket: 0,
      cancellationRate: 0,
    });
    expect(result.revenueByDay).toHaveLength(31);
    expect(result.appointmentsByStatus).toHaveLength(7);
  });

  it("ignores the revenue of a day outside the period", () => {
    const result = buildIndicators(
      OCTOBER,
      figures([{ date: "2026-09-30", revenue: 500, paidCount: 1 }], {}),
    );
    expect(result.revenue).toBe(0);
    expect(result.averageTicket).toBe(0);
  });
});
