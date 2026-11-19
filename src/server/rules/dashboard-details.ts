import type {
  DashboardDetails,
  DashboardNamedCount,
  DashboardNamedValue,
} from "@/shared/api/dashboard";
import {
  PAYMENT_METHODS,
  type PaymentMethod,
} from "@/shared/constants/payment-methods";
import {
  VEHICLE_SIZES,
  type VehicleSize,
} from "@/shared/constants/vehicle-sizes";
import {
  VEHICLE_TYPES,
  type VehicleType,
} from "@/shared/constants/vehicle-types";

// The indicators of the detailed analysis (RN040; docs/agendamento/
// calculos.md, section 7), worked out from the numbers the database
// aggregates (function dashboard_details): the five largest and the others,
// the rates and averages, and every weekday, hour, vehicle type, size and
// payment method, with zero where there is none.

// What the database gives for one period. Only the groups that exist come.
export type DashboardDetailsFigures = {
  // Of the paid appointments, by the name copied in the appointment.
  services: DashboardNamedValue[];
  // Of the paid appointments, by the current category of the service.
  categories: DashboardNamedValue[];
  paidCount: number;
  // Paid with at least one complementary or additional service.
  paidWithExtras: number;
  vehicleTypes: { type: VehicleType; count: number }[];
  scheduledSizes: { size: VehicleSize; count: number }[];
  paidSizes: { size: VehicleSize; paidCount: number; paidRevenue: number }[];
  payments: { method: PaymentMethod; count: number; revenue: number }[];
  surcharges: number;
  discounts: number;
  channel: { client: number; panel: number };
  clients: { total: number; new: number };
  returns: number;
  // weekday: 0 is Sunday, as the database and the business hours count.
  scheduledByWeekday: { weekday: number; count: number; cancelled: number }[];
  revenueByWeekday: { weekday: number; revenue: number }[];
  hours: { hour: number; count: number }[];
  cancelledServices: DashboardNamedCount[];
  open: { count: number; total: number };
  leadTime: {
    count: number;
    totalDays: number;
    sameDay: number;
    upToThree: number;
    upToSeven: number;
    overSeven: number;
  };
};

const TOP_SIZE = 5;
const CENTS_PER_REAL = 100;
const PERCENT_BASIS = 10_000;
const HOURS_PER_DAY = 24;
// RN040, item 9: from Monday to Sunday.
const WEEK_FROM_MONDAY = [1, 2, 3, 4, 5, 6, 0];

// The integer division rounded half up, with no float (RN012).
function divideHalfUp(dividend: number, divisor: number): number {
  return Math.floor((2 * dividend + divisor) / (2 * divisor));
}

function toCents(value: number): number {
  return Math.round(value * CENTS_PER_REAL);
}

function byValueThenName(
  first: DashboardNamedValue,
  second: DashboardNamedValue,
): number {
  return (
    second.revenue - first.revenue || first.name.localeCompare(second.name)
  );
}

function byCountThenName(
  first: DashboardNamedCount,
  second: DashboardNamedCount,
): number {
  return second.count - first.count || first.name.localeCompare(second.name);
}

export function buildDetails(
  figures: DashboardDetailsFigures,
): DashboardDetails {
  const services = [...figures.services].sort(byValueThenName);
  const rest = services.slice(TOP_SIZE);
  const sizeCounts = new Map(
    figures.scheduledSizes.map(({ size, count }) => [size, count]),
  );
  const paidBySize = new Map(
    figures.paidSizes.map((paid) => [paid.size, paid]),
  );
  const typeCounts = new Map(
    figures.vehicleTypes.map(({ type, count }) => [type, count]),
  );
  const payments = new Map(
    figures.payments.map((payment) => [payment.method, payment]),
  );
  const scheduledByWeekday = new Map(
    figures.scheduledByWeekday.map((day) => [day.weekday, day]),
  );
  const revenueByWeekday = new Map(
    figures.revenueByWeekday.map(({ weekday, revenue }) => [weekday, revenue]),
  );
  const hours = new Map(figures.hours.map(({ hour, count }) => [hour, count]));
  const { leadTime } = figures;

  return {
    services: {
      top: services.slice(0, TOP_SIZE),
      others:
        rest.length === 0
          ? null
          : {
              revenue:
                rest.reduce((sum, { revenue }) => sum + toCents(revenue), 0) /
                CENTS_PER_REAL,
              count: rest.reduce((sum, { count }) => sum + count, 0),
            },
    },
    categories: [...figures.categories].sort(byValueThenName),
    extrasRate:
      figures.paidCount === 0
        ? 0
        : divideHalfUp(
            figures.paidWithExtras * PERCENT_BASIS,
            figures.paidCount,
          ) / CENTS_PER_REAL,
    vehicleTypes: VEHICLE_TYPES.map((type) => ({
      type,
      count: typeCounts.get(type) ?? 0,
    })),
    vehicleSizes: VEHICLE_SIZES.map((size) => {
      const paid = paidBySize.get(size);
      return {
        size,
        count: sizeCounts.get(size) ?? 0,
        averageTicket:
          !paid || paid.paidCount === 0
            ? 0
            : divideHalfUp(toCents(paid.paidRevenue), paid.paidCount) /
              CENTS_PER_REAL,
      };
    }),
    payments: PAYMENT_METHODS.map((method) => ({
      method,
      count: payments.get(method)?.count ?? 0,
      revenue: payments.get(method)?.revenue ?? 0,
    })),
    surcharges: figures.surcharges,
    discounts: figures.discounts,
    channel: figures.channel,
    clients: {
      total: figures.clients.total,
      new: figures.clients.new,
      returning: figures.clients.total - figures.clients.new,
    },
    returns: figures.returns,
    weekdays: WEEK_FROM_MONDAY.map((weekday) => ({
      weekday,
      appointments: scheduledByWeekday.get(weekday)?.count ?? 0,
      cancelled: scheduledByWeekday.get(weekday)?.cancelled ?? 0,
      revenue: revenueByWeekday.get(weekday) ?? 0,
    })),
    hours: Array.from({ length: HOURS_PER_DAY }, (_, hour) => ({
      hour,
      count: hours.get(hour) ?? 0,
    })),
    cancelledServices: [...figures.cancelledServices]
      .sort(byCountThenName)
      .slice(0, TOP_SIZE),
    open: figures.open,
    leadTime: {
      // Days with one place: tenths rounded half up.
      averageDays:
        leadTime.count === 0
          ? null
          : divideHalfUp(leadTime.totalDays * 10, leadTime.count) / 10,
      sameDay: leadTime.sameDay,
      upToThree: leadTime.upToThree,
      upToSeven: leadTime.upToSeven,
      overSeven: leadTime.overSeven,
    },
  };
}
