import { afterEach, expect, test, vi } from "vitest";
import { countUnreadNotifications, getCategoryTree, getLoyaltyAccount, getProductById,
  getSubscriptionStatus, listNotifications, listProductReviews, listProducts, listPromotions,
  markNotificationRead, quoteDelivery, saveProductReview, subscribeNewsletter, unsubscribeNewsletter } from "./client";

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

test("notification list bounds the limit and uses the bearer token", async () => {
  const notifications = [{ id: "notice-1", type: "ORDER", title: "Заказ", message: "Готов", read: false, createdAt: "2026-10-06T00:00:00Z" }];
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => notifications });
  vi.stubGlobal("fetch", fetchMock);

  await expect(listNotifications("jwt", 150)).resolves.toEqual(notifications);
  expect(fetchMock).toHaveBeenCalledWith("/api/v1/notifications?limit=100", {
    headers: { Authorization: "Bearer jwt" },
  });
});

test("notification count and read action use versioned protected paths", async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ count: 2 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ read: true }) });
  vi.stubGlobal("fetch", fetchMock);

  await expect(countUnreadNotifications("jwt")).resolves.toEqual({ count: 2 });
  await expect(markNotificationRead("jwt", "notice-1")).resolves.toEqual({ read: true });
  expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/v1/notifications/unread-count", {
    headers: { Authorization: "Bearer jwt" },
  });
  expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/v1/notifications/notice-1/read", {
    method: "PATCH", headers: { Authorization: "Bearer jwt" },
  });
});

test("guest newsletter signup sends no bearer token and keeps server error text", async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ active: true, email: "guest@example.com" }) })
    .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ message: "Укажите корректный e-mail" }) });
  vi.stubGlobal("fetch", fetchMock);

  await expect(subscribeNewsletter("guest@example.com")).resolves.toEqual({ active: true, email: "guest@example.com" });
  expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/v1/subscriptions", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "guest@example.com" }),
  });
  await expect(subscribeNewsletter("bad")).rejects.toMatchObject({ status: 400, message: "Укажите корректный e-mail" });
});

test("subscription status and unsubscribe use authenticated paths", async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ active: true, email: "client@example.com" }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ active: false }) });
  vi.stubGlobal("fetch", fetchMock);

  await expect(getSubscriptionStatus("jwt")).resolves.toMatchObject({ active: true });
  await expect(unsubscribeNewsletter("jwt")).resolves.toEqual({ active: false });
  expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/v1/subscriptions/status", {
    headers: { Authorization: "Bearer jwt" },
  });
  expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/v1/subscriptions", {
    method: "DELETE", headers: { Authorization: "Bearer jwt" },
  });
});

test("category tree and promotions use public versioned paths", async () => {
  const tree = [{ id: "category-1", name: "Одежда", parentId: null, children: [] }];
  const promotions = [{ id: "promotion-1", title: "Осень", code: "AUTUMN" }];
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => tree })
    .mockResolvedValueOnce({ ok: true, json: async () => promotions });
  vi.stubGlobal("fetch", fetchMock);
  const controller = new AbortController();

  await expect(getCategoryTree(controller.signal)).resolves.toEqual(tree);
  await expect(listPromotions()).resolves.toEqual(promotions);
  expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/v1/products/categories/tree", { signal: controller.signal });
  expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/v1/order/promotions");
});

test("reviews use a public list and a protected write with encoded product ID", async () => {
  const reviews = [{ id: "review-1", rating: 5, body: "Отлично" }];
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => reviews })
    .mockResolvedValueOnce({ ok: true, json: async () => reviews[0] });
  vi.stubGlobal("fetch", fetchMock);

  await expect(listProductReviews("product/1")).resolves.toEqual(reviews);
  await expect(saveProductReview("jwt", "product/1", { rating: 5, body: "Отлично" })).resolves.toEqual(reviews[0]);
  expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/v1/products/reviews/product%2F1");
  expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/v1/products/review/product%2F1", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer jwt" },
    body: JSON.stringify({ rating: 5, body: "Отлично" }),
  });
});

test("loyalty and delivery quote use protected versioned routes", async () => {
  const loyalty = { balance: 100 };
  const quote = { method: "pickup", cost: 0, estimatedDays: 1 };
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => loyalty })
    .mockResolvedValueOnce({ ok: true, json: async () => quote });
  vi.stubGlobal("fetch", fetchMock);

  await expect(getLoyaltyAccount("jwt")).resolves.toEqual(loyalty);
  await expect(quoteDelivery("jwt", { method: "pickup", subtotal: 2500 })).resolves.toEqual(quote);
  expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/v1/order/loyalty", {
    headers: { Authorization: "Bearer jwt" },
  });
  expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/v1/order/delivery/quote", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer jwt" },
    body: JSON.stringify({ method: "pickup", subtotal: 2500 }),
  });
});
