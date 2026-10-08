const managedKeys = ["q", "min", "max", "category[]", "gender", "color[]", "size[]", "availability", "ratingMin", "ratingMax", "reviewed", "sort"];
const validSorts = new Set(["new", "price-asc", "price-desc", "rating-desc", "name"]);
const validAvailability = new Set(["all", "in-stock", "low-stock"]);

const text = (value, length) => String(value || "").slice(0, length);
const list = (params, key) => [...new Set(params.getAll(key).map((value) => value.trim()).filter(Boolean))]
  .slice(0, 20).map((value) => text(value, 100));
const number = (value, maximum) => {
  if (!value || !/^\d+(?:\.\d*)?$/.test(value) || Number(value) > maximum) return "";
  return value;
};

export function readCatalogFilters(params) {
  const source = new URLSearchParams(params);
  const gender = source.get("gender");
  const availability = source.get("availability");
  const sort = source.get("sort");
  return {
    search: text(source.get("q"), 100),
    min: number(source.get("min"), 100000000),
    max: number(source.get("max"), 100000000),
    categories: list(source, "category[]"),
    gender: gender === "WOMEN" || gender === "MEN" ? gender : "all",
    colors: list(source, "color[]"),
    sizes: list(source, "size[]"),
    availability: validAvailability.has(availability) ? availability : "all",
    ratingMin: number(source.get("ratingMin"), 5),
    ratingMax: number(source.get("ratingMax"), 5),
    reviewedOnly: source.get("reviewed") === "1",
    sort: validSorts.has(sort) ? sort : "new",
  };
}

export function writeCatalogFilters(params, filter) {
  const next = new URLSearchParams(params);
  managedKeys.forEach((key) => next.delete(key));
  const one = (key, value) => { if (value) next.set(key, String(value)); };
  const many = (key, values) => values.forEach((value) => next.append(key, value));

  one("q", filter.search);
  one("min", filter.min);
  one("max", filter.max);
  many("category[]", filter.categories);
  one("gender", filter.gender === "all" ? "" : filter.gender);
  many("color[]", filter.colors);
  many("size[]", filter.sizes);
  one("availability", filter.availability === "all" ? "" : filter.availability);
  one("ratingMin", filter.ratingMin);
  one("ratingMax", filter.ratingMax);
  one("reviewed", filter.reviewedOnly ? "1" : "");
  one("sort", filter.sort === "new" ? "" : filter.sort);
  return next;
}
