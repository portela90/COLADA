// Inicio: salen los mosaicos con los números de Almacén y Coladas.
const { test, expect } = require('@playwright/test');
const { montar, vigila, desbordes } = require('./util');
test('mosaicos con datos, en móvil y en ordenador', async ({ page }) => {
  const url = montar('inicio.html', 'inicio.html');
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(700);
  expect(await page.locator('.ini-t').count()).toBeGreaterThanOrEqual(12);
  await expect(page.locator('.ini-t', { hasText: 'Bajar a planta' })).toContainText('10');
  expect(await desbordes(page)).toEqual([]);
  await page.setViewportSize({ width: 1280, height: 860 }); await page.waitForTimeout(200);
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});
