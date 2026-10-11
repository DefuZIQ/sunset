import { expect, test } from "@playwright/test";

const product = (name) => ({
  id: "11111111-1111-1111-1111-111111111111",
  name,
  description: "Товар для проверки каталога",
  price: 3990,
  gender: "WOMEN",
  categories: ["Для женщин", "Одежда"],
  colors: [{ id: "black", name: "Чёрный", hexCode: "#222222" }],
  stock: [{ sizeId: "m", sizeName: "M", colorId: "black", colorName: "Чёрный", quantity: 5 }],
  imageUrl: "/logo512.png",
});

test("shows cached products immediately while the catalog refreshes", async ({ page }) => {
  await page.route("**/products/all", (route) => route.fulfill({ json: [product("Пальто из кэша")] }));
  await page.goto("/#/catalog");
  await expect(page.locator(".catalog-grid .product-card")).toHaveCount(1);
  await expect(page.getByText("Пальто из кэша")).toBeVisible();

  await page.unroute("**/products/all");
  let releaseRefresh;
  const refresh = new Promise((resolve) => { releaseRefresh = resolve; });
  await page.route("**/products/all", async (route) => {
    await refresh;
    await route.fulfill({ json: [product("Обновлённое пальто")] });
  });
  try {
    await page.reload();
    await expect(page.getByText("Пальто из кэша")).toBeVisible();
    await expect(page.locator(".catalog-grid .product-card-skeleton")).toHaveCount(0);
  } finally {
    releaseRefresh();
  }
  await expect(page.getByText("Обновлённое пальто")).toBeVisible();
});

test("does not show demo products when the API fails without a cache", async ({ page }) => {
  await page.route("**/products/all", (route) => route.fulfill({ status: 503, json: { message: "unavailable" } }));
  await page.goto("/#/catalog");
  await expect(page.getByText("Не удалось загрузить каталог")).toBeVisible();
  await expect(page.locator(".catalog-grid .product-card")).toHaveCount(0);
});
