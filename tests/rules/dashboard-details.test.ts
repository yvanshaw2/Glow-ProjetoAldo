import { describe, expect, it } from "vitest";
import {
  buildDetails,
  type DashboardDetailsFigures,
} from "@/server/rules/dashboard-details";

// The indicators of the detailed analysis (RN040, docs/agendamento/
// calculos.md, section 7), worked out from the numbers the database
// aggregates.

const EMPTY: DashboardDetailsFigures = {
  services: [],
  categories: [],
  paidCount: 0,
  paidWithExtras: 0,
  vehicleTypes: [],
  scheduledSizes: [],
  paidSizes: [],
  payments: [],
  surcharges: 0,
  discounts: 0,
  channel: { client: 0, panel: 0 },
  clients: { total: 0, new: 0 },
  returns: 0,
  scheduledByWeekday: [],
  revenueByWeekday: [],
  hours: [],
  cancelledServices: [],
  open: { count: 0, total: 0 },
  leadTime: {
    count: 0,
    totalDays: 0,
    sameDay: 0,
    upToThree: 0,
    upToSeven: 0,
    overSeven: 0,
  },
};

describe("buildDetails", () => {
  it("keeps the five services of largest value and sums the others", () => {
    const details = buildDetails({
      ...EMPTY,
      services: [
        { name: "Lavagem simples", revenue: 600, count: 12 },
        { name: "Polimento técnico", revenue: 1800, count: 3 },
        { name: "Cera de carnaúba", revenue: 150, count: 5 },
        { name: "Lavagem completa", revenue: 900, count: 9 },
        { name: "Oxi-sanitização", revenue: 400, count: 4 },
        { name: "Higienização interna completa", revenue: 900, count: 3 },
        { name: "Pretinho nos pneus", revenue: 50.5, count: 10 },
      ],
    });
    expect(details.services.top).toEqual([
      { name: "Polimento técnico", revenue: 1800, count: 3 },
      { name: "Higienização interna completa", revenue: 900, count: 3 },
      { name: "Lavagem completa", revenue: 900, count: 9 },
      { name: "Lavagem simples", revenue: 600, count: 12 },
      { name: "Oxi-sanitização", revenue: 400, count: 4 },
    ]);
    expect(details.services.others).toEqual({ revenue: 200.5, count: 15 });
  });

  it("has no others with five services or fewer", () => {
    const details = buildDetails({
      ...EMPTY,
      services: [{ name: "Lavagem simples", revenue: 600, count: 12 }],
    });
    expect(details.services.others).toBeNull();
  });

  it("orders the categories by value and keeps the five cancelled services most present", () => {
    const details = buildDetails({
      ...EMPTY,
      categories: [
        { name: "Lavagem", revenue: 1500, count: 21 },
        { name: "Polimento", revenue: 1800, count: 3 },
      ],
      cancelledServices: [
        { name: "A", count: 1 },
        { name: "B", count: 4 },
        { name: "C", count: 2 },
        { name: "D", count: 2 },
        { name: "E", count: 3 },
        { name: "F", count: 1 },
      ],
    });
    expect(details.categories.map(({ name }) => name)).toEqual([
      "Polimento",
      "Lavagem",
    ]);
    expect(details.cancelledServices).toEqual([
      { name: "B", count: 4 },
      { name: "E", count: 3 },
      { name: "C", count: 2 },
      { name: "D", count: 2 },
      { name: "A", count: 1 },
    ]);
  });

  it("calculates the share of paid appointments with extras, half up", () => {
    expect(
      buildDetails({ ...EMPTY, paidCount: 3, paidWithExtras: 1 }).extrasRate,
    ).toBe(33.33);
    expect(
      buildDetails({ ...EMPTY, paidCount: 3, paidWithExtras: 2 }).extrasRate,
    ).toBe(66.67);
  });

  it("gives zero rates and tickets in a period with no paid appointments", () => {
    const details = buildDetails({
      ...EMPTY,
      scheduledSizes: [{ size: "medium", count: 2 }],
    });
    expect(details.extrasRate).toBe(0);
    expect(details.vehicleSizes).toContainEqual({
      size: "medium",
      count: 2,
      averageTicket: 0,
    });
  });

  it("fills every vehicle type, size and payment method", () => {
    const details = buildDetails({
      ...EMPTY,
      vehicleTypes: [{ type: "suv", count: 4 }],
      scheduledSizes: [{ size: "large", count: 4 }],
      paidSizes: [{ size: "large", paidCount: 3, paidRevenue: 1000 }],
      payments: [{ method: "pix", count: 3, revenue: 950 }],
    });
    expect(details.vehicleTypes).toEqual([
      { type: "hatch", count: 0 },
      { type: "sedan", count: 0 },
      { type: "suv", count: 4 },
      { type: "pickup", count: 0 },
    ]);
    expect(details.vehicleSizes).toEqual([
      { size: "small", count: 0, averageTicket: 0 },
      { size: "medium", count: 0, averageTicket: 0 },
      { size: "large", count: 4, averageTicket: 333.33 },
      { size: "extra_large", count: 0, averageTicket: 0 },
    ]);
    expect(details.payments).toEqual([
      { method: "credit", count: 0, revenue: 0 },
      { method: "debit", count: 0, revenue: 0 },
      { method: "pix", count: 3, revenue: 950 },
      { method: "cash", count: 0, revenue: 0 },
    ]);
  });

  it("keeps the surcharges apart from the discounts", () => {
    const details = buildDetails({ ...EMPTY, surcharges: 42.5, discounts: 18 });
    expect(details.surcharges).toBe(42.5);
    expect(details.discounts).toBe(18);
  });

  it("separates the new clients from the returning ones", () => {
    expect(
      buildDetails({ ...EMPTY, clients: { total: 40, new: 12 } }).clients,
    ).toEqual({ total: 40, new: 12, returning: 28 });
  });

  it("fills the seven weekdays from Monday and the hours with zero", () => {
    const details = buildDetails({
      ...EMPTY,
      scheduledByWeekday: [
        { weekday: 1, count: 5, cancelled: 1 },
        { weekday: 6, count: 3, cancelled: 0 },
      ],
      revenueByWeekday: [{ weekday: 1, revenue: 480 }],
      hours: [{ hour: 8, count: 2 }],
    });
    expect(details.weekdays.map(({ weekday }) => weekday)).toEqual([
      1, 2, 3, 4, 5, 6, 0,
    ]);
    expect(details.weekdays[0]).toEqual({
      weekday: 1,
      appointments: 5,
      cancelled: 1,
      revenue: 480,
    });
    expect(details.weekdays[6]).toEqual({
      weekday: 0,
      appointments: 0,
      cancelled: 0,
      revenue: 0,
    });
    expect(details.hours).toHaveLength(24);
    expect(details.hours[8]).toEqual({ hour: 8, count: 2 });
    expect(details.hours[9]).toEqual({ hour: 9, count: 0 });
  });

  it("works out the lead time with one place and keeps the bands", () => {
    const details = buildDetails({
      ...EMPTY,
      leadTime: {
        count: 3,
        totalDays: 14,
        sameDay: 1,
        upToThree: 1,
        upToSeven: 0,
        overSeven: 1,
      },
    });
    expect(details.leadTime).toEqual({
      averageDays: 4.7,
      sameDay: 1,
      upToThree: 1,
      upToSeven: 0,
      overSeven: 1,
    });
  });

  it("has no average lead time without appointments", () => {
    expect(buildDetails(EMPTY).leadTime.averageDays).toBeNull();
  });

  it("passes the channel, the returns and the open appointments on", () => {
    const details = buildDetails({
      ...EMPTY,
      channel: { client: 7, panel: 13 },
      returns: 2,
      open: { count: 6, total: 870 },
    });
    expect(details.channel).toEqual({ client: 7, panel: 13 });
    expect(details.returns).toBe(2);
    expect(details.open).toEqual({ count: 6, total: 870 });
  });
});
