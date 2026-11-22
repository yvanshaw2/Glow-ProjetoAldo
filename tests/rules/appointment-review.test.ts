import { describe, expect, it } from "vitest";
import { findReviewRefusal } from "@/server/rules/appointment-review";

// RN043: the client rates, once, an appointment Concluído or Reagendado, up to
// 30 days after the completion, by the calendar days of the company.

// 15:00 UTC is 12:00 in Maceió, on 2026-10-01.
const COMPLETED_AT = "2026-10-01T15:00:00Z";

describe("findReviewRefusal", () => {
  it("accepts a completed or rescheduled appointment with no rating", () => {
    for (const status of ["completed", "rescheduled"] as const) {
      expect(
        findReviewRefusal(
          { status, completedAt: COMPLETED_AT, rating: null },
          "2026-10-02",
        ),
      ).toBeNull();
    }
  });

  it("accepts on the 30th day and refuses on the 31st", () => {
    const appointment = {
      status: "completed" as const,
      completedAt: COMPLETED_AT,
      rating: null,
    };
    expect(findReviewRefusal(appointment, "2026-10-31")).toBeNull();
    expect(findReviewRefusal(appointment, "2026-11-01")).toBe("EXPIRED");
  });

  it("counts the day of the completion in the time zone of the company", () => {
    // 01:30 UTC of the 2nd is still the 1st in Maceió.
    expect(
      findReviewRefusal(
        {
          status: "completed",
          completedAt: "2026-10-02T01:30:00Z",
          rating: null,
        },
        "2026-10-31",
      ),
    ).toBeNull();
  });

  it("refuses an appointment already rated", () => {
    expect(
      findReviewRefusal(
        { status: "completed", completedAt: COMPLETED_AT, rating: 4 },
        "2026-10-02",
      ),
    ).toBe("ALREADY_REVIEWED");
  });

  it("refuses any other status", () => {
    for (const status of [
      "scheduled",
      "checked_in",
      "in_progress",
      "awaiting_payment",
      "cancelled",
    ] as const) {
      expect(
        findReviewRefusal(
          { status, completedAt: null, rating: null },
          "2026-10-02",
        ),
      ).toBe("NOT_COMPLETED");
    }
  });
});
