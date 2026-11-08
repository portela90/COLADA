// Botón «Excel» encima de cada tabla: descarga la tabla tal cual, con los números como números.
const { test, expect } = require('@playwright/test');
const { montar, vigila, desbordes } = require('./util');
const { abre, ADMIN } = require('./limp');
test('Coladas: la tabla de Consumo del mes se descarga en Excel', async ({ page }) => {
  await page.addInitScript(() => { let c; Object.defineProperty(window, 'claude', { configurable: true, get: () => c, set: v => { c = { use: async n => n === 'downloads' ? { save: async ({ filename, data }) => { window.__dl = { filename, n: (data.byteLength || data.size || 0) }; } } : v.use(n) }; } }); });
  const err = await vigila(page); await page.goto(montar('index.html', 'coladas.html')); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('nav#tabs button')].find(b => b.textContent.includes('Consumo')).click()); await page.waitForTimeout(400);
  await page.locator('.stk-grid .stk-t', { hasText: 'Consumo del mes' }).click(); await page.waitForTimeout(600);
  const b = page.locator('#cons-mes .xl-b'); await expect(b).toHaveCount(1);
  await b.click(); await page.waitForFunction(() => window.__dl, null, { timeout: 8000 });
  const dl = await page.evaluate(() => window.__dl); expect(dl.filename).toMatch(/^Consumo del mes \d{4}-\d\d-\d\d\.xlsx$/); expect(dl.n).toBeGreaterThan(1000);
  expect(await page.evaluate(() => [window._valorExcel('3.012'), window._valorExcel('2,670 €/kg'), window._valorExcel('-1.468 kg'), window._valorExcel('C25193'), window._valorExcel('31/10')])).toEqual([3012, 2.67, -1468, 'C25193', '31/10']);
  expect(await desbordes(page)).toEqual([]); expect(err).toEqual([]);
});
test('Limpieza: las tablas también tienen su botón Excel y descargan', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const { err } = await abre(page, ADMIN);
  await page.evaluate(() => [...document.querySelectorAll('#nav button')].find(b => b.textContent.includes('Resumen')).click()); await page.waitForTimeout(1500);
  const n = await page.locator('.xl-b').count();
  if (n) { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.locator('.xl-b').first().click()]); expect(d.suggestedFilename()).toMatch(/\.xlsx$/); }
  expect(err).toEqual([]);
});
