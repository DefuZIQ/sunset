import { chromium } from '@playwright/test';

const base = (process.env.SUNSET_LIVE_URL || 'https://t3ch.pro').replace(/\/$/, '');
const adminBase = (process.env.SUNSET_ADMIN_LIVE_URL || (base === 'https://t3ch.pro' ? 'https://admin.t3ch.pro' : `${base}/admin`)).replace(/\/$/, '');
const browser = await chromium.launch();

try {
  for (const profile of [
    { name: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false },
    { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true },
  ]) {
    const context = await browser.newContext({ viewport: profile.viewport, isMobile: profile.isMobile });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const home = await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    if (home?.status() !== 200) throw new Error(`${profile.name}: homepage returned ${home?.status()}`);
    await page.goto(`${base}/#/catalog`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.locator('.product-card').first().waitFor({ timeout: 20000 });
    const cards = await page.locator('.product-card').count();
    if (profile.isMobile && !(await page.locator('.mobile-tabs').isVisible())) {
      throw new Error('Mobile navigation is not visible');
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    if (overflow) throw new Error(`${profile.name}: page overflows viewport horizontally`);
    await page.locator('.product-image-link').first().click();
    await page.locator('.product-detail-wrapper').waitFor({ timeout: 20000 });
    await page.goto(`${base}/#/contacts`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.locator('.contacts-page').waitFor({ timeout: 20000 });
    const adminPage = await page.goto(`${adminBase}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    if (adminPage?.status() !== 200) throw new Error(`${profile.name}: admin returned ${adminPage?.status()}`);
    await page.getByRole('heading', { name: 'Панель управления' }).waitFor({ timeout: 20000 });
    await page.getByRole('link', { name: 'Перейти в магазин' }).waitFor({ timeout: 10000 });
    if (pageErrors.length) throw new Error(`${profile.name}: ${pageErrors.join('; ')}`);
    console.log(`${profile.name}: homepage, catalog (${cards} cards), product, contacts and admin login passed`);
    await context.close();
  }
} finally {
  await browser.close();
}
