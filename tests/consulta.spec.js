// Usuario de solo consulta: ve el Almacén, no puede apuntar nada y no entra en Coladas.
const { test, expect } = require('@playwright/test');
const { original } = require('./util');
const { servidor, datosAlmacen } = require('./supa');

test('Almacén en solo consulta: sin «Apuntar», con aviso y sin guardar nada', async ({ page }) => {
  const errores = []; page.on('pageerror', e => errores.push(e.message));
  const S = await servidor(page, 'alm_', datosAlmacen(), { consulta: true });
  await page.goto(original('almacen.html')); await page.waitForTimeout(2500);
  await expect(page.locator('.solo-c')).toHaveText('Solo consulta');
  const vis = await page.evaluate(() => [...document.querySelectorAll('#tabs button')].filter(b => b.offsetParent).map(b => b.textContent));
  expect(vis).not.toContain('Apuntar'); expect(vis).toContain('Stock');
  // intenta apuntar un consumo desde Movimientos
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.waitForTimeout(300);
  await page.evaluate(() => [...document.querySelectorAll('.tile')].find(t => t.querySelector('.tt').textContent === 'Movimientos').click());
  await page.waitForTimeout(400);
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Consumo').click());
  await page.waitForTimeout(200);
  const art = await page.$eval('#mArt', s => [...s.options].find(o => o.value).value);
  await page.selectOption('#mArt', art); await page.waitForTimeout(200);
  await page.fill('#mCant', '2'); await page.click('#mBtn'); await page.waitForTimeout(400);
  await expect(page.locator('#toast')).toContainText('solo consulta');
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
