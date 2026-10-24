// Escáner: sin el lector del móvil (como en iPhone) se usa ZXing, y escribiendo el código también funciona.
const { test, expect } = require('@playwright/test');
const { pulsa } = require('./util');
const { abre, ADMIN } = require('./limp');

const base = require('./playwright.config').use.launchOptions || {};
test.use({ launchOptions: Object.assign({}, base, { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] }), permissions: ['camera'] });
  test('funciona sin el lector del móvil (como en iPhone) y abre la ficha al escribir el código', async ({ page }) => {
    await page.addInitScript(() => { delete window.BarcodeDetector; });
    const { err } = await abre(page, ADMIN);
    await pulsa(page, 'Inyectoras y hornos'); await page.waitForTimeout(300);
    await pulsa(page, 'Escanear código QR'); await page.waitForTimeout(2500);
    expect(await page.evaluate(() => !!window.jsQR)).toBe(true);
    await page.fill('input[placeholder="…o escribe el código"]', 'H-F29');
    await pulsa(page, 'Buscar'); await page.waitForTimeout(1200);
    await expect(page.getByText('Horno mantenedor F29').first()).toBeVisible();
    expect(err).toEqual([]);
  });

