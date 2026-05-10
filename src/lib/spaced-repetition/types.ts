export type Rating = 1 | 2 | 3 | 4 | 5;
export type FsrsState = "New" | "Learning" | "Review" | "Relearning";

export interface FsrsCard {
  state: FsrsState;
  stability: number;
  difficulty: number;
  retrievability: number;
  lapses: number;
  nextReviewAt: Date;
  lastReviewedAt: Date | null;
}

export interface ReviewResult {
  newCard: FsrsCard;
  intervalDays: number;
}
