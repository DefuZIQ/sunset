import { afterEach, expect, test, vi } from "vitest";
import { adjustAdminBonuses, cancelMyOrder, changePassword, countUnreadNotifications, createAdminProduct, createAdminPromotion, createCustomerAddress, createOrder, createOrderReturn, deleteAdminProduct, deleteCustomerAddress, getCategoryTree,
  getAddressGeocoderStatus, getAdminAnalytics, getLoyaltyAccount, getMyOrder, getProductById, getSubscriptionStatus, listAdminOrders,
  listAdminPromotions, listAdminReturns, listAdminUsers, listAdminVariants, listMyOrders,
  listCustomerAddresses, listNotifications, listProductReviews, listProducts, listPromotions, loginCustomer, lookupAddress,
  markNotificationRead, quoteDelivery, registerCustomer, saveProductReview,
  subscribeNewsletter, unsubscribeNewsletter, updateAdminOrderStatus, updateAdminProduct, updateAdminReturnStatus, updateAdminStock, updatePendingOrder, updateProfile,
  updateCustomerAddress, validatePromoCode, getProfile, syncCustomerAddresses } from "./client";

afterEach(() => vi.unstubAllGlobals());

test("address lookup keeps provider credentials on the server", async () => {
  const suggestions = [{ query: "г Нижний Новгород, ул Большая Покровская, д 34", city: "Нижний Новгород", street: "Большая Покровская", house: "34", lat: 56.3269, lon: 44.0059 }];
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ available: true }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ available: true, suggestions }) });
  vi.stubGlobal("fetch", fetchMock);
  await expect(getAddressGeocoderStatus("jwt")).resolves.toEqual({ available: true });
  await expect(lookupAddress("jwt", "Нижний Новгород, Покровская 34")).resolves.toMatchObject({ suggestions });
  expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/v1/auth/addresses/geocoder", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer jwt" },
    body: JSON.stringify({ query: "Нижний Новгород, Покровская 34", selected: false }),
  });
});

test("address book CRUD uses protected versioned paths and an empty DELETE response", async () => {
  const address = { label: "Дом", city: "Нижний Новгород", street: "Большая Покровская", house: "34" };
  const saved = { ...address, id: "address-1" };
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => [saved] })
    .mockResolvedValueOnce({ ok: true, json: async () => saved })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ ...saved, label: "Работа" }) })
    .mockResolvedValueOnce({ ok: true, status: 204, json: async () => { throw new Error("204 must not be parsed"); } });
  vi.stubGlobal("fetch", fetchMock);

  await expect(listCustomerAddresses("jwt")).resolves.toEqual([saved]);
  await expect(createCustomerAddress("jwt", address)).resolves.toEqual(saved);
  await expect(updateCustomerAddress("jwt", "address/1", { ...address, label: "Работа" })).resolves.toMatchObject({ label: "Работа" });
  await expect(deleteCustomerAddress("jwt", "address/1")).resolves.toBeUndefined();
  expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/v1/auth/addresses", { headers: { Authorization: "Bearer jwt" } });
  expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/v1/auth/addresses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer jwt" }, body: JSON.stringify(address) });
  expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/v1/auth/addresses/address%2F1", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: "Bearer jwt" }, body: JSON.stringify({ ...address, label: "Работа" }) });
  expect(fetchMock).toHaveBeenNthCalledWith(4, "/api/v1/auth/addresses/address%2F1", { method: "DELETE", headers: { Authorization: "Bearer jwt" } });
});

test("legacy browser addresses migrate once without duplicating server addresses", async () => {
  const existing = { id: "server-1", label: "Дом", city: "Москва", street: "Тверская", house: "1" };
  const other = { id: "old-2", label: "Работа", city: "Москва", street: "Арбат", house: "2" };
  localStorage.setItem("sunsetAddresses:user-1", JSON.stringify([existing, other]));
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => [existing] })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ ...other, id: "server-2" }) });
  vi.stubGlobal("fetch", fetchMock);
  await expect(syncCustomerAddresses("jwt", "user-1")).resolves.toHaveLength(2);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(localStorage.getItem("sunsetAddresses:user-1")).toBeNull();
});

test("admin product writes use versioned paths and DELETE accepts an empty 204 response", async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ id: "product-1", name: "Пальто", price: 9000 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "product-1", name: "Пальто", price: 9500 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "product-1", totalQuantity: 3, totalVariants: 1 }) })
    .mockResolvedValueOnce({ ok: true, status: 204, json: async () => { throw new Error("204 must not be parsed"); } });
  vi.stubGlobal("fetch", fetchMock);

  const product = { name: "Пальто", price: 9000, category: "Пальто", gender: "WOMEN" as const };
  await createAdminProduct("jwt", product);
  await updateAdminProduct("jwt", "product/1", { ...product, price: 9500 });
  await updateAdminStock("jwt", "product/1", { stock: [{ sizeId: "size-1", colorId: "color-1", quantity: 3 }] });
  await expect(deleteAdminProduct("jwt", "product/1")).resolves.toBeUndefined();
  expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/v1/products/admin", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer jwt" }, body: JSON.stringify(product),
  });
  expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/v1/products/admin/product%2F1", {
    method: "PUT", headers: { "Content-Type": "application/json", Authorization: "Bearer jwt" }, body: JSON.stringify({ ...product, price: 9500 }),
  });
  expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/v1/products/admin/product%2F1/stock", {
    method: "PUT", headers: { "Content-Type": "application/json", Authorization: "Bearer jwt" },
    body: JSON.stringify({ stock: [{ sizeId: "size-1", colorId: "color-1", quantity: 3 }] }),
  });
  expect(fetchMock).toHaveBeenNthCalledWith(4, "/api/v1/products/admin/product%2F1", {
    method: "DELETE", headers: { Authorization: "Bearer jwt" },
  });
});

test("admin order, bonus, promotion and return writes send typed bodies", async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ id: "order-1", status: "CONFIRMED" }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ userId: "user-1", balance: 200, applied: 100 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "promo-1", code: "NEW10", title: "Новинка", active: true }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "return-1", status: "APPROVED" }) });
  vi.stubGlobal("fetch", fetchMock);

  await updateAdminOrderStatus("jwt", "order/1", { status: "CONFIRMED" });
  await adjustAdminBonuses("jwt", "user/1", { amount: 100, reason: "Корректировка" });
  await createAdminPromotion("jwt", { code: "NEW10", title: "Новинка", discountPercent: 10 });
  await updateAdminReturnStatus("jwt", "return/1", { status: "APPROVED" });
  const expected = [
    ["/api/v1/order/admin/orders/order%2F1/status", "PATCH", { status: "CONFIRMED" }],
    ["/api/v1/order/admin/users/user%2F1/bonuses", "POST", { amount: 100, reason: "Корректировка" }],
    ["/api/v1/order/admin/promotions", "POST", { code: "NEW10", title: "Новинка", discountPercent: 10 }],
    ["/api/v1/order/admin/returns/return%2F1", "PATCH", { status: "APPROVED" }],
  ] as const;
  expected.forEach(([url, method, body], index) => expect(fetchMock).toHaveBeenNthCalledWith(index + 1, url, {
    method, headers: { "Content-Type": "application/json", Authorization: "Bearer jwt" }, body: JSON.stringify(body),
  }));
});

test("admin product deletion surfaces server errors", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: false, status: 403, json: async () => ({ message: "Требуются права администратора" }),
  }));
  await expect(deleteAdminProduct("jwt", "product-1")).rejects.toMatchObject({
    status: 403, message: "Требуются права администратора",
  });
});

test("admin dashboard reads six protected versioned routes", async () => {
  const routes = [
    "/api/v1/order/admin/orders", "/api/v1/order/admin/users", "/api/v1/order/admin/promotions",
    "/api/v1/products/admin/variants", "/api/v1/order/admin/returns", "/api/v1/order/admin/analytics",
  ];
  const responses = [[], [], [], { colors: [], sizes: [] }, [], { orders: {}, returns: {}, lowStock: 0, topProducts: [] }];
  const fetchMock = vi.fn().mockImplementation(async (url: string) => ({
    ok: true, json: async () => responses[routes.indexOf(url)],
  }));
  vi.stubGlobal("fetch", fetchMock);

  await Promise.all([
    listAdminOrders("admin-jwt"), listAdminUsers("admin-jwt"), listAdminPromotions("admin-jwt"),
    listAdminVariants("admin-jwt"), listAdminReturns("admin-jwt"), getAdminAnalytics("admin-jwt"),
  ]);
  routes.forEach((route, index) => expect(fetchMock).toHaveBeenNthCalledWith(index + 1, route, {
    headers: { Authorization: "Bearer admin-jwt" },
  }));
});

test("admin dashboard preserves forbidden server responses", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: false, status: 403, json: async () => ({ message: "Требуются права администратора" }),
  }));
  await expect(listAdminUsers("customer-jwt")).rejects.toMatchObject({
    status: 403, message: "Требуются права администратора",
  });
});

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

test("customer order list and detail use protected versioned routes", async () => {
  const order = { id: "order-1", orderNumber: "SUN-1", status: "PENDING", totalAmount: 1200 };
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => [order] })
    .mockResolvedValueOnce({ ok: true, json: async () => order });
  vi.stubGlobal("fetch", fetchMock);

  await expect(listMyOrders("jwt")).resolves.toEqual([order]);
  await expect(getMyOrder("jwt", "order/1")).resolves.toEqual(order);
  expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/v1/order/my", { headers: { Authorization: "Bearer jwt" } });
  expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/v1/order/my/order%2F1", { headers: { Authorization: "Bearer jwt" } });
});

test("order update, cancellation and return use protected versioned routes", async () => {
  const order = { id: "order-1", status: "PENDING" };
  const returned = { id: "return-1", orderId: "order-1", status: "REQUESTED" };
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => order })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ ...order, status: "CANCELLED" }) })
    .mockResolvedValueOnce({ ok: true, json: async () => returned });
  vi.stubGlobal("fetch", fetchMock);

  await updatePendingOrder("jwt", "order-1", { address: "Нижний Новгород", deliveryMethod: "courier" });
  await cancelMyOrder("jwt", "order-1");
  await expect(createOrderReturn("jwt", "order-1", { reason: "SIZE", comment: "Мал" })).resolves.toEqual(returned);
  expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/v1/order/my/order-1", {
    method: "PUT", headers: { "Content-Type": "application/json", Authorization: "Bearer jwt" },
    body: JSON.stringify({ address: "Нижний Новгород", deliveryMethod: "courier" }),
  });
  expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/v1/order/my/order-1/cancel", {
    method: "POST", headers: { Authorization: "Bearer jwt" },
  });
  expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/v1/order/my/order-1/returns", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer jwt" },
    body: JSON.stringify({ reason: "SIZE", comment: "Мал" }),
  });
});

test("promo validation and checkout send a typed body and preserve server errors", async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ code: "FALL10", discount_percent: 10 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "order-1", orderNumber: "SUN-1" }) })
    .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ message: "Промокод недействителен" }) });
  vi.stubGlobal("fetch", fetchMock);

  await expect(validatePromoCode("jwt", { code: "FALL10", subtotal: 3500 })).resolves.toMatchObject({ discount_percent: 10 });
  const request = { address: "Магазин SUNSET", items: [{ productId: "product-1", colorId: "color-1", sizeId: "size-1", quantity: 1 }], idempotencyKey: "key-1" };
  await expect(createOrder("jwt", request)).resolves.toMatchObject({ orderNumber: "SUN-1" });
  expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/v1/order", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer jwt" },
    body: JSON.stringify(request),
  });
  await expect(validatePromoCode("jwt", { code: "BAD", subtotal: 3500 })).rejects.toMatchObject({ status: 400, message: "Промокод недействителен" });
});

test("registration and login use versioned public routes without bearer tokens", async () => {
  const registered = { uuid: "user-1", email: "client@example.test", role: "USER", token: null };
  const loggedIn = { ...registered, token: "jwt" };
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => registered })
    .mockResolvedValueOnce({ ok: true, json: async () => loggedIn });
  vi.stubGlobal("fetch", fetchMock);

  const registration = { email: registered.email, password: "long-password", firstName: "Анна", lastName: "Тестовая" };
  await expect(registerCustomer(registration)).resolves.toEqual(registered);
  await expect(loginCustomer({ email: registered.email, password: "long-password" })).resolves.toEqual(loggedIn);
  expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/v1/auth/register", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(registration),
  });
  expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/v1/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: registered.email, password: "long-password" }),
  });
});

test("profile read and update use the bearer token and typed body", async () => {
  const profile = { id: "user-1", email: "client@example.test", firstName: "Анна", lastName: "Тестовая", role: "USER" };
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => profile })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ ...profile, phone: "+79990001122" }) });
  vi.stubGlobal("fetch", fetchMock);

  await expect(getProfile("jwt")).resolves.toEqual(profile);
  const changes = { email: profile.email, firstName: profile.firstName, lastName: profile.lastName, phone: "+79990001122" };
  await expect(updateProfile("jwt", changes)).resolves.toMatchObject({ phone: changes.phone });
  expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/v1/auth/profile", { headers: { Authorization: "Bearer jwt" } });
  expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/v1/auth/profile", {
    method: "PUT", headers: { "Content-Type": "application/json", Authorization: "Bearer jwt" }, body: JSON.stringify(changes),
  });
});

test("password change uses a protected versioned path and returns server errors", async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ message: "Пароль успешно изменён" }) })
    .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ message: "Неверный текущий пароль" }) });
  vi.stubGlobal("fetch", fetchMock);

  const request = { currentPassword: "old-password", newPassword: "new-password" };
  await expect(changePassword("jwt", request)).resolves.toEqual({ message: "Пароль успешно изменён" });
  expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/v1/auth/profile/password", {
    method: "PUT", headers: { "Content-Type": "application/json", Authorization: "Bearer jwt" }, body: JSON.stringify(request),
  });
  await expect(changePassword("jwt", request)).rejects.toMatchObject({ status: 400, message: "Неверный текущий пароль" });
});
