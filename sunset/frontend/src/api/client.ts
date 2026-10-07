import type { components, paths } from "./generated";

export type Product = components["schemas"]["Product"];
export type CategoryNode = components["schemas"]["CategoryNode"];
export type Promotion = components["schemas"]["Promotion"];
export type ProductReview = components["schemas"]["ProductReview"];
export type LoyaltyAccount = components["schemas"]["LoyaltyAccount"];
export type DeliveryQuote = components["schemas"]["DeliveryQuote"];
export type Order = components["schemas"]["Order"];
export type OrderDetail = components["schemas"]["OrderDetail"];
export type OrderReturn = components["schemas"]["OrderReturn"];
export type AuthResponse = components["schemas"]["AuthResponse"];
export type UserProfile = components["schemas"]["UserProfile"];
export type Notification = components["schemas"]["Notification"];
export type SubscriptionStatus = components["schemas"]["SubscriptionStatus"];
export type UnreadNotificationCount = components["schemas"]["UnreadNotificationCount"];
export type AdminUser = components["schemas"]["AdminUser"];
export type AdminPromotion = components["schemas"]["AdminPromotion"];
export type AdminReturn = components["schemas"]["AdminReturn"];
export type AdminAnalytics = components["schemas"]["AdminAnalytics"];
export type AdminVariants = components["schemas"]["AdminVariants"];
export type AdminProductResult = components["schemas"]["AdminProductResult"];
export type AdminStockResult = components["schemas"]["AdminStockResult"];
export type AdminBonusResult = components["schemas"]["AdminBonusResult"];
export type CustomerAddress = components["schemas"]["CustomerAddress"];
export type CustomerAddressInput = components["schemas"]["CustomerAddressInput"];
export type AddressLookupCandidate = components["schemas"]["AddressLookupCandidate"];
type ProductUuidRequest = paths["/products/by-uuid"]["post"]["requestBody"]["content"]["application/json"];
type SubscribeRequest = paths["/subscriptions"]["post"]["requestBody"]["content"]["application/json"];
type SaveReviewRequest = paths["/products/review/{id}"]["post"]["requestBody"]["content"]["application/json"];
type DeliveryQuoteRequest = paths["/order/delivery/quote"]["post"]["requestBody"]["content"]["application/json"];
type CreateOrderRequest = paths["/order"]["post"]["requestBody"]["content"]["application/json"];
type UpdatePendingOrderRequest = paths["/order/my/{id}"]["put"]["requestBody"]["content"]["application/json"];
type CreateReturnRequest = paths["/order/my/{id}/returns"]["post"]["requestBody"]["content"]["application/json"];
type ValidatePromoRequest = paths["/order/promo/validate"]["post"]["requestBody"]["content"]["application/json"];
type RegisterRequest = paths["/auth/register"]["post"]["requestBody"]["content"]["application/json"];
type LoginRequest = paths["/auth/login"]["post"]["requestBody"]["content"]["application/json"];
type UpdateProfileRequest = paths["/auth/profile"]["put"]["requestBody"]["content"]["application/json"];
type ChangePasswordRequest = paths["/auth/profile/password"]["put"]["requestBody"]["content"]["application/json"];
type AdminProductRequest = paths["/products/admin"]["post"]["requestBody"]["content"]["application/json"];
type AdminStockRequest = paths["/products/admin/{id}/stock"]["put"]["requestBody"]["content"]["application/json"];
type AdminStatusRequest = paths["/order/admin/orders/{id}/status"]["patch"]["requestBody"]["content"]["application/json"];
type AdminBonusRequest = paths["/order/admin/users/{id}/bonuses"]["post"]["requestBody"]["content"]["application/json"];
type AdminPromotionRequest = paths["/order/admin/promotions"]["post"]["requestBody"]["content"]["application/json"];
type AdminReturnStatusRequest = paths["/order/admin/returns/{id}"]["patch"]["requestBody"]["content"]["application/json"];

export class ApiHttpError extends Error {
  constructor(public readonly status: number, message?: string) {
    super(message || `API request failed (${status})`);
  }
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message: string | undefined;
    try {
      const body: unknown = await response.json();
      if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
        message = body.message;
      }
    } catch { /* A proxy may return a non-JSON error. */ }
    throw new ApiHttpError(response.status, message);
  }
  return response.json() as Promise<T>;
}

function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export async function listCustomerAddresses(token: string): Promise<CustomerAddress[]> {
  return readJson<CustomerAddress[]>(await fetch("/api/v1/auth/addresses", { headers: bearer(token) }));
}

export async function getAddressGeocoderStatus(token: string): Promise<components["schemas"]["AddressGeocoderStatus"]> {
  return readJson(await fetch("/api/v1/auth/addresses/geocoder", { headers: bearer(token) }));
}

export async function lookupAddress(token: string, query: string, selected = false): Promise<components["schemas"]["AddressLookupResult"]> {
  return readJson(await fetch("/api/v1/auth/addresses/geocoder", {
    method: "POST", headers: { "Content-Type": "application/json", ...bearer(token) },
    body: JSON.stringify({ query, selected }),
  }));
}

export async function createCustomerAddress(token: string, address: CustomerAddressInput): Promise<CustomerAddress> {
  return readJson<CustomerAddress>(await fetch("/api/v1/auth/addresses", {
    method: "POST", headers: { "Content-Type": "application/json", ...bearer(token) }, body: JSON.stringify(address),
  }));
}

export async function updateCustomerAddress(token: string, id: string, address: CustomerAddressInput): Promise<CustomerAddress> {
  return readJson<CustomerAddress>(await fetch(`/api/v1/auth/addresses/${encodeURIComponent(id)}`, {
    method: "PUT", headers: { "Content-Type": "application/json", ...bearer(token) }, body: JSON.stringify(address),
  }));
}

export async function deleteCustomerAddress(token: string, id: string): Promise<void> {
  const response = await fetch(`/api/v1/auth/addresses/${encodeURIComponent(id)}`, { method: "DELETE", headers: bearer(token) });
  if (!response.ok) throw new ApiHttpError(response.status, "Не удалось удалить адрес");
}

// One-time migration of addresses stored by older versions of the storefront.
export async function syncCustomerAddresses(token: string, accountId: string): Promise<CustomerAddress[]> {
  const addresses = await listCustomerAddresses(token);
  const legacyKey = `sunsetAddresses:${accountId}`;
  let legacy: CustomerAddress[] = [];
  try { legacy = JSON.parse(localStorage.getItem(legacyKey) || "[]"); } catch { /* Ignore corrupt old data. */ }
  if (!Array.isArray(legacy) || legacy.length === 0) return addresses;
  for (const item of legacy) {
    if (!item?.city || !item?.street || !item?.house) continue;
    const same = addresses.some((saved) =>
      [saved.city, saved.street, saved.house, saved.apartment || ""].join("|").toLowerCase() ===
      [item.city, item.street, item.house, item.apartment || ""].join("|").toLowerCase());
    if (!same) addresses.push(await createCustomerAddress(token, item));
  }
  localStorage.removeItem(legacyKey);
  return addresses;
}

export async function registerCustomer(request: RegisterRequest): Promise<AuthResponse> {
  return readJson<AuthResponse>(await fetch("/api/v1/auth/register", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request),
  }));
}

export async function loginCustomer(request: LoginRequest): Promise<AuthResponse> {
  return readJson<AuthResponse>(await fetch("/api/v1/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request),
  }));
}

export async function getProfile(token: string): Promise<UserProfile> {
  return readJson<UserProfile>(await fetch("/api/v1/auth/profile", { headers: bearer(token) }));
}

export async function updateProfile(token: string, request: UpdateProfileRequest): Promise<UserProfile> {
  return readJson<UserProfile>(await fetch("/api/v1/auth/profile", {
    method: "PUT", headers: { "Content-Type": "application/json", ...bearer(token) }, body: JSON.stringify(request),
  }));
}

export async function changePassword(token: string, request: ChangePasswordRequest): Promise<components["schemas"]["Message"]> {
  return readJson<components["schemas"]["Message"]>(await fetch("/api/v1/auth/profile/password", {
    method: "PUT", headers: { "Content-Type": "application/json", ...bearer(token) }, body: JSON.stringify(request),
  }));
}

export async function listAdminOrders(token: string): Promise<Order[]> {
  return readJson<Order[]>(await fetch("/api/v1/order/admin/orders", { headers: bearer(token) }));
}

export async function listAdminUsers(token: string): Promise<AdminUser[]> {
  return readJson<AdminUser[]>(await fetch("/api/v1/order/admin/users", { headers: bearer(token) }));
}

export async function listAdminPromotions(token: string): Promise<AdminPromotion[]> {
  return readJson<AdminPromotion[]>(await fetch("/api/v1/order/admin/promotions", { headers: bearer(token) }));
}

export async function listAdminReturns(token: string): Promise<AdminReturn[]> {
  return readJson<AdminReturn[]>(await fetch("/api/v1/order/admin/returns", { headers: bearer(token) }));
}

export async function getAdminAnalytics(token: string): Promise<AdminAnalytics> {
  return readJson<AdminAnalytics>(await fetch("/api/v1/order/admin/analytics", { headers: bearer(token) }));
}

export async function listAdminVariants(token: string): Promise<AdminVariants> {
  return readJson<AdminVariants>(await fetch("/api/v1/products/admin/variants", { headers: bearer(token) }));
}

export async function createAdminProduct(token: string, request: AdminProductRequest): Promise<AdminProductResult> {
  return readJson<AdminProductResult>(await fetch("/api/v1/products/admin", {
    method: "POST", headers: { "Content-Type": "application/json", ...bearer(token) }, body: JSON.stringify(request),
  }));
}

export async function updateAdminProduct(token: string, id: string, request: AdminProductRequest): Promise<AdminProductResult> {
  return readJson<AdminProductResult>(await fetch(`/api/v1/products/admin/${encodeURIComponent(id)}`, {
    method: "PUT", headers: { "Content-Type": "application/json", ...bearer(token) }, body: JSON.stringify(request),
  }));
}

export async function deleteAdminProduct(token: string, id: string): Promise<void> {
  const response = await fetch(`/api/v1/products/admin/${encodeURIComponent(id)}`, {
    method: "DELETE", headers: bearer(token),
  });
  if (!response.ok) await readJson<never>(response);
}

export async function updateAdminStock(token: string, id: string, request: AdminStockRequest): Promise<AdminStockResult> {
  return readJson<AdminStockResult>(await fetch(`/api/v1/products/admin/${encodeURIComponent(id)}/stock`, {
    method: "PUT", headers: { "Content-Type": "application/json", ...bearer(token) }, body: JSON.stringify(request),
  }));
}

export async function updateAdminOrderStatus(token: string, id: string, request: AdminStatusRequest): Promise<OrderDetail> {
  return readJson<OrderDetail>(await fetch(`/api/v1/order/admin/orders/${encodeURIComponent(id)}/status`, {
    method: "PATCH", headers: { "Content-Type": "application/json", ...bearer(token) }, body: JSON.stringify(request),
  }));
}

export async function adjustAdminBonuses(token: string, id: string, request: AdminBonusRequest): Promise<AdminBonusResult> {
  return readJson<AdminBonusResult>(await fetch(`/api/v1/order/admin/users/${encodeURIComponent(id)}/bonuses`, {
    method: "POST", headers: { "Content-Type": "application/json", ...bearer(token) }, body: JSON.stringify(request),
  }));
}

export async function createAdminPromotion(token: string, request: AdminPromotionRequest): Promise<AdminPromotion> {
  return readJson<AdminPromotion>(await fetch("/api/v1/order/admin/promotions", {
    method: "POST", headers: { "Content-Type": "application/json", ...bearer(token) }, body: JSON.stringify(request),
  }));
}

export async function updateAdminReturnStatus(token: string, id: string, request: AdminReturnStatusRequest): Promise<OrderReturn> {
  return readJson<OrderReturn>(await fetch(`/api/v1/order/admin/returns/${encodeURIComponent(id)}`, {
    method: "PATCH", headers: { "Content-Type": "application/json", ...bearer(token) }, body: JSON.stringify(request),
  }));
}

/** Migrated client operations; other screens still use compatible legacy paths. */
export async function listProducts(signal?: AbortSignal): Promise<Product[]> {
  const response = await fetch("/api/v1/products/all", { signal });
  return readJson<Product[]>(response);
}

export async function getProductById(id: string): Promise<Product> {
  const body: ProductUuidRequest = { id };
  const response = await fetch("/api/v1/products/by-uuid", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return readJson<Product>(response);
}

export async function getCategoryTree(signal?: AbortSignal): Promise<CategoryNode[]> {
  return readJson<CategoryNode[]>(await fetch("/api/v1/products/categories/tree", { signal }));
}

export async function listPromotions(): Promise<Promotion[]> {
  return readJson<Promotion[]>(await fetch("/api/v1/order/promotions"));
}

export async function listProductReviews(id: string): Promise<ProductReview[]> {
  return readJson<ProductReview[]>(await fetch(`/api/v1/products/reviews/${encodeURIComponent(id)}`));
}

export async function saveProductReview(token: string, id: string, review: SaveReviewRequest): Promise<ProductReview> {
  return readJson<ProductReview>(await fetch(`/api/v1/products/review/${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...bearer(token) },
    body: JSON.stringify(review),
  }));
}

export async function getLoyaltyAccount(token: string): Promise<LoyaltyAccount> {
  return readJson<LoyaltyAccount>(await fetch("/api/v1/order/loyalty", { headers: bearer(token) }));
}

export async function quoteDelivery(token: string, quote: DeliveryQuoteRequest): Promise<DeliveryQuote> {
  return readJson<DeliveryQuote>(await fetch("/api/v1/order/delivery/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...bearer(token) },
    body: JSON.stringify(quote),
  }));
}

export async function listMyOrders(token: string): Promise<Order[]> {
  return readJson<Order[]>(await fetch("/api/v1/order/my", { headers: bearer(token) }));
}

export async function getMyOrder(token: string, id: string): Promise<OrderDetail> {
  return readJson<OrderDetail>(await fetch(`/api/v1/order/my/${encodeURIComponent(id)}`, { headers: bearer(token) }));
}

export async function updatePendingOrder(token: string, id: string, changes: UpdatePendingOrderRequest): Promise<OrderDetail> {
  return readJson<OrderDetail>(await fetch(`/api/v1/order/my/${encodeURIComponent(id)}`, {
    method: "PUT", headers: { "Content-Type": "application/json", ...bearer(token) }, body: JSON.stringify(changes),
  }));
}

export async function cancelMyOrder(token: string, id: string): Promise<OrderDetail> {
  return readJson<OrderDetail>(await fetch(`/api/v1/order/my/${encodeURIComponent(id)}/cancel`, {
    method: "POST", headers: bearer(token),
  }));
}

export async function createOrderReturn(token: string, id: string, request: CreateReturnRequest): Promise<OrderReturn> {
  return readJson<OrderReturn>(await fetch(`/api/v1/order/my/${encodeURIComponent(id)}/returns`, {
    method: "POST", headers: { "Content-Type": "application/json", ...bearer(token) }, body: JSON.stringify(request),
  }));
}

export async function validatePromoCode(token: string, request: ValidatePromoRequest): Promise<Record<string, unknown>> {
  return readJson<Record<string, unknown>>(await fetch("/api/v1/order/promo/validate", {
    method: "POST", headers: { "Content-Type": "application/json", ...bearer(token) }, body: JSON.stringify(request),
  }));
}

export async function createOrder(token: string, request: CreateOrderRequest): Promise<Order> {
  return readJson<Order>(await fetch("/api/v1/order", {
    method: "POST", headers: { "Content-Type": "application/json", ...bearer(token) }, body: JSON.stringify(request),
  }));
}

export async function listNotifications(token: string, limit = 30): Promise<Notification[]> {
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
  return readJson<Notification[]>(await fetch(`/api/v1/notifications?limit=${boundedLimit}`, {
    headers: bearer(token),
  }));
}

export async function countUnreadNotifications(token: string): Promise<UnreadNotificationCount> {
  return readJson<UnreadNotificationCount>(await fetch("/api/v1/notifications/unread-count", {
    headers: bearer(token),
  }));
}

export async function markNotificationRead(token: string, id: string): Promise<{ read: boolean }> {
  return readJson<{ read: boolean }>(await fetch(`/api/v1/notifications/${encodeURIComponent(id)}/read`, {
    method: "PATCH",
    headers: bearer(token),
  }));
}

export async function subscribeNewsletter(email: string, token?: string): Promise<SubscriptionStatus> {
  const body: SubscribeRequest = { email };
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return readJson<SubscriptionStatus>(await fetch("/api/v1/subscriptions", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }));
}

export async function getSubscriptionStatus(token: string): Promise<SubscriptionStatus> {
  return readJson<SubscriptionStatus>(await fetch("/api/v1/subscriptions/status", {
    headers: bearer(token),
  }));
}

export async function unsubscribeNewsletter(token: string): Promise<SubscriptionStatus> {
  return readJson<SubscriptionStatus>(await fetch("/api/v1/subscriptions", {
    method: "DELETE",
    headers: bearer(token),
  }));
}
