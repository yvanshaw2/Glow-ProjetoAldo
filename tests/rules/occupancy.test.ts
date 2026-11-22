import { describe, expect, it } from "vitest";
import { countAvailableMinutes } from "@/server/rules/occupancy";
import type { BusinessDay } from "@/shared/api/settings";

// RN044 (docs/agendamento/calculos.md, section 7): the minutes of each day of
// the period by the weekday of the current business hours, without the break,
// times the simultaneous slots; zero on a closed day.

function day(
  weekday: number,
  times: [string, string, string | null, string | null] | null,
): BusinessDay {
  return {
    weekday,
    isOpen: times !== null,
    opensAt: times?.[0] ?? null,
    closesAt: times?.[1] ?? null,
    breakStartsAt: times?.[2] ?? null,
    breakEndsAt: times?.[3] ?? null,
  };
}

// The seed: closed on Sunday, 08:00 to 18:00 with lunch on weekdays and 08:00
// to 12:00 on Saturday.
const WEEK = [
  day(0, null),
  ...[1, 2, 3, 4, 5].map((weekday) =>
    day(weekday, ["08:00", "18:00", "12:00", "13:00"]),
  ),
  day(6, ["08:00", "12:00", null, null]),
];

describe("countAvailableMinutes", () => {
  it("gives 540 minutes for a weekday with a break, times the slots", () => {
    // 2026-10-05 is a Monday.
    const monday = { from: "2026-10-05", to: "2026-10-05" };
    expect(countAvailableMinutes(monday, WEEK, 1)).toBe(540);
    expect(countAvailableMinutes(monday, WEEK, 3)).toBe(1620);
  });

  it("counts a day without a break whole and a closed day as zero", () => {
    expect(
      countAvailableMinutes({ from: "2026-10-10", to: "2026-10-10" }, WEEK, 1),
    ).toBe(240);
    expect(
      countAvailableMinutes({ from: "2026-10-11", to: "2026-10-11" }, WEEK, 3),
    ).toBe(0);
  });

  it("sums every day of the period by its weekday", () => {
    // From Monday to Sunday: five weekdays, a Saturday and a closed Sunday.
    expect(
      countAvailableMinutes({ from: "2026-10-05", to: "2026-10-11" }, WEEK, 2),
    ).toBe((5 * 540 + 240) * 2);
  });
});
