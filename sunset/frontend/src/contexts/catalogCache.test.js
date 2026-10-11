import { describe, expect, test } from "vitest";
import { readCatalogCache, writeCatalogCache } from "./catalogCache";

const storage = () => {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};

describe("public catalog cache", () => {
  test("reads a recent catalog, including an empty one", () => {
    const store = storage();
    writeCatalogCache([{ id: "1", name: "Пальто" }], store, 1000);
    expect(readCatalogCache(store, 2000)).toEqual([{ id: "1", name: "Пальто" }]);
    writeCatalogCache([], store, 2000);
    expect(readCatalogCache(store, 3000)).toEqual([]);
  });

  test("rejects expired, future and malformed data", () => {
    const store = storage();
    writeCatalogCache([{ id: "1", name: "Пальто" }], store, 1000);
    expect(readCatalogCache(store, 1000 + 24 * 60 * 60 * 1000 + 1)).toBeNull();
    expect(readCatalogCache(store, 999)).toBeNull();
    store.setItem("sunset:public-catalog:v1", "{broken");
    expect(readCatalogCache(store, 2000)).toBeNull();
  });

  test("continues when browser storage is unavailable", () => {
    const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(readCatalogCache(blocked)).toBeNull();
    expect(() => writeCatalogCache([], blocked)).not.toThrow();
  });
});
