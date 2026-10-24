// Usuario de solo consulta: ve el Almacén, no puede apuntar nada y no entra en Coladas.
const { test, expect } = require('@playwright/test');
const { original, desbordes, pulsa } = require('./util');
const { servidor, datosAlmacen } = require('./supa');

test('Almacén en solo consulta: sus pantallas propias, sin nada que guarde', async ({ page }) => {
  const errores = []; page.on('pageerror', e => errores.push(e.message));
  const S = await servidor(page, 'alm_', datosAlmacen(), { consulta: true });
  await page.goto(original('almacen.html')); await page.waitForTimeout(2500);
  await expect(page.locator('.solo-c')).toHaveText('Solo consulta');
  const tabs = await page.evaluate(() => [...document.querySelectorAll('#tabs button')].map(b => b.textContent));
  expect(tabs).toEqual(['Resumen', 'Consumos', 'Entradas', 'Stock', 'Ejes']);
  for (const t of tabs) {
    await page.evaluate(t => [...document.querySelectorAll('#tabs button')].find(b => b.textContent === t).click(), t);
    await page.waitForTimeout(500);
    expect(await desbordes(page), 'se sale en ' + t).toEqual([]);
  }
  // consumos agrupados por motivo y stock filtrado por «bajo mínimo»
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent === 'Consumos').click()); await page.waitForTimeout(300);
  await pulsa(page, 'Por motivo'); await expect(page.locator('#view')).toContainText('Por motivo (');
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent === 'Stock').click()); await page.waitForTimeout(300);
  await page.evaluate(() => [...document.querySelectorAll('.chip')].find(b => b.textContent.startsWith('Bajo mínimo')).click()); await page.waitForTimeout(300);
  await expect(page.locator('#view')).toContainText('Bajo mínimo');
  expect(S.llamadas.filter(([f]) => f.startsWith('docs_items')).length).toBe(0);
  expect(S.llamadas.filter(([f]) => f === 'log_error').length).toBe(0);
  // el menú no lleva a Coladas ni al historial
  await page.click('#usr-btn'); await page.waitForTimeout(200);
  const menu = await page.textContent('.dlg');
  expect(menu).not.toContain('Ir a Coladas'); expect(menu).not.toContain('Historial');
  expect(errores).toEqual([]);
});

test('Coladas en solo consulta: no entra', async ({ page }) => {
  await servidor(page, '', {}, { consulta: true });
  await page.goto(original('index.html')); await page.waitForTimeout(2000);
  await expect(page.locator('.lg h2')).toHaveText('Solo consulta');
});
