import type { components, paths } from "./generated";

export type Product = components["schemas"]["Product"];
type ProductUuidRequest = paths["/products/by-uuid"]["post"]["requestBody"]["content"]["application/json"];

export class ApiHttpError extends Error {
  constructor(public readonly status: number) {
    super(`API request failed (${status})`);
  }
}

/** First migrated client operations; other screens still use compatible legacy paths. */
export async function listProducts(signal?: AbortSignal): Promise<Product[]> {
  const response = await fetch("/api/v1/products/all", { signal });
  if (!response.ok) throw new ApiHttpError(response.status);
  return response.json() as Promise<Product[]>;
}

export async function getProductById(id: string): Promise<Product> {
  const body: ProductUuidRequest = { id };
  const response = await fetch("/api/v1/products/by-uuid", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new ApiHttpError(response.status);
  return response.json() as Promise<Product>;
}
