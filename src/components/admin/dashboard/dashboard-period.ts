// UC09, RN035: the period of the dashboard, as calendar days (2026-10-01), and
// the shortcuts of the selector (docs/agendamento/dashboard-do-painel.md).
// "Today" is the calendar day in the company's time zone, given by the caller,
// so these functions read no clock.

import {
  addCalendarDays,
  findMonthPeriod,
  type CalendarPeriod,
} from "@/shared/format/date";

export type Period = CalendarPeriod;

export const PERIOD_PRESETS = [
  { id: "month", label: "Este mês" },
  { id: "today", label: "Hoje" },
  { id: "week", label: "7 dias" },
  { id: "thirtyDays", label: "30 dias" },
] as const;

export type PeriodPreset = (typeof PERIOD_PRESETS)[number]["id"];

const WEEK_DAYS = 7;
const THIRTY_DAYS = 30;

// The last days, counting today.
function findLastDays(today: string, count: number): Period {
  return { from: addCalendarDays(today, 1 - count), to: today };
}

const PRESET_PERIODS = {
  month: findMonthPeriod,
  today: (today) => ({ from: today, to: today }),
  week: (today) => findLastDays(today, WEEK_DAYS),
  thirtyDays: (today) => findLastDays(today, THIRTY_DAYS),
} as const satisfies Record<PeriodPreset, (today: string) => Period>;

export function findPresetPeriod(preset: PeriodPreset, today: string): Period {
  return PRESET_PERIODS[preset](today);
}

export function isSamePeriod(first: Period | null, second: Period | null) {
  return (
    first !== null &&
    second !== null &&
    first.from === second.from &&
    first.to === second.to
  );
}
