import type {
  AppointmentService,
  AppointmentVehicle,
} from "@/shared/api/appointments";
import type { AppointmentStatus } from "@/shared/constants/appointment-statuses";
import type { DashboardIndicator } from "@/shared/constants/dashboard-indicators";
import type { DashboardSection } from "@/shared/constants/dashboard-sections";
import type { PaymentMethod } from "@/shared/constants/payment-methods";
import type { VehicleSize } from "@/shared/constants/vehicle-sizes";
import type { VehicleType } from "@/shared/constants/vehicle-types";

// Bodies of the dashboard routes in docs/agendamento/rotas.md (UC09, UC27).
// The dates of a period are calendar days (2026-10-01) and the instants are
// ISO 8601.

// The revenue of one day (RF041), by the day of completion (RN021).
export type DashboardRevenueDay = {
  date: string;
  revenue: number;
};

// The appointments of the period with one status (RF042).
export type DashboardStatusCount = {
  status: AppointmentStatus;
  count: number;
};

// One appointment of the day (RF043), with the data copied in it (RN037).
export type DashboardAgendaItem = {
  id: string;
  status: AppointmentStatus;
  scheduledAt: string;
  // RN034
  estimatedEndAt: string;
  clientName: string;
  vehicle: Pick<AppointmentVehicle, "plate" | "brand" | "model">;
  services: Pick<AppointmentService, "id" | "name">[];
  total: number;
};

// GET /api/admin/dashboard
export type Dashboard = {
  // The period applied, which is the current month when none was asked.
  from: string;
  to: string;
  // RN021: the appointments Concluído and Reagendado, by the day of completion.
  revenue: number;
  // RN021: the appointments of the period, of any status, by the scheduled day.
  appointmentCount: number;
  // RN021: zero when no appointment was paid.
  averageTicket: number;
  // RN021: from 0 to 100.
  cancellationRate: number;
  // Every day of the period, with 0 on the days without revenue.
  revenueByDay: DashboardRevenueDay[];
  // The seven statuses, in the order of RN017.
  appointmentsByStatus: DashboardStatusCount[];
  // The appointments scheduled for the current day, by time.
  agenda: DashboardAgendaItem[];
};

// One observation of the analysis, about one of the indicators (RN039).
export type DashboardAnalysisHighlight = {
  indicator: DashboardIndicator;
  comment: string;
};

// The analysis types (RF091): the summary and the detailed one.
export type DashboardAnalysisDetail = "summary" | "detailed";

// The indicators compared with the previous period (RF092).
export type DashboardComparedIndicator =
  "revenue" | "appointmentCount" | "averageTicket" | "cancellationRate";

// One indicator of the period next to the previous one, as the system works
// it out: the variation is a percentage with one place, or points in the
// cancellation rate; null without a previous value (docs/agendamento/
// calculos.md, section 6).
export type DashboardComparisonValue = {
  current: number;
  previous: number | null;
  variation: number | null;
};

export type DashboardComparison = Record<
  DashboardComparedIndicator,
  DashboardComparisonValue
>;

// One position of the revenue of the two periods: a day, or a block of seven
// days from the first one in periods over 62 days (RN038). The previous period
// is null without a comparison or where it is shorter.
export type DashboardRevenuePoint = {
  currentStart: string;
  currentRevenue: number;
  previousStart: string | null;
  previousRevenue: number | null;
};

export type DashboardRevenueSeries = {
  unit: "day" | "week";
  points: DashboardRevenuePoint[];
};

// A name with a value and a count, as the services and categories of the
// detailed analysis (RN040).
export type DashboardNamedValue = {
  name: string;
  revenue: number;
  count: number;
};

export type DashboardNamedCount = { name: string; count: number };

// RN040: the indicators of one period for the detailed analysis, worked out
// by the system (docs/agendamento/calculos.md, section 7). The weekdays go
// from Monday (1) to Sunday (0), and the hours from 0 to 23.
export type DashboardDetails = {
  services: {
    top: DashboardNamedValue[];
    // The others summed, as "Demais"; null with five services or fewer.
    others: { revenue: number; count: number } | null;
  };
  categories: DashboardNamedValue[];
  // Percent of the paid appointments with a complementary or additional one.
  extrasRate: number;
  vehicleTypes: { type: VehicleType; count: number }[];
  vehicleSizes: { size: VehicleSize; count: number; averageTicket: number }[];
  payments: { method: PaymentMethod; count: number; revenue: number }[];
  surcharges: number;
  discounts: number;
  channel: { client: number; panel: number };
  clients: { total: number; new: number; returning: number };
  returns: number;
  weekdays: {
    weekday: number;
    appointments: number;
    cancelled: number;
    revenue: number;
  }[];
  hours: { hour: number; count: number }[];
  cancelledServices: DashboardNamedCount[];
  // Of the whole period shown, which may go beyond the days analyzed.
  open: { count: number; total: number };
  leadTime: {
    // Days with one place; null without appointments.
    averageDays: number | null;
    sameDay: number;
    upToThree: number;
    upToSeven: number;
    overSeven: number;
  };
};

// One section of the detailed analysis, with one to three observations
// (RN039).
export type DashboardAnalysisSection = {
  section: DashboardSection;
  observations: string[];
};

// POST /api/admin/dashboard/analysis (UC27): the text only interprets the
// indicators, and every number comes from the system (RN039).
export type DashboardAnalysis = {
  from: string;
  to: string;
  // RN038: the last day analyzed, `to` or the current day, the earlier one.
  analyzedTo: string;
  // RN038: the previous period, by the calendar.
  previousFrom: string;
  previousTo: string;
  // False when the previous period has no appointments (UC27 FA03).
  hasComparison: boolean;
  detail: DashboardAnalysisDetail;
  // The version of the instructions that wrote the text.
  promptVersion: string;
  summary: string;
  highlights: DashboardAnalysisHighlight[];
  comparison: DashboardComparison;
  revenueSeries: DashboardRevenueSeries;
  // Only in the detailed analysis (RF091); null in the summary.
  details: DashboardDetails | null;
  sections: DashboardAnalysisSection[] | null;
  recommendations: string[] | null;
  generatedAt: string;
};
