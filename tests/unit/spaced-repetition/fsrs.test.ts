import { describe, it, expect } from "vitest";
import { reviewCard, createNewCard, getRetrievability } from "@/lib/spaced-repetition/fsrs";
import type { FsrsCard, Rating } from "@/lib/spaced-repetition/types";

const makeReviewedCard = (overrides: Partial<FsrsCard> = {}): FsrsCard => ({
  state: "Review",
  stability: 10,
  difficulty: 5,
  retrievability: 0.9,
  lapses: 0,
  nextReviewAt: new Date(),
  lastReviewedAt: new Date(Date.now() - 10 * 86400000),
  ...overrides,
});

describe("createNewCard", () => {
  it("creates a card with New state and default values", () => {
    const card = createNewCard();
    expect(card.state).toBe("New");
    expect(card.stability).toBe(0.5);
    expect(card.difficulty).toBe(5);
    expect(card.lapses).toBe(0);
  });
});

describe("reviewCard - state transitions", () => {
  it("New card with rating 1 → Relearning", () => {
    const card = createNewCard();
    const { newCard } = reviewCard(card, 1, new Date());
    expect(newCard.state).toBe("Relearning");
  });

  it("New card with rating 2 → Learning", () => {
    const card = createNewCard();
    const { newCard } = reviewCard(card, 2, new Date());
    expect(newCard.state).toBe("Learning");
  });

  it("New card with rating 5 → Learning (not Review yet)", () => {
    const card = createNewCard();
    const { newCard } = reviewCard(card, 5, new Date());
    expect(newCard.state).toBe("Learning");
  });

  it("Learning card with rating 4 → Review", () => {
    const card: FsrsCard = { ...createNewCard(), state: "Learning" };
    const { newCard } = reviewCard(card, 4, new Date());
    expect(newCard.state).toBe("Review");
  });

  it("Learning card with rating 3 → stays Learning", () => {
    const card: FsrsCard = { ...createNewCard(), state: "Learning" };
    const { newCard } = reviewCard(card, 3, new Date());
    expect(newCard.state).toBe("Learning");
  });

  it("Review card with rating 1 → Relearning", () => {
    const card = makeReviewedCard();
    const { newCard } = reviewCard(card, 1, new Date());
    expect(newCard.state).toBe("Relearning");
    expect(newCard.lapses).toBe(1);
  });

  it("Review card with rating 5 → stays Review", () => {
    const card = makeReviewedCard();
    const { newCard } = reviewCard(card, 5, new Date());
    expect(newCard.state).toBe("Review");
  });

  it("Relearning card with rating 3 → Review", () => {
    const card: FsrsCard = { ...makeReviewedCard(), state: "Relearning" };
    const { newCard } = reviewCard(card, 3, new Date());
    expect(newCard.state).toBe("Review");
  });
});

describe("reviewCard - intervals", () => {
  it("Learning state uses short intervals", () => {
    const card: FsrsCard = { ...createNewCard(), state: "Learning" };
    const { intervalDays } = reviewCard(card, 3, new Date());
    expect(intervalDays).toBeLessThanOrEqual(3);
  });

  it("Review state with high stability produces longer interval", () => {
    const card = makeReviewedCard({ stability: 20 });
    const { intervalDays } = reviewCard(card, 4, new Date());
    expect(intervalDays).toBeGreaterThan(10);
  });

  it("Higher confidence rating produces longer interval than lower rating", () => {
    const cardBase = makeReviewedCard({ stability: 10 });
    const { intervalDays: interval3 } = reviewCard(cardBase, 3, new Date());
    const { intervalDays: interval5 } = reviewCard(cardBase, 5, new Date());
    expect(interval5).toBeGreaterThan(interval3);
  });

  it("Rating 1 on Review card gives short interval (Relearning)", () => {
    const card = makeReviewedCard();
    const { intervalDays } = reviewCard(card, 1, new Date());
    expect(intervalDays).toBe(3);
  });
});

describe("reviewCard - difficulty", () => {
  it("Rating 1 increases difficulty", () => {
    const card = makeReviewedCard({ difficulty: 5 });
    const { newCard } = reviewCard(card, 1, new Date());
    expect(newCard.difficulty).toBeGreaterThan(5);
  });

  it("Rating 5 decreases difficulty", () => {
    const card = makeReviewedCard({ difficulty: 5 });
    const { newCard } = reviewCard(card, 5, new Date());
    expect(newCard.difficulty).toBeLessThan(5);
  });

  it("Difficulty stays clamped between 1 and 10", () => {
    const cardHard = makeReviewedCard({ difficulty: 9.9 });
    const { newCard: harder } = reviewCard(cardHard, 1, new Date());
    expect(harder.difficulty).toBeLessThanOrEqual(10);

    const cardEasy = makeReviewedCard({ difficulty: 1.1 });
    const { newCard: easier } = reviewCard(cardEasy, 5, new Date());
    expect(easier.difficulty).toBeGreaterThanOrEqual(1);
  });
});

describe("reviewCard - lapses", () => {
  it("Lapses increment on rating 1", () => {
    const card = makeReviewedCard({ lapses: 2 });
    const { newCard } = reviewCard(card, 1, new Date());
    expect(newCard.lapses).toBe(3);
  });

  it("Lapses do not change on rating >= 2", () => {
    const card = makeReviewedCard({ lapses: 2 });
    for (const rating of [2, 3, 4, 5] as Rating[]) {
      const { newCard } = reviewCard(card, rating, new Date());
      expect(newCard.lapses).toBe(2);
    }
  });
});

describe("getRetrievability", () => {
  it("Returns 1 when daysSinceReview is 0", () => {
    expect(getRetrievability(10, 0)).toBe(1);
  });

  it("Returns 0 when stability is 0", () => {
    expect(getRetrievability(0, 5)).toBe(0);
  });

  it("Decreases as time passes", () => {
    const r1 = getRetrievability(10, 5);
    const r2 = getRetrievability(10, 20);
    expect(r1).toBeGreaterThan(r2);
  });

  it("Higher stability means slower decay", () => {
    const rLow = getRetrievability(5, 10);
    const rHigh = getRetrievability(20, 10);
    expect(rHigh).toBeGreaterThan(rLow);
  });
});
