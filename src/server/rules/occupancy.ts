import "server-only";
import type { BusinessDay } from "@/shared/api/settings";
import { listCalendarDays, type CalendarPeriod } from "@/shared/format/date";

// RN044 (docs/agendamento/calculos.md, section 7): the minutes available of a
// period for the occupancy of the schedule. Each day counts the minutes of its
// weekday in the current business hours, without the break (RN013), and zero
// when closed; the sum is multiplied by the simultaneous slots. The business
// hours keep no history, so a past period is measured by the current ones.

const MINUTES_PER_HOUR = 60;

// "08:30" is 510 minutes after midnight.
function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * MINUTES_PER_HOUR + minutes;
}

function minutesOf(day: BusinessDay | undefined): number {
  if (!day?.isOpen || day.opensAt === null || day.closesAt === null) {
    return 0;
  }
  const open = toMinutes(day.closesAt) - toMinutes(day.opensAt);
  const pause =
    day.breakStartsAt === null || day.breakEndsAt === null
      ? 0
      : toMinutes(day.breakEndsAt) - toMinutes(day.breakStartsAt);
  return open - pause;
}

// A calendar day has no time zone: read as midnight in UTC, its weekday is
// the one of the calendar (0 is Sunday).
function weekdayOf(day: string): number {
  return new Date(`${day}T00:00:00Z`).getUTCDay();
}

export function countAvailableMinutes(
  period: CalendarPeriod,
  businessHours: BusinessDay[],
  simultaneousSlots: number,
): number {
  const byWeekday = new Map(businessHours.map((day) => [day.weekday, day]));
  const minutes = listCalendarDays(period).reduce(
    (sum, day) => sum + minutesOf(byWeekday.get(weekdayOf(day))),
    0,
  );
  return minutes * simultaneousSlots;
}
