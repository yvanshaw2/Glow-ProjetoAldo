import "server-only";
import type { AppointmentStatus } from "@/shared/constants/appointment-statuses";
import { countCalendarDays, formatCalendarDate } from "@/shared/format/date";

// RN043 (UC28): the client rates, once, an appointment of theirs with the
// status Concluído or Reagendado, up to 30 days after the completion, counted
// by the calendar dates in the time zone of the company. Whose appointment it
// is, the service checks (RS009).

const REVIEW_DAYS = 30;

const REVIEWABLE_STATUSES: readonly AppointmentStatus[] = [
  "completed",
  "rescheduled",
];

export type ReviewRefusal = "NOT_COMPLETED" | "ALREADY_REVIEWED" | "EXPIRED";

export type ReviewedAppointment = {
  status: AppointmentStatus;
  completedAt: string | null;
  rating: number | null;
};

// Null when the client can rate it; `today` is the calendar date of the
// company, as 2026-10-31.
export function findReviewRefusal(
  { status, completedAt, rating }: ReviewedAppointment,
  today: string,
): ReviewRefusal | null {
  if (!REVIEWABLE_STATUSES.includes(status) || completedAt === null) {
    return "NOT_COMPLETED";
  }
  if (rating !== null) {
    return "ALREADY_REVIEWED";
  }
  // The day of the completion counts as day 0.
  const elapsed =
    countCalendarDays({ from: formatCalendarDate(completedAt), to: today }) - 1;
  return elapsed > REVIEW_DAYS ? "EXPIRED" : null;
}
