import type { FsrsCard, FsrsState, Rating, ReviewResult } from "./types";

const TARGET_RETRIEVABILITY = 0.9;
const LEARNING_INTERVALS_DAYS = [0.01, 1, 3]; // ~15 min, 1 day, 3 days

export function reviewCard(card: FsrsCard, rating: Rating, reviewedAt: Date): ReviewResult {
  const newDifficulty = updateDifficulty(card.difficulty, rating);
  const newStability = updateStability(card.stability, card.difficulty, rating, card.state);
  const newState = getNextState(card.state, rating);
  const intervalDays = getNextInterval(newStability, newState, card.lapses);

  const nextReviewAt = new Date(reviewedAt);
  if (intervalDays < 1) {
    nextReviewAt.setTime(nextReviewAt.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  } else {
    nextReviewAt.setDate(nextReviewAt.getDate() + Math.round(intervalDays));
  }

  const newCard: FsrsCard = {
    state: newState,
    stability: newStability,
    difficulty: newDifficulty,
    retrievability: getRetrievability(newStability, 0),
    lapses: rating === 1 ? card.lapses + 1 : card.lapses,
    nextReviewAt,
    lastReviewedAt: reviewedAt,
  };

  return { newCard, intervalDays };
}

export function createNewCard(): FsrsCard {
  const now = new Date();
  return {
    state: "New",
    stability: 0.5,
    difficulty: 5,
    retrievability: 1,
    lapses: 0,
    nextReviewAt: now,
    lastReviewedAt: null,
  };
}

// R(t) = e^(-k * t / S) where k = -ln(0.9) ≈ 0.105 gives 90% retrievability at t = S days.
// Higher S → slower decay → higher R for the same elapsed time.
export function getRetrievability(stability: number, daysSinceReview: number): number {
  if (stability <= 0) return 0;
  if (daysSinceReview === 0) return 1;
  const k = 0.10536; // -ln(0.9)
  return Math.exp(-k * daysSinceReview / stability);
}

function updateDifficulty(d: number, rating: Rating): number {
  const delta = (8 - 9 * rating) * (rating - 3) * 0.02;
  return Math.max(1, Math.min(10, d + delta));
}

function updateStability(s: number, d: number, rating: Rating, state: FsrsState): number {
  const hardnessFactor = (13 - d) / 13;
  const ratingFactor = 0.8 + 0.2 * (rating / 5);

  if (state === "New" || state === "Learning") {
    return Math.max(0.5, s * 0.5 * ratingFactor);
  }
  if (state === "Relearning") {
    return Math.max(0.5, s * 0.3 * ratingFactor);
  }
  return Math.max(0.5, s * Math.pow(hardnessFactor, 0.3) * ratingFactor * 2.5);
}

function getNextState(state: FsrsState, rating: Rating): FsrsState {
  if (rating === 1) return "Relearning";
  if (state === "New") return "Learning";
  if (state === "Learning" && rating >= 4) return "Review";
  if (state === "Relearning" && rating >= 3) return "Review";
  return state;
}

function getNextInterval(stability: number, state: FsrsState, lapses: number): number {
  if (state === "Learning") {
    return LEARNING_INTERVALS_DAYS[Math.min(lapses, LEARNING_INTERVALS_DAYS.length - 1)];
  }
  if (state === "Relearning") return 3;
  return Math.max(1, Math.round(stability * (4 / (1 - TARGET_RETRIEVABILITY))));
}
