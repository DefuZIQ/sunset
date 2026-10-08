import { describe, expect, it } from "vitest";
import { normalizeSearchText, productSearchScore } from "./productSearch";

const shirt = {
  name: "Льняная рубашка", description: "Натуральный лён", categories: ["Для женщин", "Одежда"],
  colors: [{ name: "Белый" }],
};

describe("shared product search", () => {
  it("normalizes ё, punctuation and case", () => {
    expect(normalizeSearchText("  БЕЛЁЕ—ПАЛЬТО! ")).toBe("белее пальто");
  });

  it("finds words in names, categories, descriptions and colors", () => {
    expect(productSearchScore(shirt, "рубашка")).toBeGreaterThan(0);
    expect(productSearchScore(shirt, "женщин")).toBeGreaterThan(0);
    expect(productSearchScore(shirt, "лён")).toBeGreaterThan(0);
    expect(productSearchScore(shirt, "белый")).toBeGreaterThan(0);
  });

  it("tolerates a small typo and recognizes a clothing synonym", () => {
    expect(productSearchScore(shirt, "рубашки")).toBeGreaterThan(0);
    expect(productSearchScore({ name: "Толстовка", categories: [] }, "худи")).toBeGreaterThan(0);
  });

  it("requires every query token and avoids fuzzy matches for short words", () => {
    expect(productSearchScore(shirt, "рубашка пальто")).toBe(0);
    expect(productSearchScore(shirt, "ле")).toBe(0);
    expect(productSearchScore(shirt, "")).toBe(0);
  });
});
