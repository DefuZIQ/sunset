const CACHE_KEY = "sunset:public-catalog:v1";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function readCatalogCache(storage = globalThis.localStorage, now = Date.now()) {
  try {
    const saved = JSON.parse(storage.getItem(CACHE_KEY));
    if (!saved || !Array.isArray(saved.products) || !saved.products.every((item) => item && item.id != null && typeof item.name === "string")) return null;
    if (!Number.isFinite(saved.savedAt) || saved.savedAt > now || now - saved.savedAt > MAX_AGE_MS) return null;
    return saved.products;
  } catch {
    return null;
  }
}

export function writeCatalogCache(products, storage = globalThis.localStorage, now = Date.now()) {
  try {
    storage.setItem(CACHE_KEY, JSON.stringify({ savedAt: now, products }));
  } catch {
    // The catalog still works if storage is disabled or full.
  }
}
