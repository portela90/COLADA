// Almacén: abre, se recorre entero sin errores y un consumo apuntado queda guardado.
const { test, expect } = require('@playwright/test');
const { montar, vigila, pulsa, desbordes } = require('./util');
let url;
test.beforeAll(() => { url = montar('almacen.html', 'almacen.html'); });

test('abre y recorre todas las pantallas sin errores', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  for (const t of ['Hoy', 'Apuntar', 'Stock', 'Reponer']) {
    await page.evaluate(t => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes(t)).click(), t);
    await page.waitForTimeout(350);
    expect(await desbordes(page), 'se sale de la pantalla en ' + t).toEqual([]);
  }
  const subs = ['Pistones', 'Ejes', 'Contenedores', 'Barras expulsoras', 'Tornillos tope', 'Horno', 'Aceites, taladrinas y jabones', 'Inyectoras', 'Moldes', 'Movimientos', 'Análisis', 'Catálogo'];
  for (const t of subs) {
    await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
    await page.waitForTimeout(250);
    await pulsa(page, t); await page.waitForTimeout(400);
    expect(await desbordes(page), 'se sale de la pantalla en ' + t).toEqual([]);
  }
  expect(err).toEqual([]);
});

test('apuntar un consumo lo guarda y baja el stock', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.waitForTimeout(250);
  await pulsa(page, 'Movimientos'); await page.waitForTimeout(300);
  const antes = await page.evaluate(() => Object.values(window.__D.mov || {}).reduce((s, m) => s + ((m.items || []).length), 0));
  await pulsa(page, 'Consumo');
  const art = await page.$eval('#mArt', s => { const o = [...s.options].find(o => o.value); return o.value; });
  await page.selectOption('#mArt', art); await page.waitForTimeout(250);
  await page.fill('#mCant', '1');
  await page.click('#mBtn'); await page.waitForTimeout(600);
  const despues = await page.evaluate(() => Object.values(window.__D.mov || {}).reduce((s, m) => s + ((m.items || []).length), 0));
  expect(despues).toBe(antes + 1);
  const ult = await page.evaluate(a => { const L = Object.values(window.__D.mov).flatMap(m => m.items || []); return L.sort((x, y) => (y.ts || 0) - (x.ts || 0))[0]; }, art);
  expect(ult).toMatchObject({ tipo: 'salida', art, cant: 1 });
  expect(err).toEqual([]);
});

test('ficha de artículo y de inyectora se abren', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Stock')).click());
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = document.querySelector('main .it, main button.linkcol, main [onclick]'); b && b.click(); });
  await page.waitForTimeout(400);
  expect(err).toEqual([]);
});

test('Análisis dibuja los gráficos y al tocar una barra se abre el detalle', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.waitForTimeout(250);
  await pulsa(page, 'Análisis'); await page.waitForTimeout(300);
  await pulsa(page, 'Todo el gasto'); await pulsa(page, '12 meses'); await page.waitForTimeout(1500);
  await expect(page.getByText('Gráficos')).toBeVisible();
  expect(await page.locator('.card svg').count()).toBeGreaterThanOrEqual(1);
  if (process.env.CAPTURA) { await page.evaluate(() => [...document.querySelectorAll('h2')].find(h => h.textContent === 'Gráficos').scrollIntoView()); await page.waitForTimeout(300); await page.screenshot({ path: process.env.CAPTURA }); }
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});

test('Contenedores: inventario rápido, estantería y cambio de contenedor en una máquina', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.waitForTimeout(250); await page.locator('.tile .tt', { hasText: /^Contenedores$/ }).click(); await page.waitForTimeout(300);
  await expect(page.locator('.ct-grid')).toBeVisible();
  expect(await desbordes(page), 'se sale de la pantalla en Contenedores').toEqual([]);
  await page.getByRole('button', { name: 'Inventario rápido' }).click();
  const d = page.locator('.dlg').last();
  await d.getByRole('button', { name: 'D5', exact: true }).click();
  await d.getByRole('button', { name: 'D5-01' }).click();
  await d.getByRole('button', { name: 'D5-02' }).click();
  await expect(d).toContainText('Se darán de alta 2');
  await d.getByRole('button', { name: 'Dar de alta' }).click();
  await expect(page.locator('.ct-c', { hasText: 'D5' })).toContainText('2');
  // F4 es de largo D: se le pone el D5-01
  await page.locator('.it', { hasText: 'F4 · sin apuntar' }).click();
  const c = page.locator('.dlg').last();
  await expect(c).toContainText('largo D (470 mm)');
  const ops = await c.locator('#ccV option').allTextContents();
  expect(ops.some(o => o.startsWith('D5-01'))).toBe(true);
  await c.locator('#ccV').selectOption({ label: ops.find(o => o.startsWith('D5-01')) });
  await c.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.locator('.it', { hasText: 'F4 · D5-01' })).toBeVisible();
  await expect(page.locator('.ct-c', { hasText: 'D5' })).toContainText('1 puesto');
  // F21 es de largo C: no le salen los D
  await page.locator('.it', { hasText: 'F21 · sin apuntar' }).click();
  const c2 = page.locator('.dlg').last();
  expect((await c2.locator('#ccV option').allTextContents()).some(o => o.startsWith('D5'))).toBe(false);
  expect(err).toEqual([]);
});

test('Más: cada pieza con su apartado y Falta y sobra en Reponer', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.waitForTimeout(250);
  for (const g of ['Piezas', 'Máquinas', 'Gestión']) await expect(page.locator('.mas-g', { hasText: g })).toBeVisible();
  await page.locator('.tile .tt', { hasText: /^Aceites, taladrinas y jabones$/ }).click(); await page.waitForTimeout(300);
  await expect(page.locator('#view')).toContainText('Gastado en 30 días');
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Barras expulsoras$/ }).click(); await page.waitForTimeout(300);
  await expect(page.locator('#view')).toContainText('Registrar cambio');
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Reponer')).click());
  await page.getByRole('button', { name: 'Falta y sobra' }).click(); await page.waitForTimeout(300);
  await expect(page.locator('#view')).toContainText('Faltan');
  expect(err).toEqual([]);
});

test('Ficha de inyectora: lo que monta lleva a cada pieza y se vuelve a la máquina', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.waitForTimeout(250); await page.locator('.tile .tt', { hasText: /^Inyectoras$/ }).click(); await page.waitForTimeout(400);
  await page.locator('button.mq', { hasText: 'F4' }).first().click(); await page.waitForTimeout(400);
  const pg = page.locator('.op-pg').last();
  for (const t of ['Ahora', 'Consumibles', 'Ejes', 'Historial', 'Gasto', 'Documentos']) await expect(pg.getByRole('tab', { name: t })).toBeVisible();
  await expect(pg.locator('.mq-l')).toHaveCount(await pg.locator('.mq-l').count());
  for (const k of ['Molde', 'Pistón', 'Eje', 'Contenedor', 'Horno']) await expect(pg.locator('.mq-lk', { hasText: new RegExp('^' + k + '$') })).toBeVisible();
  const pis = pg.locator('button.mq-lp', { hasText: 'Pistón' });
  if (await pis.count()) {
    await pis.click(); await page.waitForTimeout(300);
    const hijo = page.locator('.op-pg').last();
    await expect(hijo.locator('.op-back')).toHaveText('‹ F4');
    await hijo.locator('.op-back').click(); await page.waitForTimeout(200);
    await expect(page.locator('.op-pg').last()).toContainText('Lo que monta ahora');
  }
  for (const t of ['Historial', 'Gasto', 'Documentos']) { await pg.getByRole('tab', { name: t }).click(); await page.waitForTimeout(150); }
  await expect(pg).toContainText('Planos de lo que monta');
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});
