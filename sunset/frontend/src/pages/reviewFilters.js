export const defaultReviewFilter = { rating: 0, verified: false, withPhoto: false, sort: "recommended" };

export function reviewSummary(reviews) {
  const counts = [0, 0, 0, 0, 0, 0];
  let total = 0;
  for (const review of reviews) {
    const rating = Number(review.rating);
    if (Number.isInteger(rating) && rating >= 1 && rating <= 5) {
      counts[rating] += 1;
      total += rating;
    }
  }
  const count = counts.reduce((sum, value) => sum + value, 0);
  return { counts, count, average: count ? total / count : 0 };
}

export function selectReviews(reviews, filter) {
  const selected = reviews.filter((review) =>
    (!filter.rating || Number(review.rating) === filter.rating)
    && (!filter.verified || review.verifiedPurchase === true)
    && (!filter.withPhoto || Boolean(review.photoUrl)));
  const date = (review) => Date.parse(review.createdAt) || 0;
  return selected.sort((left, right) => {
    if (filter.sort === "rating-high") return Number(right.rating) - Number(left.rating) || date(right) - date(left);
    if (filter.sort === "rating-low") return Number(left.rating) - Number(right.rating) || date(right) - date(left);
    if (filter.sort === "newest") return date(right) - date(left);
    return Number(right.verifiedPurchase === true) - Number(left.verifiedPurchase === true) || date(right) - date(left);
  });
}
