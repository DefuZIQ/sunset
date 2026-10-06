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

test('guest newsletter signup uses the versioned API and shows confirmation', async ({ page }) => {
  let submitted = false;
  await page.route('**/api/v1/subscriptions', async (route) => {
    submitted = true;
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers().authorization).toBeUndefined();
    expect(route.request().postDataJSON()).toEqual({ email: 'guest@sunset.test' });
    await route.fulfill({ json: { active: true, email: 'guest@sunset.test' } });
  });

  await page.goto('/#/');
  await page.getByPlaceholder('Ваш e-mail').fill('guest@sunset.test');
  await page.getByRole('button', { name: 'Подписаться' }).click();
  await expect(page.getByText('Готово! Скидка и новости уже ваши.')).toBeVisible();
  expect(submitted).toBe(true);
});

test('promotions page loads the versioned public API', async ({ page }) => {
  let requested = false;
  await page.route('**/api/v1/order/promotions', async (route) => {
    requested = true;
    await route.fulfill({ json: [{ id: 'promotion-1', code: 'FALL10', title: 'Осенняя скидка', description: 'На любимые вещи', discountPercent: 10, bonusMultiplier: 1, minOrder: 0 }] });
  });

  await page.goto('/#/promotions');
  await expect(page.getByRole('heading', { name: 'Осенняя скидка' })).toBeVisible();
  expect(requested).toBe(true);
});

test('product page loads reviews from the versioned public API', async ({ page }) => {
  let requested = false;
  await page.route('**/api/v1/products/by-uuid', (route) => route.fulfill({ json: products[0] }));
  await page.route('**/api/v1/products/reviews/11111111-1111-1111-1111-111111111111', async (route) => {
    requested = true;
    await route.fulfill({ json: [{ id: 'review-1', authorName: 'Анна', rating: 5, qualityRating: 5, fit: 'AS_EXPECTED', body: 'Прекрасная рубашка', verifiedPurchase: true, createdAt: '2026-10-06T00:00:00Z' }] });
  });

  await page.goto('/#/catalog/product/11111111-1111-1111-1111-111111111111');
  await expect(page.getByText('Прекрасная рубашка')).toBeVisible();
  expect(requested).toBe(true);
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

async function openCheckout(page) {
  const user = {
    id: '33333333-3333-3333-3333-333333333333',
    uuid: '33333333-3333-3333-3333-333333333333',
    firstName: 'Анна',
    lastName: 'Тестовая',
    email: 'anna@example.test',
    phone: '+79990001122',
    role: 'USER',
  };
  await page.route('**/auth/profile', (route) => route.fulfill({ json: user }));
  await page.route('**/order/loyalty', (route) => route.fulfill({ json: { balance: 0 } }));
  await page.route('**/order/delivery/quote', (route) => route.fulfill({ json: { cost: 390, estimatedDays: 3 } }));
  await page.route('**/order/my', (route) => route.fulfill({ json: [] }));
  await page.route('**/notifications?*', (route) => route.fulfill({ json: [] }));
  await page.route('**/subscriptions/status', (route) => route.fulfill({ json: { active: false } }));
  await page.addInitScript(({ account, product }) => {
    localStorage.setItem('authToken', 'e2e-token');
    localStorage.setItem('user', JSON.stringify(account));
    localStorage.setItem('cartItems', JSON.stringify({
      [product.id]: { product: { ...product, selectedSizeId: 'women-m', selectedSizeName: 'M', selectedColorId: 'white', selectedColorName: 'Белый' }, quantity: 1 },
    }));
  }, { account: user, product: products[0] });
  await page.goto('/#/profile/basket');
  await expect(page.getByRole('heading', { name: 'Оформление' })).toBeVisible();
  return user;
}

test('saves and selects a delivery address before checkout', async ({ page }) => {
  const user = await openCheckout(page);
  let submittedOrder;
  await page.route('**/order', async (route) => {
    submittedOrder = route.request().postDataJSON();
    await route.fulfill({ json: { orderNumber: 'SUN-101' } });
  });

  await page.getByRole('button', { name: 'Новый адрес' }).click();
  const addressDialog = page.getByRole('dialog');
  await addressDialog.locator('.address-grid label').filter({ hasText: 'Город' }).locator('input').fill('Нижний Новгород');
  await addressDialog.locator('.address-grid label').filter({ hasText: 'Улица' }).locator('input').fill('Большая Покровская');
  await addressDialog.getByRole('textbox', { name: 'Дом Номер дома' }).fill('34');
  await addressDialog.getByRole('button', { name: 'Сохранить адрес' }).click();
  await expect(addressDialog.getByText('Проверьте точку адреса на карте')).toBeVisible();
  await addressDialog.getByRole('checkbox', { name: 'Точка на карте соответствует адресу' }).check();
  await addressDialog.getByRole('button', { name: 'Сохранить адрес' }).click();

  await expect(addressDialog).toHaveCount(0);
  await expect(page.locator('.saved-address-row').filter({ hasText: 'Большая Покровская' })).toBeVisible();
  await page.getByRole('button', { name: 'Оформить заказ' }).click();
  await expect(page).toHaveURL(/#\/profile\/orders$/);
  expect(submittedOrder).toMatchObject({
    customerPhone: user.phone,
    deliveryMethod: 'courier',
    address: 'Нижний Новгород, ул. Большая Покровская, д. 34',
    items: [{ productId: products[0].id, colorId: 'white', sizeId: 'women-m', quantity: 1 }],
  });
  const saved = await page.evaluate((id) => JSON.parse(localStorage.getItem(`sunsetAddresses:${id}`)), user.id);
  expect(saved).toHaveLength(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cartItems')))).toEqual({});
});

test('pickup checkout needs no delivery address', async ({ page }) => {
  await openCheckout(page);
  let submittedOrder;
  await page.route('**/order', async (route) => {
    submittedOrder = route.request().postDataJSON();
    await route.fulfill({ json: { orderNumber: 'SUN-102' } });
  });

  await page.getByRole('button', { name: 'Самовывоз', exact: true }).click();
  await page.getByRole('button', { name: /SUNSET в ТРЦ НЕБО/ }).click();
  await page.getByRole('button', { name: 'Оформить заказ' }).click();
  await expect(page).toHaveURL(/#\/profile\/orders$/);
  expect(submittedOrder.deliveryMethod).toBe('pickup');
  expect(submittedOrder.address).toContain('Большая Покровская, 82');
});

test('checkout blocks an empty phone number', async ({ page }) => {
  await openCheckout(page);
  let orderRequests = 0;
  await page.route('**/order', (route) => {
    orderRequests += 1;
    return route.fulfill({ json: { orderNumber: 'SHOULD-NOT-HAPPEN' } });
  });

  await page.getByRole('button', { name: 'Самовывоз', exact: true }).click();
  await page.getByRole('button', { name: 'Изменить телефон' }).click();
  await page.locator('.checkout-phone input').fill('');
  await page.getByRole('button', { name: 'Оформить заказ' }).click();

  await expect(page.getByText('Укажите корректный номер телефона')).toBeVisible();
  await expect(page.locator('.checkout-phone input')).toHaveClass(/field-invalid/);
  expect(orderRequests).toBe(0);
});
