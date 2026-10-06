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
