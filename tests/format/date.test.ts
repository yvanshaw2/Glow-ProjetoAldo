import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  companyDayRange,
  countCalendarDays,
  findMonthPeriod,
  formatCalendarDate,
  formatDate,
  formatDateTime,
  formatDayMonth,
  formatLongDate,
  formatMonth,
  formatTime,
  formatYear,
  listCalendarDays,
  startOfNextCompanyDay,
  toCompanyInstant,
} from "@/shared/format/date";

// Display of the dates of RN035 (column Exibição) and RNF016, in the company's
// time zone, America/Maceio (UTC-3), whatever the zone of the device
// (decision 0053). A calendar date has no time zone and shows as it is. The
// booking (UC06) reads the day and the time of an instant there, and writes
// the instant of a chosen day and time as the API takes it: ISO 8601 with the
// offset (docs/padroes/api.md).

describe("formatDate", () => {
  it("formats an instant as the date in the company's time zone", () => {
    expect(formatDate("2026-10-15T12:30:00Z")).toBe("15/10/2026");
  });

  it("formats an instant sent with an offset", () => {
    expect(formatDate("2026-10-15T09:30:00-03:00")).toBe("15/10/2026");
  });

  it("uses the company's day near midnight", () => {
    expect(formatDate("2026-10-15T02:30:00Z")).toBe("14/10/2026");
  });

  it("formats a calendar date as it is", () => {
    expect(formatDate("2026-10-01")).toBe("01/10/2026");
  });
});

describe("formatDateTime", () => {
  it("formats the date and the time", () => {
    expect(formatDateTime("2026-10-15T12:30:00Z")).toBe("15/10/2026 às 09:30");
  });

  it("formats midnight as 00:00", () => {
    expect(formatDateTime("2026-10-15T03:00:00Z")).toBe("15/10/2026 às 00:00");
  });
});

describe("formatYear", () => {
  it("formats the year of an instant in the company's time zone", () => {
    expect(formatYear("2026-10-15T12:30:00Z")).toBe("2026");
  });

  it("uses the company's year near the new year", () => {
    expect(formatYear("2027-01-01T02:30:00Z")).toBe("2026");
    expect(formatYear("2027-01-01T03:00:00Z")).toBe("2027");
  });
});

describe("formatCalendarDate", () => {
  it("writes the calendar day of an instant in the company's time zone", () => {
    expect(formatCalendarDate("2026-10-22T12:00:00Z")).toBe("2026-10-22");
  });

  it("uses the company's day near midnight", () => {
    expect(formatCalendarDate("2026-10-22T02:30:00Z")).toBe("2026-10-21");
    expect(formatCalendarDate("2026-10-22T03:00:00Z")).toBe("2026-10-22");
  });
});

describe("formatTime", () => {
  it("writes the time of an instant in the company's time zone", () => {
    expect(formatTime("2026-10-22T12:00:00Z")).toBe("09:00");
  });

  it("writes a time near midnight", () => {
    expect(formatTime("2026-10-22T02:30:00Z")).toBe("23:30");
    expect(formatTime("2026-10-22T03:00:00Z")).toBe("00:00");
  });
});

describe("toCompanyInstant", () => {
  it("builds the instant of a day and a time in the company's time zone", () => {
    const instant = toCompanyInstant("2026-10-28", "09:00");

    expect(instant).toBe("2026-10-28T09:00:00-03:00");
    expect(Date.parse(instant)).toBe(Date.parse("2026-10-28T12:00:00Z"));
  });

  it("keeps the day of a time late in the evening", () => {
    expect(toCompanyInstant("2026-12-31", "17:30")).toBe(
      "2026-12-31T17:30:00-03:00",
    );
  });
});

describe("formatMonth", () => {
  it("writes the month and the year of a calendar day", () => {
    expect(formatMonth("2026-10-01")).toBe("outubro de 2026");
  });

  it("writes the month of the last day as it is", () => {
    expect(formatMonth("2026-12-31")).toBe("dezembro de 2026");
  });
});

describe("formatLongDate", () => {
  it("writes the weekday and the date of a calendar day", () => {
    expect(formatLongDate("2026-10-28")).toBe(
      "quarta-feira, 28 de outubro de 2026",
    );
  });

  it("writes the first day of a month as it is", () => {
    expect(formatLongDate("2026-11-01")).toBe("domingo, 1 de novembro de 2026");
  });
});

describe("formatDayMonth", () => {
  it("writes a calendar day as the day and the month", () => {
    expect(formatDayMonth("2026-10-05")).toBe("05/10");
  });

  it("keeps the calendar day, as an instant it would still be the day before", () => {
    expect(formatDayMonth("2026-10-01")).toBe("01/10");
  });

  it("writes the last day of the year and a leap day", () => {
    expect(formatDayMonth("2026-12-31")).toBe("31/12");
    expect(formatDayMonth("2028-02-29")).toBe("29/02");
  });
});

// UC10, RF044: the appointments of "Hoje" are the ones before the instant
// this returns, the day of the company at the instant of the call.
describe("startOfNextCompanyDay", () => {
  it("gives the midnight of the next day in the company's time zone", () => {
    // 23h30 of 25/10 in Maceió is already 26/10 in UTC.
    expect(startOfNextCompanyDay(new Date("2026-10-26T02:30:00Z"))).toBe(
      "2026-10-26T00:00:00-03:00",
    );
  });

  it("moves to the next day at midnight sharp", () => {
    expect(startOfNextCompanyDay(new Date("2026-10-26T03:00:00Z"))).toBe(
      "2026-10-27T00:00:00-03:00",
    );
  });

  it("crosses the end of the month and of the year", () => {
    expect(startOfNextCompanyDay(new Date("2026-10-31T15:00:00Z"))).toBe(
      "2026-11-01T00:00:00-03:00",
    );
    expect(startOfNextCompanyDay(new Date("2026-12-31T15:00:00Z"))).toBe(
      "2027-01-01T00:00:00-03:00",
    );
  });
});

// UC09, RN035: the days of a period of the dashboard are calendar days, with
// no time zone.
describe("addCalendarDays", () => {
  it("crosses the end of the month, of the year and of February", () => {
    expect(addCalendarDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addCalendarDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addCalendarDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addCalendarDays("2027-02-28", 1)).toBe("2027-03-01");
    expect(addCalendarDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("listCalendarDays", () => {
  it("lists one day, both ends included", () => {
    expect(listCalendarDays({ from: "2026-10-05", to: "2026-10-05" })).toEqual([
      "2026-10-05",
    ]);
  });

  it("lists a month and a leap year", () => {
    expect(
      listCalendarDays({ from: "2026-10-01", to: "2026-10-31" }),
    ).toHaveLength(31);
    expect(
      listCalendarDays({ from: "2028-01-01", to: "2028-12-31" }),
    ).toHaveLength(366);
  });
});

describe("countCalendarDays", () => {
  it("counts both dates", () => {
    expect(countCalendarDays({ from: "2026-10-01", to: "2026-10-31" })).toBe(
      31,
    );
    expect(countCalendarDays({ from: "2026-10-05", to: "2026-10-05" })).toBe(1);
    expect(countCalendarDays({ from: "2026-10-31", to: "2026-10-01" })).toBe(
      -29,
    );
  });
});

describe("findMonthPeriod", () => {
  it("gives the first and the last day of the month of a day", () => {
    expect(findMonthPeriod("2026-10-26")).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    });
    expect(findMonthPeriod("2026-12-05")).toEqual({
      from: "2026-12-01",
      to: "2026-12-31",
    });
  });

  it("knows February of a leap year", () => {
    expect(findMonthPeriod("2028-02-10").to).toBe("2028-02-29");
    expect(findMonthPeriod("2027-02-10").to).toBe("2027-02-28");
  });
});

describe("companyDayRange", () => {
  it("gives the instants the first day starts and the day after the last one starts", () => {
    expect(companyDayRange({ from: "2026-10-01", to: "2026-10-31" })).toEqual({
      from: "2026-10-01T00:00:00-03:00",
      to: "2026-11-01T00:00:00-03:00",
    });
  });

  it("gives a day of 24 hours for a period of one day", () => {
    expect(companyDayRange({ from: "2026-12-31", to: "2026-12-31" })).toEqual({
      from: "2026-12-31T00:00:00-03:00",
      to: "2027-01-01T00:00:00-03:00",
    });
  });
});
