import { expect, test } from '@playwright/test';

const products = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Льняная рубашка',
    description: 'Лёгкая женская рубашка из льна',
    price: 3990,
    gender: 'WOMEN',
    categories: ['Для женщин', 'Одежда', 'Рубашки'],
    colors: [{ id: 'white', name: 'Белый', hexCode: '#f4f1eb' }],
    stock: [{ sizeId: 'women-m', sizeName: 'M', sizeType: 'women_clothing', colorId: 'white', colorName: 'Белый', quantity: 5 }],
    rating: 4.9,
    reviewCount: 18,
    imageUrl: '/logo512.png',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Мужское пальто',
    description: 'Тёплое шерстяное пальто',
    price: 12990,
    gender: 'MEN',
    categories: ['Для мужчин', 'Верхняя одежда', 'Пальто'],
    colors: [{ id: 'brown', name: 'Коричневый', hexCode: '#725447' }],
    stock: [{ sizeId: 'men-l', sizeName: 'L', sizeType: 'men_clothing', colorId: 'brown', colorName: 'Коричневый', quantity: 3 }],
    rating: 4.7,
    reviewCount: 9,
    imageUrl: '/logo512.png',
  },
];

const categoryTree = [
  { name: 'Для женщин', children: [{ name: 'Одежда', children: [{ name: 'Рубашки', children: [] }] }] },
  { name: 'Для мужчин', children: [{ name: 'Верхняя одежда', children: [{ name: 'Пальто', children: [] }] }] },
];

test.beforeEach(async ({ page }) => {
  await page.route('**/products/all', (route) => route.fulfill({ json: products }));
  await page.route('**/products/categories/tree', (route) => route.fulfill({ json: categoryTree }));
  await page.route('**/orders/promotions/public', (route) => route.fulfill({ json: [] }));
  await page.addInitScript(() => localStorage.clear());
});

test('opens the catalog and filters products by audience', async ({ page }) => {
  await page.goto('/#/catalog');
  await expect(page).toHaveTitle(/SUNSET/);
  await expect(page.getByRole('heading', { level: 1, name: 'Каталог', exact: true })).toBeVisible();
  await expect(page.getByText('2 товаров', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Для женщин', exact: true }).click();
  await expect(page.getByText('1 товаров', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Льняная рубашка' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Мужское пальто' })).toHaveCount(0);
});

test('search popup opens and navigates to deterministic results', async ({ page }) => {
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Поиск' }).click();
  await page.getByPlaceholder('Что ищем?').fill('пальто');
  await page.getByRole('button', { name: 'Найти' }).click();

  await expect(page).toHaveURL(/#\/search\?q=/);
  await expect(page.getByRole('heading', { name: '«пальто»' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Мужское пальто' })).toBeVisible();
});

test('adds the selected size to the cart', async ({ page }) => {
  await page.goto('/#/catalog');
  const card = page.locator('article.product-card').filter({ hasText: 'Льняная рубашка' });

  await card.hover();
  await card.getByRole('button', { name: 'Выбрать размер' }).click();
  await card.getByRole('button', { name: 'M', exact: true }).click();
  await card.getByRole('button', { name: 'В корзину', exact: true }).click();

  await expect(card.getByRole('button', { name: 'В корзине · 1' })).toBeVisible();
  const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('cartItems') || '{}'));
  expect(Object.values(cart)).toHaveLength(1);
  expect(Object.values(cart)[0].product.selectedSizeName).toBe('M');
});

test('redirects an unauthenticated visitor away from administration', async ({ page }) => {
  await page.goto('/#/admin');
  await expect(page).toHaveURL(/#\/profile$/);
  await expect(page.getByText('Личный кабинет').first()).toBeVisible();
});
