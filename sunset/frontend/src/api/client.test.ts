import { afterEach, expect, test, vi } from "vitest";
import { getProductById, listProducts } from "./client";

afterEach(() => vi.unstubAllGlobals());

test("catalog uses the versioned path and forwards the abort signal", async () => {
  const products = [{ id: "11111111-1111-1111-1111-111111111111", name: "Пальто", price: 8900 }];
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => products });
  vi.stubGlobal("fetch", fetchMock);
  const controller = new AbortController();

  await expect(listProducts(controller.signal)).resolves.toEqual(products);
  expect(fetchMock).toHaveBeenCalledWith("/api/v1/products/all", { signal: controller.signal });
});

test("product details send the typed UUID body to the versioned path", async () => {
  const product = { id: "11111111-1111-1111-1111-111111111111", name: "Пальто", price: 8900 };
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => product });
  vi.stubGlobal("fetch", fetchMock);

  await expect(getProductById(product.id)).resolves.toEqual(product);
  expect(fetchMock).toHaveBeenCalledWith("/api/v1/products/by-uuid", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: product.id }),
  });
});

test("HTTP errors retain their status for the product page", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
  await expect(getProductById("missing")).rejects.toMatchObject({ status: 404 });
});
