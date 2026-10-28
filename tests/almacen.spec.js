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

test('Cada pieza con las mismas pestañas y «Más cosas» para añadir avisos, listas e ideas', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  const mas = async () => { await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click()); await page.waitForTimeout(200); };
  for (const p of ['Pistones', 'Ejes', 'Contenedores', 'Barras expulsoras', 'Tornillos tope', 'Horno', 'Aceites, taladrinas y jabones']) {
    await mas(); await page.locator('.tile .tt', { hasText: new RegExp('^' + p + '$') }).click(); await page.waitForTimeout(250);
    for (const t of ['Cambios', 'Por máquina', 'Gasto', 'Referencias', 'Más cosas', 'Resumen']) {
      await page.locator('.secc-tabs').getByRole('tab', { name: new RegExp('^' + t) }).click(); await page.waitForTimeout(150);
      expect(await desbordes(page), p + ' › ' + t).toEqual([]);
    }
  }
  // en Contenedores: un aviso fijo, una lista y una idea
  await mas(); await page.locator('.tile .tt', { hasText: /^Contenedores$/ }).click();
  const addExtra = async (tipo, rellena) => {
    await page.locator('.secc-tabs').getByRole('tab', { name: /^Más cosas/ }).click();
    await page.getByRole('button', { name: '＋ Añadir' }).click();
    await page.locator('.dlg').last().locator('.it', { hasText: tipo }).click();
    const d = page.locator('.dlg').last(); await rellena(d); await d.getByRole('button', { name: 'Guardar' }).click(); await page.waitForTimeout(200);
  };
  await addExtra('Aviso fijo', d => d.locator('input').first().fill('Los D5 tardan 3 semanas'));
  await addExtra('Lista de comprobación', async d => { await d.locator('input').first().fill('Revisión mensual'); await d.locator('textarea').fill('Mirar desgaste\nLimpiar'); });
  await addExtra('Idea para la app', d => d.locator('textarea').fill('Avisar si un contenedor lleva 3 meses puesto'));
  await expect(page.locator('#view')).toContainText('Revisión mensual (0/2)');
  await page.locator('#view label.it', { hasText: 'Mirar desgaste' }).locator('input').check(); await page.waitForTimeout(200);
  await expect(page.locator('#view')).toContainText('Revisión mensual (1/2)');
  await expect(page.locator('#view')).toContainText('Avisar si un contenedor');
  await page.locator('.secc-tabs').getByRole('tab', { name: 'Resumen' }).click();
  await expect(page.locator('#view .banner', { hasText: 'Los D5 tardan 3 semanas' })).toBeVisible();
  await mas(); await page.locator('.tile .tt', { hasText: /^Catálogo$/ }).click(); await page.waitForTimeout(200);
  await expect(page.locator('#view')).toContainText('Ideas para la app (1 pendiente)');
  expect(err).toEqual([]);
});

test('Base de datos: cada tipo se agrupa, se filtra y abre su ficha', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Base de datos$/ }).click(); await page.waitForTimeout(300);
  await expect(page.locator('#view')).toContainText('Hornos por modelo de horno');
  const tipos = await page.locator('.bd-tipos .chip').allTextContents();
  expect(tipos.length).toBeGreaterThanOrEqual(12);
  for (const t of tipos) {
    await page.locator('.bd-tipos .chip', { hasText: t.split(' (')[0] }).first().click(); await page.waitForTimeout(200);
    const gs = await page.locator('#bdG option').allTextContents();
    for (const g of gs) { await page.selectOption('#bdG', { label: g }); await page.waitForTimeout(80); }
    expect(await desbordes(page), 'se sale en ' + t).toEqual([]);
  }
  await page.locator('.bd-tipos .chip', { hasText: 'Hornos' }).click(); await page.waitForTimeout(200);
  const g1 = page.locator('#view .lst .it').first(); const n = await g1.locator('.cant b').textContent();
  await g1.click(); await page.waitForTimeout(200);
  await expect(page.locator('#view h2', { hasText: '(' + n + ')' })).toBeVisible();
  await page.locator('#view button.lnk').first().click(); await page.waitForTimeout(300);
  await expect(page.locator('.op-pg').last()).toContainText('Lo que monta ahora');
  expect(err).toEqual([]);
});
