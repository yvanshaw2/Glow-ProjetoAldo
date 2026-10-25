import type { BusinessDay } from "@/shared/api/settings";
import { TIME_SLOT_MINUTES } from "@/shared/constants/time-slot";

// The values of the form of the availability (docs/configuracoes/
// configuracoes-do-painel.md). A closed day or a day with no break keeps the
// times of the fields, so reopening it brings them back.

export type DayFormValues = {
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
  hasBreak: boolean;
  breakStartsAt: string;
  breakEndsAt: string;
};

export type AvailabilityFormValues = { days: DayFormValues[] };

const DEFAULT_OPENS_AT = "08:00";
const DEFAULT_CLOSES_AT = "18:00";
const DEFAULT_BREAK_STARTS_AT = "12:00";
const DEFAULT_BREAK_ENDS_AT = "13:00";
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

// RN035: every hour and half hour of the day, from 00:00 to 23:30.
export const TIME_OPTIONS: { value: string; label: string }[] = Array.from(
  { length: MINUTES_PER_DAY / TIME_SLOT_MINUTES },
  (_, index) => {
    const minutes = index * TIME_SLOT_MINUTES;
    const hour = String(Math.floor(minutes / MINUTES_PER_HOUR)).padStart(
      2,
      "0",
    );
    const minute = String(minutes % MINUTES_PER_HOUR).padStart(2, "0");
    return { value: `${hour}:${minute}`, label: `${hour}:${minute}` };
  },
);

// The seven days, in the order of the weekdays, from Sunday.
export function toFormValues(days: BusinessDay[]): AvailabilityFormValues {
  return {
    days: [...days]
      .sort((first, second) => first.weekday - second.weekday)
      .map((day) => ({
        isOpen: day.isOpen,
        opensAt: day.opensAt ?? DEFAULT_OPENS_AT,
        closesAt: day.closesAt ?? DEFAULT_CLOSES_AT,
        hasBreak: day.breakStartsAt !== null && day.breakEndsAt !== null,
        breakStartsAt: day.breakStartsAt ?? DEFAULT_BREAK_STARTS_AT,
        breakEndsAt: day.breakEndsAt ?? DEFAULT_BREAK_ENDS_AT,
      })),
  };
}

// The body of PUT /api/admin/settings/business-hours: a closed day, or a day
// with no break, sends no times for them.
export function toRequestBody({ days }: AvailabilityFormValues): BusinessDay[] {
  return days.map((day, weekday) => ({
    weekday,
    isOpen: day.isOpen,
    opensAt: day.isOpen ? day.opensAt : null,
    closesAt: day.isOpen ? day.closesAt : null,
    breakStartsAt: day.isOpen && day.hasBreak ? day.breakStartsAt : null,
    breakEndsAt: day.isOpen && day.hasBreak ? day.breakEndsAt : null,
  }));
}
