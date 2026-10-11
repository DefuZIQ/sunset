import { describe, expect, it } from "vitest";
import { readCatalogFilters, readCatalogPage, writeCatalogFilters, writeCatalogPage } from "./catalogFilters";

describe("catalog URL filters", () => {
  it("reads existing category and gender links", () => {
    const filters = readCatalogFilters(new URLSearchParams("category%5B%5D=%D0%9F%D0%B0%D0%BB%D1%8C%D1%82%D0%BE&gender=WOMEN"));
    expect(filters.categories).toEqual(["Пальто"]);
    expect(filters.gender).toBe("WOMEN");
  });

  it("round-trips every filter and preserves unrelated query parameters", () => {
    const initial = new URLSearchParams("utm_source=share");
    const filters = {
      search: "льняная", min: "3000", max: "5000", categories: ["Одежда", "Рубашки"],
      gender: "WOMEN", colors: ["Белый"], sizes: ["women_clothing:M"],
      availability: "in-stock", ratingMin: "4.8", ratingMax: "5",
      storeId: "11111111-1111-1111-1111-111111111111",
      reviewedOnly: true, sort: "price-asc",
    };
    const result = writeCatalogFilters(initial, filters);
    expect(result.get("utm_source")).toBe("share");
    expect(readCatalogFilters(result)).toEqual(filters);
  });

  it("ignores invalid values and deduplicates repeated options", () => {
    const filters = readCatalogFilters(new URLSearchParams(
      "gender=INVALID&min=-1&max=100000001&ratingMin=6&ratingMax=oops&availability=missing&store=invalid&sort=oops&color%5B%5D=Белый&color%5B%5D=Белый",
    ));
    expect(filters).toMatchObject({
      gender: "all", min: "", max: "", ratingMin: "", ratingMax: "",
      availability: "all", storeId: "", sort: "new", colors: ["Белый"],
    });
  });

  it("clears only catalog filters", () => {
    const source = new URLSearchParams("utm_source=mail&q=coat&gender=MEN&color%5B%5D=Brown&page=3");
    const cleared = writeCatalogFilters(source, readCatalogFilters(new URLSearchParams()));
    expect(cleared.toString()).toBe("utm_source=mail");
  });

  it("keeps a catalog page in the URL and resets it when filters change", () => {
    const pageTwo = writeCatalogPage("gender=WOMEN", 2);
    expect(readCatalogPage(pageTwo)).toBe(2);
    expect(readCatalogPage(writeCatalogPage(pageTwo, 1))).toBe(1);
    expect(readCatalogPage("page=0")).toBe(1);
    expect(readCatalogPage("page=oops")).toBe(1);
    expect(writeCatalogFilters(pageTwo, { ...readCatalogFilters(pageTwo), sort: "price-asc" }).has("page")).toBe(false);
  });
});
