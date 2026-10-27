import { COMPANY_TIME_ZONE } from "@/shared/constants/time-zone";

// RN035, column Exibição, and RNF016: dates as 15/10/2026 and dates with the
// time as 15/10/2026 às 09:30. An instant (ISO 8601 with the offset, as the
// API sends it) shows in the company's time zone, whatever the zone of the
// device (decision 0053).

const LOCALE = "pt-BR";
// A calendar date, like the dashboard period, has no time zone: as an
// instant, 2026-10-01 is midnight in UTC, still 30/09 in Maceió.
const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const dateFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: COMPANY_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const yearFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: COMPANY_TIME_ZONE,
  year: "numeric",
});

const timeFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: COMPANY_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// en-CA writes the calendar day as 2026-10-21.
const calendarDateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: COMPANY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// The offset of the company's time zone at an instant, as GMT-03:00.
const offsetFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: COMPANY_TIME_ZONE,
  timeZoneName: "longOffset",
});

// A calendar date is read as midnight in UTC and written in UTC, so the day
// never moves.
const monthFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

const longDateFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatDate(value: string): string {
  const calendarDate = CALENDAR_DATE_PATTERN.exec(value);
  if (calendarDate) {
    const [, year, month, day] = calendarDate;
    return `${day}/${month}/${year}`;
  }
  return dateFormat.format(new Date(value));
}

// Intl joins the date and the time with a comma; RN035 joins them with "às".
export function formatDateTime(value: string): string {
  const instant = new Date(value);
  return `${dateFormat.format(instant)} às ${timeFormat.format(instant)}`;
}

// The year of an instant in the company's time zone, as in the copyright
// notice of the portal footer.
export function formatYear(value: string): string {
  return yearFormat.format(new Date(value));
}

// The calendar day of an instant in the company's time zone, as 2026-10-21:
// the day of the booking calendar.
export function formatCalendarDate(value: string): string {
  return calendarDateFormat.format(new Date(value));
}

// The time of an instant in the company's time zone, as 09:30.
export function formatTime(value: string): string {
  return timeFormat.format(new Date(value));
}

// The instant of a calendar day and a time (HH:MM) in the company's time
// zone, as the API takes it: ISO 8601 with the offset (docs/padroes/api.md).
// The offset comes from Intl, not from the code (decision 0053).
export function toCompanyInstant(date: string, time: string): string {
  const localAsUtc = new Date(`${date}T${time}:00Z`);
  return `${date}T${time}:00${readOffset(localAsUtc)}`;
}

// The month of a calendar day, as outubro de 2026.
export function formatMonth(date: string): string {
  return monthFormat.format(new Date(`${date}T00:00:00Z`));
}

// A calendar day as 05/10, the label of the axis of the revenue by day of the
// dashboard (UC09). It has no time zone, so the day never moves.
export function formatDayMonth(date: string): string {
  return date.replace(CALENDAR_DATE_PATTERN, "$3/$2");
}

// A calendar day in full, as quarta-feira, 28 de outubro de 2026: the name of
// a day of the booking calendar for a screen reader.
export function formatLongDate(date: string): string {
  return longDateFormat.format(new Date(`${date}T00:00:00Z`));
}

// Brazil has no daylight saving time since 2019 (decision 0053), so the
// offset near the local time is the offset at it. A zone at UTC writes only
// "GMT".
function readOffset(instant: Date): string {
  const zoneName = offsetFormat
    .formatToParts(instant)
    .find((part) => part.type === "timeZoneName")?.value;
  return !zoneName || zoneName === "GMT" ? "+00:00" : zoneName.slice(3);
}

// The instant the next day starts in the company's time zone, as the API
// takes it: the end of the day of `now` for the view "Hoje" of the panel
// (UC10, RF044). The day is read in the company's zone, so at 23h30 in Maceió
// (already the next day in UTC) it is still the same day.
export function startOfNextCompanyDay(now: Date): string {
  const [year, month, day] = formatCalendarDate(now.toISOString())
    .split("-")
    .map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return toCompanyInstant(next.toISOString().slice(0, 10), "00:00");
}

// UC09, RN035: the days of a period are calendar days, counted in days since
// 1970-01-01, so the arithmetic never meets a time change.
const MS_PER_DAY = 86_400_000;

function toDayNumber(day: string): number {
  return Date.parse(`${day}T00:00:00Z`) / MS_PER_DAY;
}

function fromDayNumber(dayNumber: number): string {
  return new Date(dayNumber * MS_PER_DAY).toISOString().slice(0, 10);
}

// A day written as 2026-10-01 that exists: 2026-02-30 is not one, although
// Date.parse moves it to the next month.
export function isCalendarDay(value: string): boolean {
  return (
    CALENDAR_DATE_PATTERN.test(value) &&
    !Number.isNaN(toDayNumber(value)) &&
    fromDayNumber(toDayNumber(value)) === value
  );
}

export function addCalendarDays(day: string, amount: number): string {
  return fromDayNumber(toDayNumber(day) + amount);
}

export type CalendarPeriod = { from: string; to: string };

// Both dates count; it is negative when the first one is after the last one.
export function countCalendarDays({ from, to }: CalendarPeriod): number {
  return toDayNumber(to) - toDayNumber(from) + 1;
}

export function listCalendarDays(period: CalendarPeriod): string[] {
  return Array.from({ length: countCalendarDays(period) }, (_, index) =>
    addCalendarDays(period.from, index),
  );
}

// The month of a day, from its first day to its last one.
export function findMonthPeriod(day: string): CalendarPeriod {
  const date = new Date(`${day}T00:00:00Z`);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  return {
    from: fromDayNumber(Date.UTC(year, month, 1) / MS_PER_DAY),
    // Day 0 of the next month is the last one of this month.
    to: fromDayNumber(Date.UTC(year, month + 1, 0) / MS_PER_DAY),
  };
}

// The instants a period of calendar days covers in the company's time zone:
// the start of the first day and the start of the day after the last one.
export function companyDayRange({ from, to }: CalendarPeriod): CalendarPeriod {
  return {
    from: toCompanyInstant(from, "00:00"),
    to: toCompanyInstant(addCalendarDays(to, 1), "00:00"),
  };
}
