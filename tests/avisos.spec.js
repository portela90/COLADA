// Avisos al móvil en Almacén: el panel se abre desde el menú del usuario sin errores.
const { test, expect } = require('@playwright/test');
const { original } = require('./util');
const { servidor, datosAlmacen } = require('./supa');
test('panel de avisos desde el menú del usuario', async ({ page }) => {
  const errores = []; page.on('pageerror', e => errores.push(e.message));
  await servidor(page, 'alm_', datosAlmacen());
  await page.goto(original('almacen.html')); await page.waitForTimeout(2500);
  await page.click('#usr-btn'); await page.waitForTimeout(300);
  await page.getByText('Avisos al móvil').click(); await page.waitForTimeout(800);
  await expect(page.locator('.dlg h3', { hasText: 'Avisos al móvil' })).toBeVisible();
  await expect(page.getByText('artículos bajo mínimo').first()).toBeVisible();
  expect(errores).toEqual([]);
});
