export type AssessmentAction = "extended" | "unchanged" | "shortened";

export interface AssessmentModifierResult {
  nextReviewAt: Date;
  action: AssessmentAction;
}

/**
 * Adjusts a topic's next review date based on an assessment score.
 * score >= 80: extend interval by 25% (at minimum 20% per FR-002)
 * score 50-79: leave unchanged
 * score < 50:  set to 3 days from now; schedule reinforcement review
 */
export function applyAssessmentModifier(
  currentNextReviewAt: Date,
  score: number,
  now: Date = new Date()
): AssessmentModifierResult {
  if (score >= 80) {
    const currentIntervalMs = currentNextReviewAt.getTime() - now.getTime();
    const extendedIntervalMs = Math.max(currentIntervalMs * 1.25, currentIntervalMs + 86400000);
    return {
      nextReviewAt: new Date(now.getTime() + extendedIntervalMs),
      action: "extended",
    };
  }

  if (score < 50) {
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    return {
      nextReviewAt: new Date(now.getTime() + threeDaysMs),
      action: "shortened",
    };
  }

  return { nextReviewAt: currentNextReviewAt, action: "unchanged" };
}
