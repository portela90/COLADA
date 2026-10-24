// Sin conexión: la app real abre con los últimos datos, guarda lo apuntado y lo envía al volver la red.
const { test, expect } = require('@playwright/test');
const { original } = require('./util');
const { servidor, datosAlmacen } = require('./supa');

const movs = D => Object.values(D.mov || {}).flatMap(m => m.items || []);
async function apuntaConsumo(page) {
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.waitForTimeout(300);
  await page.evaluate(() => [...document.querySelectorAll('.tile')].find(t => t.querySelector('.tt').textContent === 'Movimientos').click());
  await page.waitForTimeout(400);
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Consumo').click());
  await page.waitForTimeout(200);
  const art = await page.$eval('#mArt', s => [...s.options].find(o => o.value).value);
  await page.selectOption('#mArt', art); await page.waitForTimeout(200);
  await page.fill('#mCant', '2'); await page.click('#mBtn'); await page.waitForTimeout(900);
  return art;
}

test('Almacén sin red: apunta, recarga sin red y envía al volver', async ({ page, context }) => {
  const errores = []; page.on('pageerror', e => errores.push(e.message));
  const S = await servidor(page, 'alm_', datosAlmacen());
  const antes = movs(S.D).length;
  await page.goto(original('almacen.html')); await page.waitForTimeout(2500);
  await expect(page.locator('#tabs button')).toHaveCount(5);

  // se va la red
  S.online = false; await context.setOffline(true); await page.waitForTimeout(300);
  const art = await apuntaConsumo(page);
  await expect(page.locator('#off-barra')).toContainText('1 cambio pendiente');
  expect(movs(S.D).length).toBe(antes);

  // se cierra y se vuelve a abrir sin red: abre con los datos guardados y el apunte sigue en la cola
  await page.reload(); await page.waitForTimeout(2500);
  await expect(page.locator('#tabs button')).toHaveCount(5);
  await expect(page.locator('#off-barra')).toContainText('1 cambio pendiente');

  // vuelve la red: se envía solo, una sola vez
  S.online = true; await context.setOffline(false); await page.waitForTimeout(2500);
  const nuevos = movs(S.D).filter(m => m.art === art && m.cant === 2 && m.tipo === 'salida');
  expect(nuevos.length).toBe(1);
  expect(movs(S.D).length).toBe(antes + 1);
  await expect(page.locator('#off-barra')).toHaveCount(0);
  expect(errores).toEqual([]);
});

test('Almacén sin red: cambiar el catálogo avisa de que no se puede', async ({ page, context }) => {
  const S = await servidor(page, 'alm_', datosAlmacen());
  await page.goto(original('almacen.html')); await page.waitForTimeout(2500);
  S.online = false; await context.setOffline(true);
  const r = await page.evaluate(async () => { try { await window.claude.use('db').then(db => db.doc('cat/app').set({ x: 1 })); return 'guardado'; } catch (e) { return e.message; } });
  expect(r).toContain('Sin conexión');
});
