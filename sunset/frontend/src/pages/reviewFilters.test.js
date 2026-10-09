import { describe, expect, it } from "vitest";
import { defaultReviewFilter, reviewSummary, selectReviews } from "./reviewFilters";

const reviews = [
  { id: "old-five", rating: 5, verifiedPurchase: true, photoUrl: "https://example.test/photo.jpg", createdAt: "2026-01-01T00:00:00Z" },
  { id: "new-four", rating: 4, verifiedPurchase: false, photoUrl: null, createdAt: "2026-02-01T00:00:00Z" },
  { id: "new-three", rating: 3, verifiedPurchase: true, photoUrl: null, createdAt: "2026-03-01T00:00:00Z" },
];

describe("review filters", () => {
  it("counts ratings and derives the average from loaded reviews", () => {
    expect(reviewSummary(reviews)).toEqual({ counts: [0, 0, 0, 1, 1, 1], count: 3, average: 4 });
    expect(reviewSummary([]).average).toBe(0);
  });

  it("combines rating, confirmed purchase and photo filters", () => {
    expect(selectReviews(reviews, { ...defaultReviewFilter, rating: 5, verified: true, withPhoto: true }).map((item) => item.id)).toEqual(["old-five"]);
    expect(selectReviews(reviews, { ...defaultReviewFilter, rating: 4, verified: true })).toEqual([]);
  });

  it("sorts without modifying the source list", () => {
    expect(selectReviews(reviews, defaultReviewFilter).map((item) => item.id)).toEqual(["new-three", "old-five", "new-four"]);
    expect(selectReviews(reviews, { ...defaultReviewFilter, sort: "newest" }).map((item) => item.id)).toEqual(["new-three", "new-four", "old-five"]);
    expect(selectReviews(reviews, { ...defaultReviewFilter, sort: "rating-low" }).map((item) => item.id)).toEqual(["new-three", "new-four", "old-five"]);
    expect(reviews.map((item) => item.id)).toEqual(["old-five", "new-four", "new-three"]);
  });
});
