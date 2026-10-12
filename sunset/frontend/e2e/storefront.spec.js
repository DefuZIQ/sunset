import { expect, test } from '@playwright/test';

async function openReviewFormOnPhone(page) {
  if (page.viewportSize()?.width <= 700) await page.getByRole('button', { name: 'Написать отзыв' }).click();
}

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
  await page.route('**/api/v1/order/stores/admin', (route) => route.fulfill({ json: [
    { id: 'warehouse-1', name: 'Центральный склад', city: 'Нижний Новгород', address: '', kind: 'WAREHOUSE', active: true },
    { id: 'store-1', name: 'SUNSET Центр', city: 'Нижний Новгород', address: 'Большая Покровская, 34', kind: 'STORE', active: true },
  ] }));
  await page.route('**/api/v1/order/stores', (route) => route.fulfill({ json: [
    { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'SUNSET Центр', city: 'Нижний Новгород', address: 'Большая Покровская, 34', kind: 'STORE', active: true },
    { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'SUNSET Небо', city: 'Нижний Новгород', address: 'Бетанкура, 1', kind: 'STORE', active: true },
  ] }));
  await page.route('**/api/v1/products/admin/*/stock?locationId=*', (route) => route.fulfill({ json: products.find((item) => route.request().url().includes(item.id))?.stock || [] }));
  await page.addInitScript(() => localStorage.clear());
});

const manyProducts = Array.from({ length: 110 }, (_, index) => ({
  ...products[0],
  id: `aaaaaaaa-aaaa-aaaa-aaaa-${String(index + 1).padStart(12, '0')}`,
  name: `Рубашка ${index + 1}`,
}));

test('catalog shows clean category names while keeping canonical category filters', async ({ page }) => {
  const coat = {
    ...products[1],
    categories: ['Для мужчин', 'Мужская верхняя одежда', 'Мужские пальто'],
  };
  await page.route('**/products/all', (route) => route.fulfill({ json: [coat] }));
  await page.route('**/products/categories/tree', (route) => route.fulfill({ json: [
    { name: 'Для мужчин', children: [
      { name: 'Мужская верхняя одежда', children: [
        { name: 'Мужские пальто', children: [] },
      ] },
    ] },
  ] }));
  await page.goto('/#/catalog?gender=MEN');
  await expect(page.locator('.category-tree')).toContainText('Верхняя одежда');
  await expect(page.locator('.category-tree')).toContainText('Пальто');
  await expect(page.locator('.category-tree')).not.toContainText('Мужская');
  await expect(page.locator('.product-card__meta')).toContainText('Мужчинам');
  await expect(page.locator('.product-card__meta')).not.toContainText('Мужские');
  if (page.viewportSize()?.width <= 760) await page.locator('.filter-toggle').click();
  await page.locator('.category-tree').getByRole('checkbox', { name: /Пальто/ }).click();
  await expect(page).toHaveURL(/category%5B%5D=%D0%9C%D1%83%D0%B6%D1%81%D0%BA%D0%B8%D0%B5/);
  await expect(page.locator('.catalog-grid .product-card')).toHaveCount(1);
});

test('availability and review rating are the first catalog filter sections', async ({ page }) => {
  await page.goto('/#/catalog');
  await expect(page.locator('.filter-sidebar .filter-section h3').first()).toHaveText('Наличие');
  await expect(page.locator('.filter-sidebar .filter-section h3').nth(1)).toHaveText('Рейтинг по отзывам');
});

test('catalog availability can be limited to a specific store', async ({ page }) => {
  await page.route('**/api/v1/products/all/availability?storeId=*', (route) => route.fulfill({ json: [
    { productId: products[1].id, sizeId: 'men-l', colorId: 'brown', quantity: 2 },
  ] }));
  await page.goto('/#/catalog');
  await page.getByRole('combobox', { name: 'Наличие в магазине' }).selectOption('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
  await expect(page.locator('.catalog-grid .product-card')).toHaveCount(1);
  await expect(page.locator('.catalog-grid')).toContainText('Мужское пальто');
  await expect(page.locator('.catalog-grid')).not.toContainText('Льняная рубашка');
  await expect(page).toHaveURL(/store=bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/);
  await page.getByLabel('Наличие в магазине').selectOption('');
  await expect(page.locator('.catalog-grid .product-card')).toHaveCount(2);
});

test('every home category opens products from its catalog section', async ({ page }) => {
  const sections = [
    ['Верхняя одежда', ['Женская верхняя одежда', 'Мужская верхняя одежда']],
    ['Платья', ['Женские платья']],
    ['Пиджаки', ['Женские пиджаки', 'Мужские пиджаки']],
    ['Джинсы', ['Женские джинсы', 'Мужские джинсы']],
    ['Кофты', ['Женские кофты']],
    ['Юбки', ['Женские юбки']],
  ];
  const categoryProducts = sections.flatMap(([, names]) => names).map((category, index) => ({
    ...products[0],
    id: `bbbbbbbb-bbbb-bbbb-bbbb-${String(index + 1).padStart(12, '0')}`,
    name: `Товар раздела ${index + 1}`,
    gender: category.startsWith('Муж') ? 'MEN' : 'WOMEN',
    categories: [category],
  }));
  await page.route('**/products/all', (route) => route.fulfill({ json: categoryProducts }));

  for (const [label, names] of sections) {
    await page.goto('/#/');
    await page.locator('.category-card').filter({ hasText: label }).click();
    await expect(page).toHaveURL(/#\/catalog\?/);
    await expect(page.locator('.catalog-grid .product-card')).toHaveCount(names.length);
  }
});

test('product card keeps one row of quick sizes and links to remaining sizes', async ({ page }) => {
  const longSizesProduct = {
    ...products[0],
    stock: Array.from({ length: 15 }, (_, index) => ({
      sizeId: `waist-${index + 24}`,
      sizeName: `W${index + 24}`,
      sizeType: 'women_trousers',
      colorId: 'white',
      colorName: 'Белый',
      quantity: 3,
    })),
  };
  await page.route('**/products/all', (route) => route.fulfill({ json: [longSizesProduct] }));
  await page.route('**/api/v1/products/by-uuid', (route) => route.fulfill({ json: longSizesProduct }));

  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 700 });
    await page.goto('/#/catalog');
    const card = page.locator('.catalog-grid .product-card');
    if (width > 760) await card.hover();
    const sizes = card.locator('.product-card__sizes');
    const sizeButtons = sizes.getByRole('button');
    const sizeLink = sizes.getByRole('link', { name: /Ещё .* размеров/ });
    await expect(sizeLink).toBeVisible();
    const visibleCount = await sizeButtons.count();
    expect(visibleCount, `Visible sizes at ${width}px`).toBeGreaterThan(0);
    expect(visibleCount, `Visible sizes at ${width}px`).toBeLessThan(15);
    await expect(sizeLink).toContainText(`Ещё ${15 - visibleCount}`);
    await expect.poll(() => sizeLink.evaluate((element) => {
      const link = element.getBoundingClientRect();
      const card = element.closest('.product-card').getBoundingClientRect();
      const buttons = [...element.parentElement.querySelectorAll('button')].map((button) => button.getBoundingClientRect());
      return link.top >= card.top && link.bottom <= card.bottom + 1 && link.left >= card.left && link.right <= card.right + 1
        && buttons.every((button) => Math.abs(button.top - link.top) <= 3 && button.right <= link.left);
    }), `One size row at ${width}px`).toBe(true);
    await sizeButtons.first().click();
    await expect(sizeButtons.first()).toHaveClass(/selected/);
    await sizeLink.click();
    await expect(page).toHaveURL(/#\/catalog\/product\//);
    await expect(page.locator('.sizes-list .size-btn')).toHaveCount(15);
  }
});

test('desktop catalog paginates and keeps the page in the URL', async ({ page }) => {
  test.skip(page.viewportSize().width <= 760, 'Desktop pagination');
  await page.route('**/products/all', (route) => route.fulfill({ json: manyProducts }));
  await page.goto('/#/catalog');
  await expect(page.locator('.catalog-grid .product-card')).toHaveCount(48);
  await page.getByRole('button', { name: 'Страница 2' }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator('.catalog-grid .product-card')).toHaveCount(48);
  await expect(page.locator('.catalog-grid').getByText('Рубашка 49', { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.locator('.catalog-grid').getByText('Рубашка 1', { exact: true })).toBeVisible();
  await expect(page).not.toHaveURL(/page=2/);
});

test('mobile catalog reveals more products and resets its page after filtering', async ({ page }) => {
  test.skip(page.viewportSize().width > 760, 'Mobile load more');
  await page.route('**/products/all', (route) => route.fulfill({ json: manyProducts }));
  await page.goto('/#/catalog');
  await expect(page.locator('.catalog-grid .product-card')).toHaveCount(20);
  await page.getByRole('button', { name: 'Показать ещё' }).click();
  await expect(page.locator('.catalog-grid .product-card')).toHaveCount(40);
  await expect(page).toHaveURL(/page=2/);
  await page.getByRole('button', { name: 'Для женщин' }).click();
  await expect(page).not.toHaveURL(/page=/);
  await expect(page.locator('.catalog-grid .product-card')).toHaveCount(20);
});

test('back-to-top button becomes available after scrolling', async ({ page }) => {
  await page.route('**/products/all', (route) => route.fulfill({ json: manyProducts }));
  await page.goto('/#/catalog');
  await expect(page.locator('.catalog-grid .product-card').first()).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 900));
  const backToTop = page.getByRole('button', { name: 'Прокрутить наверх' });
  await expect(backToTop).toBeVisible();
  await backToTop.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10);
});

test('guest account popup matches the profile style and keeps its actions on screen', async ({ page }) => {
  test.skip(page.viewportSize().width <= 760, 'Phone layout opens the account from the bottom tab bar');
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Профиль' }).click();

  const popup = page.getByRole('menu', { name: 'Аккаунт' });
  await expect(popup).toBeVisible();
  await expect(popup.getByText('Добро пожаловать')).toBeVisible();
  await expect(popup.getByRole('menuitem', { name: 'Войти' })).toBeVisible();
  await expect(popup.getByRole('menuitem', { name: 'Создать аккаунт' })).toBeVisible();

  const bounds = await popup.boundingBox();
  const viewport = page.viewportSize();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);

  await popup.getByRole('menuitem', { name: 'Создать аккаунт' }).click();
  await expect(page).toHaveURL(/#\/register$/);
});

test('signed-in account popup keeps profile actions accessible on screen', async ({ page }) => {
  test.skip(page.viewportSize().width <= 760, 'Phone layout opens the account from the bottom tab bar');
  const account = { id: '33333333-3333-3333-3333-333333333333', email: 'anna@example.test', firstName: 'Анна', lastName: 'Тестовая', role: 'USER' };
  await page.route('**/api/v1/auth/profile', (route) => route.fulfill({ json: account }));
  await page.addInitScript((user) => {
    localStorage.setItem('authToken', 'e2e-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, account);

  await page.goto('/#/');
  await page.getByRole('button', { name: 'Профиль' }).click();
  const popup = page.getByRole('menu', { name: 'Аккаунт' });
  await expect(popup).toBeVisible();
  await expect(popup.getByText('Анна Тестовая')).toBeVisible();
  await expect(popup.getByRole('menuitem', { name: 'Личный кабинет' })).toBeVisible();
  await expect(popup.getByRole('menuitem', { name: 'Мои заказы' })).toBeVisible();
  await expect(popup.getByRole('button', { name: 'Выйти' })).toBeVisible();
  const bounds = await popup.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize().width);
  await popup.getByRole('menuitem', { name: 'Мои заказы' }).click();
  await expect(page).toHaveURL(/#\/profile\/orders$/);
});

test('empty cart popup uses the shared card style and opens the catalog', async ({ page }) => {
  test.skip(page.viewportSize().width <= 760, 'Phone layout opens the cart from the bottom tab bar');
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Корзина' }).click();
  const popup = page.getByRole('dialog', { name: 'Корзина' });
  await expect(popup).toBeVisible();
  await expect(popup.getByText('Корзина отдыхает')).toBeVisible();
  const bounds = await popup.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize().width);
  await popup.getByRole('link', { name: 'Перейти в каталог' }).click();
  await expect(page).toHaveURL(/#\/catalog$/);
});

test('phone navigation stays inside a 320px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/#/');
  const tabs = page.getByRole('navigation', { name: 'Основная навигация' });
  await expect(tabs).toBeVisible();
  const bounds = await tabs.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
  await expect(tabs.getByRole('link')).toHaveCount(5);
});

test('phone tabs and section menu navigate without horizontal overflow', async ({ page }) => {
  test.skip(page.viewportSize().width > 760, 'Phone-only navigation');
  await page.goto('/#/');
  const tabs = page.getByRole('navigation', { name: 'Основная навигация' });
  await tabs.getByRole('link', { name: 'Каталог' }).click();
  await expect(page).toHaveURL(/#\/catalog$/);
  await page.getByRole('button', { name: 'Открыть меню' }).click();
  await expect(page.getByRole('link', { name: 'АКЦИИ' })).toBeVisible();
  await page.getByRole('link', { name: 'АКЦИИ' }).click();
  await expect(page).toHaveURL(/#\/promotions$/);
  await expect(page.getByRole('button', { name: 'Открыть меню' })).toBeVisible();
  await tabs.getByRole('link', { name: 'Корзина' }).click();
  await expect(page).toHaveURL(/#\/profile\/basket$/);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 700 });
    for (const path of ['/catalog', '/profile/basket', '/about']) {
      await page.goto(`/#${path}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(1);
    }
  }
});

test('last home categories can scroll fully above the phone tabs', async ({ page }) => {
  test.skip(page.viewportSize().width > 760, 'Phone-only layout');
  for (const width of [320, 393]) {
    await page.setViewportSize({ width, height: 760 });
    await page.goto('/#/');
    await expect(page.locator('.category-card')).toHaveCount(6);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const lastCard = await page.locator('.category-card').last().boundingBox();
    const tabs = await page.getByRole('navigation', { name: 'Основная навигация' }).boundingBox();
    expect(lastCard.y + lastCard.height, `Last category at ${width}px`).toBeLessThanOrEqual(tabs.y - 16);
  }
});

test('filled cart popup keeps quantity and selected product navigation', async ({ page }) => {
  test.skip(page.viewportSize().width <= 760, 'Phone layout uses a full cart page');
  const product = { ...products[0], selectedColorId: 'white', selectedColorName: 'Белый', selectedSizeId: 'women-m', selectedSizeName: 'M' };
  await page.addInitScript((item) => {
    localStorage.setItem('cartItems', JSON.stringify({ [`${item.id}::white::women-m`]: { product: item, quantity: 1 } }));
  }, product);

  await page.goto('/#/');
  await page.getByRole('button', { name: 'Корзина' }).click();
  const popup = page.getByRole('dialog', { name: 'Корзина' });
  await expect(popup.getByText('Товаров: 1')).toBeVisible();
  await expect(popup.locator('.cart-popup__total strong')).toHaveText('3 990 ₽');
  await popup.getByRole('button', { name: 'Увеличить количество' }).click();
  await expect(popup.getByText('Товаров: 2')).toBeVisible();
  await popup.getByRole('link', { name: 'Открыть Льняная рубашка с выбранными параметрами' }).click();
  await expect(page).toHaveURL(/color=white&size=women-m/);
});

test('guest newsletter signup uses the versioned API and shows confirmation', async ({ page }) => {
  test.skip(page.viewportSize().width <= 760, 'Newsletter is inside the desktop-only footer');
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

test('phone uses navigation instead of a footer', async ({ page }) => {
  test.skip(page.viewportSize().width > 760, 'Phone-only layout');
  await page.goto('/#/');
  await expect(page.locator('.app-shell > footer')).toBeHidden();
  const tabs = page.getByRole('navigation', { name: 'Основная навигация' });
  await expect(tabs).toBeVisible();
  await page.getByRole('button', { name: 'Открыть меню' }).click();
  await page.getByRole('link', { name: 'КОНТАКТЫ' }).click();
  await expect(page).toHaveURL(/#\/contacts$/);
});

test('customer login uses the versioned API and opens the storefront', async ({ page }) => {
  let submitted = false;
  await page.route('**/api/v1/auth/login', async (route) => {
    submitted = true;
    expect(route.request().postDataJSON()).toEqual({ email: 'anna@example.test', password: 'correct-password' });
    await route.fulfill({ json: {
      uuid: '33333333-3333-3333-3333-333333333333', email: 'anna@example.test',
      firstName: 'Анна', lastName: 'Тестовая', role: 'USER', token: 'e2e-token',
    } });
  });

  await page.goto('/#/login');
  await page.getByPlaceholder('Email').fill('anna@example.test');
  await page.getByPlaceholder('Пароль').fill('correct-password');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(/#\/$/);
  expect(await page.evaluate(() => localStorage.getItem('authToken'))).toBe('e2e-token');
  expect(submitted).toBe(true);
});

test('registration uses the versioned API then signs the customer in', async ({ page }) => {
  let registered = false;
  await page.route('**/api/v1/auth/register', async (route) => {
    registered = true;
    expect(route.request().postDataJSON()).toMatchObject({ email: 'new@example.test', firstName: 'Нина', lastName: 'Тестовая' });
    await route.fulfill({ json: { uuid: '55555555-5555-5555-5555-555555555555', email: 'new@example.test', role: 'USER', token: null } });
  });
  await page.route('**/api/v1/auth/login', (route) => route.fulfill({ json: {
    uuid: '55555555-5555-5555-5555-555555555555', email: 'new@example.test',
    firstName: 'Нина', lastName: 'Тестовая', role: 'USER', token: 'new-token',
  } }));

  await page.goto('/#/register');
  await page.getByPlaceholder('Имя').fill('Нина');
  await page.getByPlaceholder('Фамилия').fill('Тестовая');
  await page.getByPlaceholder('Email').fill('new@example.test');
  await page.getByPlaceholder('Пароль', { exact: true }).fill('correct-password');
  await page.getByPlaceholder('Подтверждение пароля').fill('correct-password');
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
  await expect(page).toHaveURL(/#\/profile$/);
  expect(await page.evaluate(() => localStorage.getItem('authToken'))).toBe('new-token');
  expect(registered).toBe(true);
});

test('signed-in customer opening registration returns to the storefront', async ({ page }) => {
  const account = {
    id: '33333333-3333-3333-3333-333333333333', email: 'anna@example.test',
    firstName: 'Анна', lastName: 'Тестовая', role: 'USER',
  };
  await page.route('**/api/v1/auth/profile', (route) => route.fulfill({ json: account }));
  await page.addInitScript((user) => {
    localStorage.setItem('authToken', 'e2e-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, account);

  await page.goto('/#/register');
  await expect(page).toHaveURL(/#\/$/);
});

test('profile settings save phone and change password via the versioned API', async ({ page }) => {
  const account = {
    id: '33333333-3333-3333-3333-333333333333', email: 'anna@example.test',
    firstName: 'Анна', lastName: 'Тестовая', phone: '+79990001122', role: 'USER',
  };
  await page.route('**/api/v1/auth/profile', async (route) => {
    if (route.request().method() === 'PUT') {
      expect(route.request().headers().authorization).toBe('Bearer e2e-token');
      expect(route.request().postDataJSON().phone).toBe('+79990003344');
      await route.fulfill({ json: { ...account, phone: '+79990003344' } });
    } else await route.fulfill({ json: account });
  });
  await page.route('**/api/v1/auth/profile/password', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ currentPassword: 'old-password', newPassword: 'new-password' });
    await route.fulfill({ json: { message: 'Пароль успешно изменён' } });
  });
  await page.addInitScript((user) => {
    localStorage.setItem('authToken', 'e2e-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, account);

  await page.goto('/#/profile/settings');
  await expect(page.getByRole('heading', { name: 'Настройки профиля' })).toBeVisible();
  await page.getByPlaceholder('+7 999 000-00-00').fill('+79990003344');
  await page.getByRole('button', { name: 'Сохранить изменения' }).click();
  await expect(page.getByText('Изменения сохранены')).toBeVisible();
  const passwordInputs = page.locator('.password-form input');
  await passwordInputs.nth(0).fill('old-password');
  await passwordInputs.nth(1).fill('new-password');
  await passwordInputs.nth(2).fill('new-password');
  await page.getByRole('button', { name: 'Изменить пароль' }).click();
  await expect(page.getByText('Пароль успешно изменён')).toBeVisible();
});

test('profile overview keeps its cards compact and aligned', async ({ page }) => {
  const account = { id: '33333333-3333-3333-3333-333333333333', email: 'anna@example.test', firstName: 'Анна', lastName: 'Тестовая', role: 'USER' };
  await page.route('**/api/v1/auth/profile', (route) => route.fulfill({ json: account }));
  await page.addInitScript((user) => {
    localStorage.setItem('authToken', 'e2e-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, account);
  await page.goto('/#/profile');
  const stats = page.locator('.account-stats a');
  await expect(stats).toHaveCount(3);
  const first = await stats.nth(0).boundingBox();
  const second = await stats.nth(1).boundingBox();
  const last = await stats.nth(2).boundingBox();
  const features = await page.locator('.account-feature').all();
  const featureBoxes = await Promise.all(features.map((feature) => feature.boundingBox()));
  if (page.viewportSize().width <= 640) {
    const menu = await page.locator('.account-nav').boundingBox();
    const firstTab = await page.locator('.account-nav a').first().boundingBox();
    expect(firstTab.y - menu.y).toBeGreaterThanOrEqual(12);
    expect(menu.y + menu.height - firstTab.y - firstTab.height).toBeGreaterThanOrEqual(11);
    expect(Math.abs(first.y - second.y)).toBeLessThan(2);
    expect(last.y).toBeGreaterThan(first.y);
    expect(first.height).toBeLessThan(130);
    expect(last.height).toBeLessThan(100);
    expect(featureBoxes[0].height).toBeLessThan(240);
  } else {
    expect(Math.abs(featureBoxes[0].y - featureBoxes[1].y)).toBeLessThan(2);
    expect(Math.abs(featureBoxes[0].width - featureBoxes[1].width)).toBeLessThan(2);
    expect(first.height).toBeLessThan(155);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
});

test('expired session is cleared after the versioned profile rejects it', async ({ page }) => {
  await page.route('**/api/v1/auth/profile', (route) => route.fulfill({
    status: 401, json: { code: 'UNAUTHORIZED', message: 'Необходим вход в аккаунт' },
  }));
  await page.addInitScript(() => {
    localStorage.setItem('authToken', 'expired-token');
    localStorage.setItem('user', JSON.stringify({ uuid: '33333333-3333-3333-3333-333333333333', email: 'anna@example.test', firstName: 'Анна' }));
  });

  await page.goto('/#/profile');
  await expect(page.getByRole('heading', { name: 'Войдите в аккаунт' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('authToken'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('user'))).toBeNull();
});

test('admin dashboard loads protected data from the versioned API', async ({ page }) => {
  const account = { id: '44444444-4444-4444-4444-444444444444', email: 'admin@example.test', role: 'ADMIN' };
  const requested = new Set();
  const adminResponses = {
    '/api/v1/order/admin/orders': [{ id: 'order-1', orderNumber: 'SUN-1', status: 'PENDING', totalAmount: 3900, customerName: 'Анна', customerPhone: '+79990001122', createdAt: '2026-10-06T00:00:00Z' }],
    '/api/v1/order/admin/users': [{ id: 'user-1', firstName: 'Анна', lastName: 'Тестовая', email: 'anna@example.test', role: 'USER', bonusBalance: 100, orderCount: 1, orderTotal: 3900 }],
    '/api/v1/order/admin/promotions': [],
    '/api/v1/products/admin/variants': { colors: [], sizes: [] },
    '/api/v1/order/stores/admin': [{ id: 'warehouse-1', name: 'Центральный склад', city: 'Нижний Новгород', address: '', kind: 'WAREHOUSE', active: true }],
    '/api/v1/order/admin/returns': [],
    '/api/v1/order/admin/analytics': { orders: { total: 1, last30Days: 1, revenue: 3900 }, returns: { total: 0, requested: 0 }, lowStock: 0, topProducts: [] },
  };
  await page.route('**/api/v1/auth/profile', (route) => route.fulfill({ json: account }));
  for (const [path, response] of Object.entries(adminResponses)) {
    await page.route(`**${path}`, async (route) => {
      expect(route.request().headers().authorization).toBe('Bearer admin-token');
      requested.add(path);
      await route.fulfill({ json: response });
    });
  }
  await page.addInitScript((user) => {
    localStorage.setItem('authToken', 'admin-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, account);

  await page.goto('/#/admin');
  await expect(page.getByRole('heading', { name: 'Управление магазином' })).toBeVisible();
  await expect(page.getByText('2 товаров · 1 клиентов')).toBeVisible();
  await page.getByRole('button', { name: 'Заказы', exact: true }).click();
  await expect(page.getByText('SUN-1')).toBeVisible();
  expect(requested.size).toBe(Object.keys(adminResponses).length);
});

test('admin replies to a review and the reply appears on the product page', async ({ page }) => {
  const account = { id: '44444444-4444-4444-4444-444444444444', email: 'admin@example.test', role: 'ADMIN' };
  const review = { id: 'review-1', productId: products[0].id, productName: products[0].name, authorName: 'Анна', rating: 5, body: 'Удобная рубашка', storeReply: null, isHidden: false, createdAt: '2026-10-06T00:00:00Z' };
  await page.addInitScript((user) => {
    localStorage.setItem('authToken', 'admin-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, account);
  await page.route('**/api/v1/auth/profile', (route) => route.fulfill({ json: account }));
  await page.route('**/api/v1/order/admin/**', (route) => route.fulfill({ json: route.request().url().endsWith('/analytics')
    ? { orders: { total: 0, last30Days: 0, revenue: 0 }, returns: { total: 0, requested: 0 }, lowStock: 0, topProducts: [] } : [] }));
  await page.route('**/api/v1/products/admin/variants', (route) => route.fulfill({ json: { colors: [], sizes: [] } }));
  await page.route('**/api/v1/products/admin/reviews', (route) => route.fulfill({ json: [review] }));
  await page.route('**/api/v1/products/admin/reviews/review-1/reply', (route) => {
    expect(route.request().method()).toBe('PUT');
    expect(route.request().headers().authorization).toBe('Bearer admin-token');
    expect(route.request().postDataJSON()).toEqual({ reply: 'Спасибо за отзыв!' });
    review.storeReply = 'Спасибо за отзыв!';
    review.storeRepliedAt = '2026-10-09T00:00:00Z';
    return route.fulfill({ json: review });
  });
  await page.route('**/api/v1/products/admin/reviews/review-1/moderation', (route) => {
    expect(route.request().headers().authorization).toBe('Bearer admin-token');
    review.isHidden = route.request().postDataJSON().isHidden;
    return route.fulfill({ json: review });
  });
  await page.goto('/#/admin');
  await page.getByRole('button', { name: 'Отзывы', exact: true }).click();
  await expect(page.getByText('Удобная рубашка')).toBeVisible();
  await page.getByRole('textbox', { name: 'Ответ магазина' }).fill('Спасибо за отзыв!');
  await page.getByRole('button', { name: 'Сохранить ответ' }).click();
  await expect(page.getByText('SUNSET отвечает')).toBeVisible();
  await page.getByRole('button', { name: 'Без ответа' }).click();
  await expect(page.getByText('По этому фильтру отзывов нет.')).toBeVisible();
  await page.getByRole('button', { name: 'Опубликованы' }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Скрыть отзыв' }).click();
  await expect(page.getByText('По этому фильтру отзывов нет.')).toBeVisible();
  await page.getByRole('button', { name: 'Скрыты' }).click();
  await expect(page.getByText('Скрыт', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Опубликовать' }).click();
  await expect(page.getByText('По этому фильтру отзывов нет.')).toBeVisible();

  await page.route('**/api/v1/products/by-uuid', (route) => route.fulfill({ json: products[0] }));
  await page.route('**/api/v1/products/reviews/11111111-1111-1111-1111-111111111111', (route) => route.fulfill({ json: [review] }));
  await page.goto(`/#/catalog/product/${products[0].id}`);
  await expect(page.locator('.review-card__reply')).toContainText('Спасибо за отзыв!');
});

test('admin dashboard keeps available sections visible if one API call fails', async ({ page }) => {
  const account = { id: '44444444-4444-4444-4444-444444444444', email: 'admin@example.test', role: 'ADMIN' };
  await page.route('**/api/v1/auth/profile', (route) => route.fulfill({ json: account }));
  await page.route('**/api/v1/order/admin/*', (route) => {
    if (route.request().url().endsWith('/returns')) {
      return route.fulfill({ status: 403, json: { code: 'FORBIDDEN', message: 'Требуются права администратора' } });
    }
    if (route.request().url().endsWith('/analytics')) {
      return route.fulfill({ json: { orders: { total: 1, last30Days: 1, revenue: 3900 }, returns: { total: 0, requested: 0 }, lowStock: 0, topProducts: [] } });
    }
    return route.fulfill({ json: [] });
  });
  await page.route('**/api/v1/products/admin/variants', (route) => route.fulfill({ json: { colors: [], sizes: [] } }));
  await page.addInitScript((user) => {
    localStorage.setItem('authToken', 'admin-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, account);

  await page.goto('/#/admin');
  await expect(page.getByText('Требуются права администратора')).toBeVisible();
  await expect(page.getByText('2 товаров · 0 клиентов')).toBeVisible();
  await expect(page.getByText('3 900 ₽')).toBeVisible();
});

test('admin product forms use versioned writes including empty-body deletion', async ({ page }) => {
  const account = { id: '44444444-4444-4444-4444-444444444444', email: 'admin@example.test', role: 'ADMIN' };
  const writes = [];
  await page.route('**/api/v1/auth/profile', (route) => route.fulfill({ json: account }));
  await page.route('**/api/v1/order/admin/*', (route) => route.fulfill({ json: route.request().url().endsWith('/analytics')
    ? { orders: { total: 0, last30Days: 0, revenue: 0 }, returns: { total: 0, requested: 0 }, lowStock: 0, topProducts: [] } : [] }));
  await page.route('**/api/v1/products/admin', async (route) => {
    writes.push({ path: new URL(route.request().url()).pathname, method: route.request().method(), body: route.request().postDataJSON() });
    await route.fulfill({ status: 201, json: { id: 'product-new', name: 'Новое пальто', price: 9000 } });
  });
  await page.route('**/api/v1/products/admin/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/variants')) return route.fulfill({ json: {
      colors: [{ id: 'white', name: 'Белый', hexCode: '#f4f1eb' }],
      sizes: [{ id: 'women-m', name: 'M', type: 'women_clothing' }],
    } });
    if (path.endsWith('/stock') && route.request().method() === 'GET') return route.fulfill({ json: products[0].stock });
    writes.push({ path, method: route.request().method(), body: route.request().postDataJSON() });
    if (route.request().method() === 'DELETE') return route.fulfill({ status: 204, body: '' });
    await route.fulfill({ json: path.endsWith('/stock')
      ? { id: products[0].id, totalQuantity: 6, totalVariants: 1 }
      : { id: products[0].id, name: 'Льняная рубашка', price: 4500 } });
  });
  await page.addInitScript((user) => {
    localStorage.setItem('authToken', 'admin-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, account);
  page.on('dialog', (dialog) => dialog.accept());

  await page.goto('/#/admin');
  await expect(page.getByText('2 товаров · 0 клиентов')).toBeVisible();
  await page.getByRole('button', { name: 'Товары', exact: true }).click();
  const createForm = page.locator('.admin-products-layout form.admin-form');
  await createForm.getByLabel('Название').fill('Новое пальто');
  await createForm.getByLabel('Цена').fill('9000');
  await createForm.getByRole('button', { name: 'Добавить в каталог' }).click();
  await expect.poll(() => writes.length).toBe(1);

  await page.locator('.admin-product-list article').first().getByRole('button', { name: 'Изменить' }).click();
  await page.locator('.admin-modal__body').getByLabel('Цена').fill('4500');
  await page.getByRole('button', { name: 'Сохранить карточку' }).click();
  await expect.poll(() => writes.length).toBe(2);
  await page.locator('.admin-product-list article').first().getByRole('button', { name: 'Удалить' }).click();
  await expect.poll(() => writes.length).toBe(3);

  await page.getByRole('button', { name: 'Остатки', exact: true }).click();
  await page.getByRole('tree', { name: 'Сначала выберите категорию' }).getByRole('button', { name: /Рубашки/ }).click();
  await page.locator('.stock-row input[type="number"]').first().fill('6');
  await page.getByRole('button', { name: 'Сохранить остатки' }).click();
  await expect.poll(() => writes.length).toBe(4);

  expect(writes.map((item) => item.method)).toEqual(['POST', 'PUT', 'DELETE', 'PUT']);
  expect(writes[0].path).toBe('/api/v1/products/admin');
  expect(writes[0].body).toMatchObject({ name: 'Новое пальто', price: 9000 });
  expect(writes[1].path).toBe(`/api/v1/products/admin/${products[0].id}`);
  expect(writes[2].path).toBe(`/api/v1/products/admin/${products[0].id}`);
  expect(writes[3].path).toBe(`/api/v1/products/admin/${products[0].id}/stock`);
  expect(writes[3].body.locationId).toBe('warehouse-1');
  expect(writes[3].body.stock[0]).toMatchObject({ quantity: 6 });
});

test('admin order, return, promotion and bonus actions use versioned writes', async ({ page }) => {
  const account = { id: '44444444-4444-4444-4444-444444444444', email: 'admin@example.test', role: 'ADMIN' };
  const writes = [];
  await page.route('**/api/v1/auth/profile', (route) => route.fulfill({ json: account }));
  await page.route('**/api/v1/products/admin/variants', (route) => route.fulfill({ json: { colors: [], sizes: [] } }));
  await page.route('**/api/v1/order/admin/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    if (method !== 'GET') {
      writes.push({ path, method, body: route.request().postDataJSON() });
      const response = path.endsWith('/bonuses') ? { userId: 'user-1', balance: 200, applied: 100 }
        : path.endsWith('/promotions') ? { id: 'promo-1', code: 'NEW10', title: 'Новинка', active: true }
          : path.includes('/returns/') ? { id: 'return-1', status: 'APPROVED' }
            : { id: 'order-1', status: 'CONFIRMED' };
      return route.fulfill({ status: method === 'POST' && path.endsWith('/promotions') ? 201 : 200, json: response });
    }
    const response = path.endsWith('/orders')
      ? [{ id: 'order-1', orderNumber: 'SUN-1', status: 'PENDING', totalAmount: 3900, customerName: 'Анна', customerPhone: '+79990001122', createdAt: '2026-10-06T00:00:00Z' }]
      : path.endsWith('/users')
        ? [{ id: 'user-1', firstName: 'Анна', lastName: 'Тестовая', email: 'anna@example.test', role: 'USER', bonusBalance: 100, orderCount: 1, orderTotal: 3900 }]
        : path.endsWith('/returns')
          ? [{ id: 'return-1', orderNumber: 'SUN-1', email: 'anna@example.test', reason: 'SIZE', status: 'REQUESTED', refund_amount: 3900, created_at: '2026-10-06T00:00:00Z' }]
          : path.endsWith('/analytics')
            ? { orders: { total: 1, last30Days: 1, revenue: 3900 }, returns: { total: 1, requested: 1 }, lowStock: 0, topProducts: [] }
            : [];
    await route.fulfill({ json: response });
  });
  await page.addInitScript((user) => {
    localStorage.setItem('authToken', 'admin-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, account);

  await page.goto('/#/admin');
  await expect(page.getByText('2 товаров · 1 клиентов')).toBeVisible();
  await page.getByRole('button', { name: 'Заказы', exact: true }).click();
  await page.locator('.admin-table select').selectOption('CONFIRMED');
  await expect.poll(() => writes.length).toBe(1);
  await page.getByRole('button', { name: 'Возвраты', exact: true }).click();
  await page.locator('.admin-table select').selectOption('APPROVED');
  await expect.poll(() => writes.length).toBe(2);
  await page.getByRole('button', { name: 'Акции', exact: true }).click();
  await page.locator('form.admin-form').getByLabel('Код').fill('NEW10');
  await page.locator('form.admin-form').getByLabel('Название').fill('Новинка');
  await page.getByRole('button', { name: 'Запустить акцию' }).click();
  await expect.poll(() => writes.length).toBe(3);
  await page.getByRole('button', { name: 'Клиенты', exact: true }).click();
  await page.locator('.bonus-control input').fill('100');
  await page.getByRole('button', { name: 'Применить' }).click();
  await expect.poll(() => writes.length).toBe(4);

  expect(writes.map((item) => [item.method, item.path])).toEqual([
    ['PATCH', '/api/v1/order/admin/orders/order-1/status'],
    ['PATCH', '/api/v1/order/admin/returns/return-1'],
    ['POST', '/api/v1/order/admin/promotions'],
    ['POST', '/api/v1/order/admin/users/user-1/bonuses'],
  ]);
  expect(writes[0].body).toEqual({ status: 'CONFIRMED' });
  expect(writes[1].body).toEqual({ status: 'APPROVED' });
  expect(writes[2].body).toMatchObject({ code: 'NEW10', title: 'Новинка', discountPercent: 10 });
  expect(writes[3].body).toMatchObject({ amount: 100 });
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

test('review photo opens fullscreen with its text and closes by Escape', async ({ page }) => {
  await page.route('**/api/v1/products/by-uuid', (route) => route.fulfill({ json: products[0] }));
  await page.route('**/api/v1/products/reviews/11111111-1111-1111-1111-111111111111', (route) => route.fulfill({ json: [{ id: 'review-photo', authorName: 'Анна', rating: 5, qualityRating: 5, fit: 'AS_EXPECTED', body: 'Фото и отзыв на весь экран', photoUrl: '/logo512.png', verifiedPurchase: true, createdAt: '2026-10-06T00:00:00Z' }] }));

  await page.goto('/#/catalog/product/11111111-1111-1111-1111-111111111111');
  await page.getByRole('button', { name: /Открыть фото из отзыва Анна на весь экран/ }).click();
  const viewer = page.getByRole('dialog', { name: 'Фото и отзыв Анна' });
  await expect(viewer).toBeVisible();
  await expect(viewer.getByText('Фото и отзыв на весь экран')).toBeVisible();
  await expect(viewer.locator('img')).toHaveAttribute('src', '/logo512.png');
  if (page.viewportSize().width < 700) {
    const placement = await page.evaluate(() => {
      const image = document.querySelector('.review-photo-viewer__stage img').getBoundingClientRect();
      const caption = document.querySelector('.review-photo-viewer__caption').getBoundingClientRect();
      return { overlayZ: Number(getComputedStyle(document.querySelector('.product-overlay')).zIndex), imageBottom: image.bottom, captionTop: caption.top, captionBottom: caption.bottom };
    });
    expect(placement.overlayZ).toBeGreaterThan(12000);
    expect(placement.captionTop).toBeLessThan(placement.imageBottom);
    expect(placement.captionBottom).toBeLessThanOrEqual(placement.imageBottom + 1);
  }
  await page.keyboard.press('Escape');
  await expect(viewer).toHaveCount(0);
});

test('review photo carousel shows all photos, swipes and opens the matching review', async ({ page }) => {
  await page.route('**/api/v1/products/by-uuid', (route) => route.fulfill({ json: products[0] }));
  await page.route('**/api/v1/products/reviews/11111111-1111-1111-1111-111111111111', (route) => route.fulfill({ json: [
    { id: 'photo-1', authorName: 'Анна', rating: 5, body: 'Первое фото', photoUrl: '/logo512.png', createdAt: '2026-10-06T00:00:00Z' },
    { id: 'photo-2', authorName: 'Мария', rating: 4, body: 'Второе фото', photoUrl: '/logo192.png', createdAt: '2026-10-05T00:00:00Z' },
    { id: 'photo-3', authorName: 'Ольга', rating: 3, body: 'Третье фото', photoUrl: '/logo512.png', createdAt: '2026-10-04T00:00:00Z' },
    { id: 'photo-4', authorName: 'Елена', rating: 5, body: 'Четвёртое фото', photoUrl: '/logo512.png', createdAt: '2026-10-03T00:00:00Z' },
    { id: 'photo-5', authorName: 'София', rating: 4, body: 'Пятое фото', photoUrl: '/logo512.png', createdAt: '2026-10-02T00:00:00Z' },
    ...Array.from({ length: 9 }, (_, index) => ({ id: `photo-${index + 6}`, authorName: `Покупатель ${index + 6}`, rating: 5, body: `Фото ${index + 6}`, photoUrl: '/logo512.png', createdAt: '2026-10-01T00:00:00Z' })),
  ] }));

  await page.goto('/#/catalog/product/11111111-1111-1111-1111-111111111111');
  const gallery = page.getByRole('region', { name: 'Фото с отзывами' });
  await expect(gallery.locator('.review-gallery__item')).toHaveCount(14);
  await expect(gallery.locator('..')).toHaveClass(/reviews-toolbar/);
  await expect(gallery.locator('..').locator('.reviews-filters')).toBeVisible();
  expect(await gallery.evaluate((element) => Boolean(element.compareDocumentPosition(document.querySelector('.reviews-filters')) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  expect(await gallery.locator('.review-gallery__item').first().evaluate((element) => element.getBoundingClientRect().width)).toBeLessThan(130);
  await page.locator('.reviews-filters__ratings').getByRole('button', { name: /5 ★/ }).click();
  await expect(gallery.locator('.review-gallery__item')).toHaveCount(14);
  const track = gallery.locator('.review-gallery__track');
  const initialScroll = await track.evaluate((element) => element.scrollLeft);
  await gallery.getByRole('button', { name: 'Следующие фотоотзывы' }).click();
  await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeGreaterThan(initialScroll);
  await gallery.getByRole('button', { name: 'Открыть фото и отзыв Мария' }).click();
  const viewer = page.getByRole('dialog', { name: 'Фото и отзыв Мария' });
  await expect(viewer.getByText('Второе фото')).toBeVisible();
  await expect(viewer.locator('img')).toHaveAttribute('src', '/logo192.png');
});

test('contacts lists every active store and marks each located store on the map', async ({ page }) => {
  await page.route('**/api/v1/order/stores', (route) => route.fulfill({ json: [
    { id: 'store-1', name: 'SUNSET Центр', city: 'Нижний Новгород', address: 'Большая Покровская, 34', hours: '10:00–21:00', latitude: 56.3269, longitude: 44.0059, active: true },
    { id: 'store-2', name: 'SUNSET Небо', city: 'Нижний Новгород', address: 'Большая Покровская, 82', phone: '+7 831 000-00-00', latitude: 56.313, longitude: 43.997, active: true },
    { id: 'store-hidden', name: 'Закрытый магазин', city: 'Москва', address: 'Адрес', latitude: 55.75, longitude: 37.62, active: false },
  ] }));
  await page.route(/tile\.openstreetmap\.org/, (route) => route.abort());

  await page.goto('/#/contacts');
  await expect(page.getByRole('heading', { name: 'Наши магазины' })).toBeVisible();
  await expect(page.locator('.store-card')).toHaveCount(2);
  await expect(page.getByRole('img', { name: 'Карта магазинов SUNSET: 2 меток' })).toBeVisible();
  await expect(page.locator('.stores-map .leaflet-interactive')).toHaveCount(2);
  await page.getByRole('button', { name: 'Показать SUNSET Небо на карте' }).click();
  await expect(page.locator('.store-card').nth(1)).toHaveClass(/is-selected/);
  await expect(page.getByText('Закрытый магазин')).toHaveCount(0);
});

test('customer can cancel or confirm deletion of only their own review', async ({ page }) => {
  const account = { id: '33333333-3333-3333-3333-333333333333', email: 'anna@example.test', role: 'USER' };
  let reviews = [
    { id: 'own-review', userId: account.id, authorName: 'Анна', rating: 5, body: 'Мой отзыв о рубашке', createdAt: '2026-10-06T00:00:00Z' },
    { id: 'other-review', userId: '44444444-4444-4444-4444-444444444444', authorName: 'Мария', rating: 4, body: 'Чужой отзыв о рубашке', createdAt: '2026-10-05T00:00:00Z' },
  ];
  let deleteCalls = 0;
  await page.addInitScript((user) => {
    localStorage.setItem('authToken', 'e2e-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, account);
  await page.route('**/api/v1/auth/profile', (route) => route.fulfill({ json: account }));
  await page.route('**/api/v1/products/by-uuid', (route) => route.fulfill({ json: products[0] }));
  await page.route('**/api/v1/products/reviews/11111111-1111-1111-1111-111111111111', (route) => route.fulfill({ json: reviews }));
  await page.route('**/api/v1/products/reviews/own-review', (route) => {
    if (route.request().method() !== 'DELETE') return route.fallback();
    deleteCalls += 1;
    reviews = reviews.filter((item) => item.id !== 'own-review');
    return route.fulfill({ status: 204, body: '' });
  });

  await page.goto('/#/catalog/product/11111111-1111-1111-1111-111111111111');
  await expect(page.getByRole('button', { name: 'Удалить отзыв' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Удалить отзыв' }).click();
  await expect(page.getByRole('alertdialog', { name: 'Удалить отзыв?' })).toBeVisible();
  await page.getByRole('button', { name: 'Оставить отзыв' }).click();
  expect(deleteCalls).toBe(0);
  await expect(page.getByText('Мой отзыв о рубашке')).toBeVisible();

  await page.getByRole('button', { name: 'Удалить отзыв' }).click();
  await page.getByRole('button', { name: 'Удалить навсегда' }).click();
  await expect(page.getByRole('alertdialog', { name: 'Удалить отзыв?' })).toHaveCount(0);
  await expect(page.getByText('Мой отзыв о рубашке')).toHaveCount(0);
  await expect(page.getByText('Чужой отзыв о рубашке')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Ваш отзыв удалён');
  expect(deleteCalls).toBe(1);
});

test('size guide uses product measurements and selects an available size', async ({ page }) => {
  const product = { ...products[0], stock: [
    { ...products[0].stock[0], sizeDescription: 'Обхват груди 88–92 см' },
    { ...products[0].stock[0], sizeId: 'women-l', sizeName: 'L', sizeDescription: 'Обхват груди 96–100 см', quantity: 2 },
  ] };
  await page.route('**/api/v1/products/by-uuid', (route) => route.fulfill({ json: product }));
  await page.route('**/api/v1/products/reviews/11111111-1111-1111-1111-111111111111', (route) => route.fulfill({ json: [] }));

  await page.goto('/#/catalog/product/11111111-1111-1111-1111-111111111111');
  await page.getByRole('button', { name: /Таблица размеров/ }).click();
  const guide = page.getByRole('dialog', { name: 'Размерная таблица' });
  await expect(guide).toBeVisible();
  await expect(guide).toContainText('Обхват груди 96–100 см');
  await guide.getByRole('row', { name: /L Обхват груди 96–100 см/ }).getByRole('button', { name: /Выбрать/ }).click();
  await expect(guide).toHaveCount(0);
  await expect(page.locator('.sizes-list .size-btn', { hasText: 'L' })).toHaveClass(/selected/);
});

test('large desktop product image aligns with details and mobile image stays uncropped', async ({ page }) => {
  await page.route('**/api/v1/products/by-uuid', (route) => route.fulfill({ json: products[0] }));
  await page.route('**/api/v1/products/reviews/11111111-1111-1111-1111-111111111111', (route) => route.fulfill({ json: [] }));

  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#/catalog/product/11111111-1111-1111-1111-111111111111');
    const layout = await page.evaluate(() => {
      const image = document.querySelector('.product-detail-image');
      const picture = image.querySelector('img');
      const details = document.querySelector('.product-detail-info');
      return { image: image.getBoundingClientRect().toJSON(), details: details.getBoundingClientRect().toJSON(), fit: getComputedStyle(picture).objectFit };
    });
    if (width <= 700) {
      expect(layout.fit).toBe('contain');
      expect(Math.abs(layout.image.width - layout.details.width)).toBeLessThan(2);
      expect(layout.image.top).toBeGreaterThanOrEqual(70);
    } else {
      expect(layout.fit).toBe('cover');
      expect(layout.image.width).toBeGreaterThan(layout.details.width);
      expect(layout.image.height).toBeGreaterThanOrEqual(850);
      expect(Math.abs(layout.image.height - layout.details.height)).toBeLessThan(2);
    }
  }
});

test('mobile review composer opens on demand and preserves a draft', async ({ page }) => {
  test.skip(page.viewportSize()?.width > 700, 'Mobile-only layout');
  const account = { id: '33333333-3333-3333-3333-333333333333', email: 'anna@example.test', role: 'USER' };
  await page.addInitScript((user) => {
    localStorage.setItem('authToken', 'e2e-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, account);
  await page.route('**/api/v1/auth/profile', (route) => route.fulfill({ json: account }));
  await page.route('**/api/v1/products/by-uuid', (route) => route.fulfill({ json: products[0] }));
  await page.route('**/api/v1/products/reviews/11111111-1111-1111-1111-111111111111', (route) => route.fulfill({ json: [] }));

  await page.goto('/#/catalog/product/11111111-1111-1111-1111-111111111111');
  const form = page.locator('#review-form');
  const toggle = page.getByRole('button', { name: 'Написать отзыв' });
  await expect(toggle).toBeVisible();
  await expect(form).toBeHidden();
  await toggle.click();
  await expect(form).toBeVisible();
  await form.getByPlaceholder('Расскажите о посадке, ткани и впечатлениях').fill('Черновик отзыва');
  await page.getByRole('button', { name: 'Свернуть форму' }).click();
  await expect(form).toBeHidden();
  await toggle.click();
  await expect(form.getByPlaceholder('Расскажите о посадке, ткани и впечатлениях')).toHaveValue('Черновик отзыва');
});

test('customer rates a product and its quality with stars', async ({ page }) => {
  const account = { id: '33333333-3333-3333-3333-333333333333', email: 'anna@example.test', role: 'USER' };
  let submitted = null;
  await page.addInitScript((user) => {
    localStorage.setItem('authToken', 'e2e-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, account);
  await page.route('**/api/v1/auth/profile', (route) => route.fulfill({ json: account }));
  await page.route('**/api/v1/products/by-uuid', (route) => route.fulfill({ json: products[0] }));
  await page.route('**/api/v1/products/reviews/11111111-1111-1111-1111-111111111111', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/v1/products/review/11111111-1111-1111-1111-111111111111', (route) => {
    submitted = route.request().postDataJSON();
    return route.fulfill({ json: { id: 'new-review', ...submitted, authorName: 'Анна' } });
  });

  await page.goto('/#/catalog/product/11111111-1111-1111-1111-111111111111');
  await openReviewFormOnPhone(page);
  const overall = page.getByRole('group', { name: 'Общая оценка' });
  const quality = page.getByRole('group', { name: 'Качество' });
  await expect(overall.getByRole('radio')).toHaveCount(5);
  await expect(quality.getByRole('radio')).toHaveCount(5);
  await overall.getByRole('radio', { name: '3 из 5' }).check();
  await quality.getByRole('radio', { name: '4 из 5' }).check();
  await overall.getByRole('radio', { name: '3 из 5' }).press('ArrowRight');
  await expect(overall.getByRole('radio', { name: '4 из 5' })).toBeChecked();
  await overall.getByRole('radio', { name: '4 из 5' }).press('ArrowLeft');
  await expect(overall.getByRole('radio', { name: '3 из 5' })).toBeChecked();
  await expect(quality.getByRole('radio', { name: '4 из 5' })).toBeChecked();
  await page.getByRole('combobox', { name: 'Как подошёл размер' }).selectOption('SMALL');
  await page.getByPlaceholder('Расскажите о посадке, ткани и впечатлениях').fill('Удобная и качественная рубашка');
  await expect(page.locator('.review-form__comment small')).toHaveText(`${'Удобная и качественная рубашка'.length} / 1500`);
  await page.getByRole('button', { name: 'Опубликовать' }).click();
  await expect(page.getByText('Спасибо! Отзыв опубликован.')).toBeVisible();
  expect(submitted).toMatchObject({ rating: 3, qualityRating: 4, fit: 'SMALL', body: 'Удобная и качественная рубашка' });
});

test('customer uploads a review photo before publishing the review', async ({ page }) => {
  const account = { id: '33333333-3333-3333-3333-333333333333', email: 'anna@example.test', role: 'USER' };
  const photoUrl = '/api/v1/products/review-photos/55555555-5555-5555-5555-555555555555';
  let published = null;
  const savedRequests = [];
  await page.addInitScript((user) => {
    localStorage.setItem('authToken', 'e2e-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, account);
  await page.route('**/api/v1/auth/profile', (route) => route.fulfill({ json: account }));
  await page.route('**/api/v1/products/by-uuid', (route) => route.fulfill({ json: products[0] }));
  await page.route('**/api/v1/products/reviews/11111111-1111-1111-1111-111111111111', (route) => route.fulfill({ json: published ? [published] : [] }));
  await page.route('**/api/v1/products/review/11111111-1111-1111-1111-111111111111/photo', (route) => {
    expect(route.request().headers().authorization).toBe('Bearer e2e-token');
    expect(route.request().headers()['content-type']).toContain('multipart/form-data');
    return route.fulfill({ json: { photoUrl } });
  });
  await page.route('**/api/v1/products/review/11111111-1111-1111-1111-111111111111', (route) => {
    const request = route.request().postDataJSON();
    savedRequests.push(request);
    published = { id: 'review-with-photo', userId: account.id, authorName: 'Анна', rating: 5, photoUrl: request.photoUrl ?? published?.photoUrl ?? null, createdAt: '2026-10-09T00:00:00Z', ...request };
    return route.fulfill({ json: published });
  });
  await page.route('**/api/v1/products/review-photos/55555555-5555-5555-5555-555555555555', (route) => route.fulfill({ body: Buffer.from('image'), contentType: 'image/png' }));

  await page.goto('/#/catalog/product/11111111-1111-1111-1111-111111111111');
  await openReviewFormOnPhone(page);
  await page.getByLabel('Фото товара (необязательно)').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('image') });
  await expect(page.getByAltText('Предпросмотр фотографии отзыва')).toBeVisible();
  await expect(page.getByText('Фото загружено. Теперь опубликуйте отзыв.')).toBeVisible();
  await page.getByPlaceholder('Расскажите о посадке, ткани и впечатлениях').fill('Хорошая ткань');
  await page.getByRole('button', { name: 'Опубликовать' }).click();
  await expect(page.getByText('Спасибо! Отзыв и фото опубликованы.')).toBeVisible();
  await expect(page.locator('.review-card .review-photo')).toHaveAttribute('src', photoUrl);
  expect(savedRequests[0]).toMatchObject({ body: 'Хорошая ткань', photoUrl });
  await page.getByRole('button', { name: 'Изменить отзыв и фото' }).click();
  await expect(page.getByAltText('Текущее фото отзыва')).toHaveAttribute('src', photoUrl);
  await page.getByPlaceholder('Расскажите о посадке, ткани и впечатлениях').fill('Хорошая ткань после стирки');
  await page.getByRole('button', { name: 'Опубликовать' }).click();
  await expect(page.locator('.review-card .review-photo')).toHaveAttribute('src', photoUrl);
  expect(savedRequests[1]).not.toHaveProperty('photoUrl');
});

test('customer can attach a photo to an already published review', async ({ page }) => {
  const account = { id: '33333333-3333-3333-3333-333333333333', email: 'anna@example.test', role: 'USER' };
  const photoUrl = '/api/v1/products/review-photos/55555555-5555-5555-5555-555555555555';
  let published = { id: 'existing-review', userId: account.id, authorName: 'Анна', rating: 5, body: 'Хорошая ткань', photoUrl: null, createdAt: '2026-10-09T00:00:00Z' };
  await page.addInitScript((user) => {
    localStorage.setItem('authToken', 'e2e-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, account);
  await page.route('**/api/v1/auth/profile', (route) => route.fulfill({ json: account }));
  await page.route('**/api/v1/products/by-uuid', (route) => route.fulfill({ json: products[0] }));
  await page.route('**/api/v1/products/reviews/11111111-1111-1111-1111-111111111111', (route) => route.fulfill({ json: [published] }));
  await page.route('**/api/v1/products/review/11111111-1111-1111-1111-111111111111/photo', (route) => route.fulfill({ json: { photoUrl } }));
  await page.route('**/api/v1/products/review/11111111-1111-1111-1111-111111111111', (route) => {
    const request = route.request().postDataJSON();
    expect(request).toMatchObject({ body: 'Хорошая ткань', photoUrl });
    published = { ...published, ...request };
    return route.fulfill({ json: published });
  });
  await page.goto('/#/catalog/product/11111111-1111-1111-1111-111111111111');
  await page.getByRole('button', { name: 'Изменить отзыв и фото' }).click();
  await page.getByLabel('Фото товара (необязательно)').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('image') });
  await page.getByRole('button', { name: 'Опубликовать' }).click();
  await expect(page.getByText('Спасибо! Отзыв и фото опубликованы.')).toBeVisible();
  await expect(page.locator('.review-card .review-photo')).toHaveAttribute('src', photoUrl);
});

test('review form explains an oversized photo response without losing the draft', async ({ page }) => {
  const account = { id: '33333333-3333-3333-3333-333333333333', email: 'anna@example.test', role: 'USER' };
  let reviewSubmitted = false;
  await page.addInitScript((user) => {
    localStorage.setItem('authToken', 'e2e-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, account);
  await page.route('**/api/v1/auth/profile', (route) => route.fulfill({ json: account }));
  await page.route('**/api/v1/products/by-uuid', (route) => route.fulfill({ json: products[0] }));
  await page.route('**/api/v1/products/reviews/11111111-1111-1111-1111-111111111111', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/v1/products/review/11111111-1111-1111-1111-111111111111/photo', (route) => route.fulfill({ status: 413, body: 'Request Entity Too Large' }));
  await page.route('**/api/v1/products/review/11111111-1111-1111-1111-111111111111', (route) => {
    reviewSubmitted = true;
    return route.fulfill({ json: {} });
  });

  await page.goto('/#/catalog/product/11111111-1111-1111-1111-111111111111');
  await openReviewFormOnPhone(page);
  await page.getByLabel('Фото товара (необязательно)').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('image') });
  await page.getByPlaceholder('Расскажите о посадке, ткани и впечатлениях').fill('Отзыв останется после ошибки');
  await expect(page.getByRole('alert')).toContainText('Фото слишком большое для загрузки. Выберите другое изображение.');
  await expect(page.getByRole('button', { name: 'Опубликовать' })).toBeDisabled();
  await expect(page.getByPlaceholder('Расскажите о посадке, ткани и впечатлениях')).toHaveValue('Отзыв останется после ошибки');
  expect(reviewSubmitted).toBe(false);
});

test('unsupported gallery photo cannot silently publish a text-only review', async ({ page }) => {
  const account = { id: '33333333-3333-3333-3333-333333333333', email: 'anna@example.test', role: 'USER' };
  let reviewSubmitted = false;
  await page.addInitScript((user) => {
    localStorage.setItem('authToken', 'e2e-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, account);
  await page.route('**/api/v1/auth/profile', (route) => route.fulfill({ json: account }));
  await page.route('**/api/v1/products/by-uuid', (route) => route.fulfill({ json: products[0] }));
  await page.route('**/api/v1/products/reviews/11111111-1111-1111-1111-111111111111', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/v1/products/review/11111111-1111-1111-1111-111111111111', (route) => {
    reviewSubmitted = true;
    return route.fulfill({ json: {} });
  });
  await page.goto('/#/catalog/product/11111111-1111-1111-1111-111111111111');
  await openReviewFormOnPhone(page);
  await page.getByLabel('Фото товара (необязательно)').setInputFiles({ name: 'gallery.heic', mimeType: 'image/heic', buffer: Buffer.from('not-a-decodable-image') });
  await expect(page.getByRole('alert')).toContainText('Сохраните его как JPEG или PNG');
  await expect(page.getByRole('button', { name: 'Опубликовать' })).toBeDisabled();
  expect(reviewSubmitted).toBe(false);
  await page.getByRole('button', { name: 'Продолжить без фото' }).click();
  await expect(page.getByRole('button', { name: 'Опубликовать' })).toBeEnabled();
});

test('large gallery PNG is compressed before upload', async ({ page }) => {
  const account = { id: '33333333-3333-3333-3333-333333333333', email: 'anna@example.test', role: 'USER' };
  await page.addInitScript((user) => {
    localStorage.setItem('authToken', 'e2e-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, account);
  await page.route('**/api/v1/auth/profile', (route) => route.fulfill({ json: account }));
  await page.route('**/api/v1/products/by-uuid', (route) => route.fulfill({ json: products[0] }));
  await page.route('**/api/v1/products/reviews/11111111-1111-1111-1111-111111111111', (route) => route.fulfill({ json: [] }));
  let uploadedBytes = 0;
  await page.route('**/api/v1/products/review/11111111-1111-1111-1111-111111111111/photo', (route) => {
    uploadedBytes = route.request().postDataBuffer().length;
    expect(uploadedBytes).toBeLessThan(5.5 * 1024 * 1024);
    expect(route.request().postDataBuffer().toString('latin1')).toContain('Content-Type: image/jpeg');
    return route.fulfill({ json: { photoUrl: '/api/v1/products/review-photos/compressed' } });
  });
  await page.goto('/#/catalog/product/11111111-1111-1111-1111-111111111111');
  await openReviewFormOnPhone(page);
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1500;
    const context = canvas.getContext('2d');
    const image = context.createImageData(1500, 1500);
    for (let index = 0; index < image.data.length; index += 4) {
      image.data[index] = Math.random() * 256;
      image.data[index + 1] = Math.random() * 256;
      image.data[index + 2] = Math.random() * 256;
      image.data[index + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const buffer = Buffer.from(png, 'base64');
  expect(buffer.length).toBeGreaterThan(5 * 1024 * 1024);
  await page.getByLabel('Фото товара (необязательно)').setInputFiles({ name: 'gallery.png', mimeType: 'image/png', buffer });
  await expect(page.getByText('Фото загружено. Теперь опубликуйте отзыв.')).toBeVisible();
  expect(uploadedBytes).toBeGreaterThan(0);
});

test('product reviews filter by rating, photo and verified purchase', async ({ page }) => {
  await page.route('**/api/v1/products/by-uuid', (route) => route.fulfill({ json: products[0] }));
  await page.route('**/api/v1/products/reviews/11111111-1111-1111-1111-111111111111', (route) => route.fulfill({ json: [
    { id: 'review-5', authorName: 'Анна', rating: 5, body: 'Отлично сидит', verifiedPurchase: true, photoUrl: 'https://example.test/photo.jpg', createdAt: '2026-09-01T00:00:00Z' },
    { id: 'review-4', authorName: 'Ольга', rating: 4, body: 'Хорошая ткань', verifiedPurchase: false, createdAt: '2026-10-01T00:00:00Z' },
  ] }));
  await page.goto('/#/catalog/product/11111111-1111-1111-1111-111111111111');
  await expect(page.getByText('Отлично сидит')).toBeVisible();
  await expect(page.getByText('Хорошая ткань')).toBeVisible();
  await expect(page.locator('.reviews-summary strong')).toHaveText('4.5');

  await page.getByRole('button', { name: /5 ★/ }).click();
  await expect(page.getByText('Хорошая ткань')).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'С фото' }).check();
  await page.getByRole('checkbox', { name: 'Подтверждённые покупки' }).check();
  await expect(page.getByText('Отлично сидит')).toBeVisible();
  await page.getByRole('button', { name: /4 ★/ }).click();
  await expect(page.getByText('По этим параметрам отзывов нет.')).toBeVisible();
  await page.getByRole('button', { name: 'Показать все отзывы' }).click();
  await expect(page.locator('.review-card')).toHaveCount(2);
  await page.getByRole('combobox', { name: 'Сортировка отзывов' }).selectOption('newest');
  await expect(page.locator('.review-card').first()).toContainText('Хорошая ткань');
});

test('signed-in customer can like, dislike and remove a review reaction', async ({ page }) => {
  const account = { id: '33333333-3333-3333-3333-333333333333', email: 'anna@example.test', role: 'USER' };
  await page.addInitScript((user) => {
    localStorage.setItem('authToken', 'e2e-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, account);
  await page.route('**/api/v1/auth/profile', (route) => route.fulfill({ json: account }));
  await page.route('**/api/v1/products/by-uuid', (route) => route.fulfill({ json: products[0] }));
  await page.route('**/api/v1/products/reviews/11111111-1111-1111-1111-111111111111', (route) => route.fulfill({ json: [
    { id: 'review-1', authorName: 'Ольга', rating: 5, body: 'Удобная рубашка', likeCount: 2, dislikeCount: 0, myVote: null, createdAt: '2026-09-01T00:00:00Z' },
  ] }));
  const votes = [];
  await page.route('**/api/v1/products/reviews/review-1/vote', (route) => {
    const vote = route.request().postDataJSON().vote;
    votes.push(vote);
    expect(route.request().method()).toBe('PUT');
    expect(route.request().headers().authorization).toBe('Bearer e2e-token');
    const result = votes.length === 1 ? { likeCount: 3, dislikeCount: 0, myVote: 'LIKE' }
      : votes.length === 2 ? { likeCount: 2, dislikeCount: 1, myVote: 'DISLIKE' }
        : { likeCount: 2, dislikeCount: 0, myVote: null };
    return route.fulfill({ json: { reviewId: 'review-1', ...result } });
  });

  await page.goto('/#/catalog/product/11111111-1111-1111-1111-111111111111');
  const like = page.getByRole('button', { name: /Лайк отзыву Ольга/ });
  const dislike = page.getByRole('button', { name: /Дизлайк отзыву Ольга/ });
  await expect(like).toContainText('2');
  await like.click();
  await expect(like).toHaveAttribute('aria-pressed', 'true');
  await expect(like).toContainText('3');
  await dislike.click();
  await expect(dislike).toHaveAttribute('aria-pressed', 'true');
  await expect(like).toContainText('2');
  await dislike.click();
  await expect(dislike).toHaveAttribute('aria-pressed', 'false');
  expect(votes).toEqual(['LIKE', 'DISLIKE', 'DISLIKE']);
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

test('catalog deep link restores filters after reload and supports browser back', async ({ page }) => {
  const query = new URLSearchParams({
    gender: 'WOMEN', q: 'рубашка', min: '3000', max: '5000',
    ratingMin: '4.8', ratingMax: '5', reviewed: '1', sort: 'price-asc',
    utm_source: 'share',
  });
  query.append('category[]', 'Рубашки');
  query.append('color[]', 'Белый');
  query.append('size[]', 'women_clothing:M');
  await page.goto(`/#/catalog?${query}`);
  await expect(page.getByRole('heading', { name: 'Льняная рубашка' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Мужское пальто' })).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Сортировка' })).toHaveValue('price-asc');

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Льняная рубашка' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Сортировка' })).toHaveValue('price-asc');
  expect(new URL(page.url()).hash).toContain('utm_source=share');

  await page.getByRole('combobox', { name: 'Сортировка' }).selectOption('price-desc');
  await expect(page).toHaveURL(/sort=price-desc/);
  await page.goBack();
  await expect(page.getByRole('combobox', { name: 'Сортировка' })).toHaveValue('price-asc');
  await expect(page.getByRole('heading', { name: 'Льняная рубашка' })).toBeVisible();
});

test('catalog and search page find the same product despite a typo', async ({ page }) => {
  await page.goto('/#/catalog?q=' + encodeURIComponent('рубашки'));
  await expect(page.getByRole('heading', { name: 'Льняная рубашка' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Мужское пальто' })).toHaveCount(0);

  await page.goto('/#/search?q=' + encodeURIComponent('рубашки'));
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

async function openCheckout(page, { geocoderAvailable = false } = {}) {
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
  await page.route('**/order/stores', (route) => route.fulfill({ json: [
    { id: 'store-1', name: 'SUNSET Нижний Новгород', city: 'Нижний Новгород', address: 'Большая Покровская, 34', hours: '10:00–21:00', active: true },
    { id: 'store-2', name: 'SUNSET в ТРЦ НЕБО', city: 'Нижний Новгород', address: 'Большая Покровская, 82', hours: '10:00–22:00', active: true },
  ] }));
  await page.route('**/order/my', (route) => route.fulfill({ json: [] }));
  const savedAddresses = [];
  await page.route('**/auth/addresses', (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: savedAddresses });
    const address = { ...route.request().postDataJSON(), id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' };
    savedAddresses.push(address);
    return route.fulfill({ status: 201, json: address });
  });
  await page.route('**/auth/addresses/geocoder', (route) => route.fulfill({ json: { available: geocoderAvailable, suggestions: [] } }));
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
    expect(new URL(route.request().url()).pathname).toBe('/api/v1/order');
    submittedOrder = route.request().postDataJSON();
    await route.fulfill({ json: { orderNumber: 'SUN-101' } });
  });

  await page.getByRole('button', { name: 'Новый адрес' }).click();
  const addressDialog = page.getByRole('dialog');
  await addressDialog.locator('.address-grid label').filter({ hasText: 'Город' }).locator('input').fill('Нижний Новгород');
  await addressDialog.locator('.address-grid label').filter({ hasText: 'Улица' }).locator('input').fill('Большая Покровская');
  await addressDialog.getByRole('textbox', { name: 'Дом Номер дома' }).fill('34');
  await addressDialog.getByRole('button', { name: 'Сохранить адрес' }).click();
  await expect(addressDialog.getByText('Подтвердите адрес, указанный вручную')).toBeVisible();
  await expect(addressDialog.getByTitle('Проверка точки адреса на карте')).toHaveCount(0);
  await addressDialog.getByRole('checkbox', { name: 'Подтверждаю адрес, указанный вручную' }).check();
  const addressSaved = page.waitForRequest((request) => new URL(request.url()).pathname === '/api/v1/auth/addresses' && request.method() === 'POST');
  await addressDialog.getByRole('button', { name: 'Сохранить адрес' }).click();
  expect((await addressSaved).postDataJSON()).toMatchObject({ city: 'Нижний Новгород', street: 'Большая Покровская', house: '34' });

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
  const saved = await page.evaluate((id) => localStorage.getItem(`sunsetAddresses:${id}`), user.id);
  expect(saved).toBeNull();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cartItems')))).toEqual({});
});

test('selects a geocoded address and previews its actual point', async ({ page }) => {
  await openCheckout(page, { geocoderAvailable: true });
  const candidate = { value: 'Нижний Новгород, Большая Покровская, 34', query: 'г Нижний Новгород, ул Большая Покровская, д 34', city: 'Нижний Новгород', street: 'Большая Покровская', house: '34', postalCode: '603000', lat: 56.3269, lon: 44.0059 };
  await page.route('**/auth/addresses/geocoder', (route) => route.fulfill({ json: { available: true, suggestions: [candidate] } }));
  await page.getByRole('button', { name: 'Новый адрес' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('.address-grid label').filter({ hasText: 'Город' }).locator('input').fill('Нижний Новгород');
  await dialog.locator('.address-grid label').filter({ hasText: 'Улица' }).locator('input').fill('Большая Покровская');
  await dialog.getByRole('textbox', { name: 'Дом Номер дома' }).fill('34');
  await dialog.getByRole('button', { name: 'Найти адрес на карте' }).click();
  await dialog.getByRole('option', { name: candidate.value }).click();
  await expect(dialog.getByTitle('Проверка точки адреса на карте')).toHaveAttribute('src', /marker=56\.3269%2C44\.0059/);
  await expect(dialog.getByRole('checkbox', { name: 'Точка на карте соответствует адресу' })).toBeVisible();
});

test('pickup checkout needs no delivery address', async ({ page }) => {
  await openCheckout(page);
  let submittedOrder;
  await page.route('**/order', async (route) => {
    expect(new URL(route.request().url()).pathname).toBe('/api/v1/order');
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

test('order detail stays visible when cancellation fails', async ({ page }) => {
  await openCheckout(page);
  const id = '44444444-4444-4444-4444-444444444444';
  await page.route(`**/api/v1/order/my/${id}`, (route) => route.fulfill({ json: {
    id, orderNumber: 'SUN-104', status: 'PENDING', createdAt: '2026-10-06T00:00:00Z',
    customerName: 'Анна Тестовая', customerEmail: 'anna@example.test', customerPhone: '+79990001122',
    subtotal: 3990, totalAmount: 3990, items: [{ productId: products[0].id, name: products[0].name, quantity: 1, price: 3990 }],
    delivery: { deliveryMethod: 'pickup', address: 'SUNSET Нижний Новгород' }, payment: { method: 'CARD', status: 'PENDING' },
  } }));
  await page.route(`**/api/v1/order/my/${id}/cancel`, (route) => route.fulfill({
    status: 400, json: { message: 'Заказ уже передан в доставку' },
  }));
  page.on('dialog', (dialog) => dialog.accept());

  await page.goto(`/#/profile/orders/${id}`);
  await expect(page.getByRole('heading', { name: 'SUN-104' })).toBeVisible();
  await page.getByRole('button', { name: 'Отменить заказ' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Заказ уже передан в доставку' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'SUN-104' })).toBeVisible();
});
