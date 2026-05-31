import { describe, it, expect } from "vitest";
import { applyAssessmentModifier } from "@/lib/spaced-repetition/assessment-modifier";

const NOW = new Date("2026-05-30T10:00:00.000Z");
const IN_10_DAYS = new Date("2026-06-09T10:00:00.000Z");

describe("applyAssessmentModifier — score >= 80 (extended)", () => {
  it("extends the next review interval by at least 25%", () => {
    const result = applyAssessmentModifier(IN_10_DAYS, 80, NOW);
    expect(result.action).toBe("extended");
    const extendedIntervalMs = result.nextReviewAt.getTime() - NOW.getTime();
    const originalIntervalMs = IN_10_DAYS.getTime() - NOW.getTime();
    expect(extendedIntervalMs).toBeGreaterThanOrEqual(originalIntervalMs * 1.25);
  });

  it("returns action 'extended' for score 100", () => {
    const result = applyAssessmentModifier(IN_10_DAYS, 100, NOW);
    expect(result.action).toBe("extended");
    expect(result.nextReviewAt.getTime()).toBeGreaterThan(IN_10_DAYS.getTime());
  });

  it("returns action 'extended' for score exactly 80", () => {
    const result = applyAssessmentModifier(IN_10_DAYS, 80, NOW);
    expect(result.action).toBe("extended");
  });
});

describe("applyAssessmentModifier — score 50-79 (unchanged)", () => {
  it("leaves next review date unchanged for score 50", () => {
    const result = applyAssessmentModifier(IN_10_DAYS, 50, NOW);
    expect(result.action).toBe("unchanged");
    expect(result.nextReviewAt.getTime()).toBe(IN_10_DAYS.getTime());
  });

  it("leaves next review date unchanged for score 79", () => {
    const result = applyAssessmentModifier(IN_10_DAYS, 79, NOW);
    expect(result.action).toBe("unchanged");
    expect(result.nextReviewAt.getTime()).toBe(IN_10_DAYS.getTime());
  });

  it("leaves next review date unchanged for score 65", () => {
    const result = applyAssessmentModifier(IN_10_DAYS, 65, NOW);
    expect(result.action).toBe("unchanged");
  });
});

describe("applyAssessmentModifier — score < 50 (shortened)", () => {
  it("sets next review to 3 days from now for score 0", () => {
    const result = applyAssessmentModifier(IN_10_DAYS, 0, NOW);
    expect(result.action).toBe("shortened");
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    expect(result.nextReviewAt.getTime()).toBe(NOW.getTime() + threeDaysMs);
  });

  it("sets next review to 3 days from now for score 49", () => {
    const result = applyAssessmentModifier(IN_10_DAYS, 49, NOW);
    expect(result.action).toBe("shortened");
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    expect(result.nextReviewAt.getTime()).toBe(NOW.getTime() + threeDaysMs);
  });

  it("shortens even when current date is already close", () => {
    const tomorrow = new Date(NOW.getTime() + 86400000);
    const result = applyAssessmentModifier(tomorrow, 30, NOW);
    expect(result.action).toBe("shortened");
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    expect(result.nextReviewAt.getTime()).toBe(NOW.getTime() + threeDaysMs);
  });
});
