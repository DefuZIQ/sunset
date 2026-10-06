import type { components, paths } from "./generated";

export type Product = components["schemas"]["Product"];
export type Notification = components["schemas"]["Notification"];
export type SubscriptionStatus = components["schemas"]["SubscriptionStatus"];
export type UnreadNotificationCount = components["schemas"]["UnreadNotificationCount"];
type ProductUuidRequest = paths["/products/by-uuid"]["post"]["requestBody"]["content"]["application/json"];
type SubscribeRequest = paths["/subscriptions"]["post"]["requestBody"]["content"]["application/json"];

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
