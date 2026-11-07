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
test('mosaicos con comparativa frente al mes pasado y gráfica de 6 meses', async ({ page }) => {
  const url = montar('inicio.html', 'inicio.html');
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(700);
  const pist = page.locator('.ini-t', { hasText: 'Cambios este mes' });
  await expect(pist.locator('.tcmp')).toContainText('▲ 40 %'); await expect(pist.locator('.tcmp')).toHaveClass(/mal/);
  await expect(pist.locator('.tcmp')).toContainText('vs. mes pasado'); await expect(pist.locator('.tcmp')).toHaveAttribute('title', /1–31 de sep/);
  await expect(pist.locator('.tspark rect')).toHaveCount(6);
  const g = page.locator('.ini-t', { hasText: 'Gasto del mes' });
  await expect(g).toContainText('1840'); await expect(g.locator('.tcmp')).toContainText('▼ 20 %'); await expect(g.locator('.tcmp')).toHaveClass(/bien/);
  const c = page.locator('.ini-t', { hasText: 'Consumo del mes' });
  await expect(c.locator('.tcmp')).toContainText('▲ 20 %'); await expect(c.locator('.tcmp')).not.toHaveClass(/mal|bien/);
  await expect(page.locator('.ini-t', { hasText: 'Entradas del mes' }).locator('.tcmp')).toContainText('no había nada');
  expect(await desbordes(page)).toEqual([]);
  await page.setViewportSize({ width: 1280, height: 860 }); await page.waitForTimeout(200);
  expect(await desbordes(page)).toEqual([]);
  await page.screenshot({ path: process.env.CAPDIR ? process.env.CAPDIR + '/inicio-cmp.png' : 'test-results/inicio-cmp.png', fullPage: true });
  expect(err).toEqual([]);
});
test('Inicio a tu gusto: ocultar un mosaico y cambiar el orden se guarda', async ({ page }) => {
  const url = montar('inicio.html', 'inicio.html');
  const err = await vigila(page); await page.goto(url); await page.waitForTimeout(700);
  await page.locator('button', { hasText: 'Personalizar' }).click(); await page.waitForTimeout(200);
  const d = page.locator('.dlg', { hasText: 'Personalizar Inicio' });
  await d.locator('.ini-pf', { hasText: 'Cuarentena' }).locator('input[type=checkbox]').uncheck();
  await d.locator('.ini-pf', { hasText: 'Pistones usados' }).locator('button[aria-label^="Subir"]').click();
  await d.locator('button', { hasText: 'Guardar' }).click(); await page.waitForTimeout(300);
  await expect(page.locator('.ini-t', { hasText: 'Ejes rotos o agarrotados' })).toHaveCount(0);
  const orden = await page.locator('.ini-grp').first().locator('.ini-t .tt').allInnerTexts();
  expect(orden.indexOf('Pistones usados')).toBeLessThan(orden.indexOf('Gasto del mes'));
  await page.reload(); await page.waitForTimeout(700);
  await expect(page.locator('.ini-t', { hasText: 'Ejes rotos o agarrotados' })).toHaveCount(0);
  expect(await desbordes(page)).toEqual([]); expect(err).toEqual([]);
});
