const synonymGroups = [
  ["худи", "толстовка"],
  ["джинсы", "деним"],
  ["пиджак", "жакет"],
  ["кроссовки", "сникеры"],
];

export const normalizeSearchText = (value) => String(value || "").toLowerCase()
  .replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/gi, " ").trim();

const distance = (left, right) => {
  if (Math.abs(left.length - right.length) > 2) return 3;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) {
      current[column] = Math.min(
        previous[column] + 1,
        current[column - 1] + 1,
        previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[right.length];
};

const contains = (text, words, token) => token.length < 3 ? words.includes(token) : text.includes(token);
const variants = (token) => synonymGroups.find((group) => group.includes(token))?.filter((word) => word !== token) || [];

export function productSearchScore(product, query) {
  const tokens = normalizeSearchText(query).slice(0, 100).split(" ").filter(Boolean).slice(0, 10);
  if (!tokens.length) return 0;
  const fields = [
    [product.name, 40],
    [(product.categories || []).join(" "), 28],
    [product.description, 18],
    [(product.colors || []).map((color) => color.name).join(" "), 15],
  ].map(([value, weight]) => {
    const text = normalizeSearchText(value);
    return { text, words: text.split(" ").filter(Boolean), weight };
  });

  let score = 0;
  for (const token of tokens) {
    const exact = Math.max(0, ...fields.map(({ text, words, weight }) => contains(text, words, token) ? weight : 0));
    if (exact) { score += exact; continue; }
    const synonym = Math.max(0, ...fields.map(({ text, words, weight }) =>
      variants(token).some((word) => contains(text, words, word)) ? Math.round(weight * 0.6) : 0));
    if (synonym) { score += synonym; continue; }
    const fuzzy = token.length >= 4 && fields.some(({ words }) => words.some((word) =>
      word.length >= 4 && word[0] === token[0] && distance(word, token) <= (token.length > 7 ? 2 : 1)));
    if (!fuzzy) return 0;
    score += 8;
  }
  return score;
}
