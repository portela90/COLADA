// Campana de avisos: en cada app sale arriba con el número de pendientes; al abrirla, la lista; al pulsar uno, lleva a su sitio.
const { test, expect } = require('@playwright/test');
const { montar, vigila, desbordes } = require('./util');
const { abre, ADMIN } = require('./limp');
for (const [pag, mock] of [['index.html', 'coladas.html'], ['almacen.html', 'almacen.html'], ['inicio.html', 'inicio.html']])
  for (const w of [390, 1280])
    test('campana en ' + pag + ' a ' + w + ' px', async ({ page }) => {
      await page.setViewportSize({ width: w, height: 860 });
      const err = await vigila(page); await page.goto(montar(pag, mock)); await page.waitForTimeout(3000);
      const c = page.locator('.campana'); await expect(c).toHaveCount(1); await expect(c).toBeVisible();
      const n = +(await c.locator('.campana-n').innerText()); expect(n).toBeGreaterThan(0);
      await c.click(); await page.waitForTimeout(300);
      await expect(page.locator('.campana-pan')).toBeVisible();
      expect(await page.locator('.campana-it').count()).toBeGreaterThanOrEqual(n);
      expect(await page.locator('.campana-pan').innerText()).not.toMatch(/undefined|NaN/);
      expect(await desbordes(page)).toEqual([]);
      if (pag !== 'inicio.html') { await page.locator('.campana-it').first().click(); await page.waitForTimeout(500); await expect(page.locator('.campana-pan')).toHaveCount(0); }
      expect(err).toEqual([]);
    });
test('campana en Coladas: «relevos sin consumo» lleva a Falta por apuntar', async ({ page }) => {
  const err = await vigila(page); await page.goto(montar('index.html', 'coladas.html')); await page.waitForTimeout(3000);
  await page.locator('.campana').click(); await page.locator('.campana-it', { hasText: 'sin consumo apuntado' }).click(); await page.waitForTimeout(500);
  await expect(page.locator('.pg-h')).toHaveText('Consumo'); await expect(page.locator('.stk-det')).toContainText('Falta por apuntar');
  expect(err).toEqual([]);
});
test('campana en Limpieza: problemas que se repiten y atrasados', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { err } = await abre(page, ADMIN); await page.waitForTimeout(1500);
  await page.locator('.campana').click(); await page.waitForTimeout(300);
  await expect(page.locator('.campana-pan')).toContainText('Problema que se repite'); await expect(page.locator('.campana-pan')).toContainText('atrasado');
  expect(err).toEqual([]);
});
