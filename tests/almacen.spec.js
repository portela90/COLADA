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
  const subs = ['Pistones', 'Ejes', 'Contenedores', 'Barras expulsoras', 'Tornillos tope', 'Horno', 'Aceites, taladrinas y jabones', 'Inyectoras', 'Moldes', 'Movimientos', 'Consultas', 'Catálogo'];
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
  await page.fill('#mCant', '1'); await page.fill('#mResp', '707');
  await page.click('#mBtn'); await page.waitForTimeout(600);
  const despues = await page.evaluate(() => Object.values(window.__D.mov || {}).reduce((s, m) => s + ((m.items || []).length), 0));
  expect(despues).toBe(antes + 1);
  const ult = await page.evaluate(a => { const L = Object.values(window.__D.mov).flatMap(m => m.items || []); return L.sort((x, y) => (y.ts || 0) - (x.ts || 0))[0]; }, art);
  expect(ult).toMatchObject({ tipo: 'salida', art, cant: 1, resp: '707' });
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

test('Consultas › consulta a mano dibuja los gráficos y al tocar una barra se abre el detalle', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.waitForTimeout(250);
  await pulsa(page, 'Consultas'); await page.waitForTimeout(300);
  await page.locator('.qmano > summary').click(); await page.waitForTimeout(200);
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

test('Cada pieza con las mismas pestañas y «Añadir» para avisos, listas e ideas', async ({ page }) => {
  test.setTimeout(90000);
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  const mas = async () => { await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click()); await page.waitForTimeout(200); };
  for (const p of ['Pistones', 'Ejes', 'Contenedores', 'Barras expulsoras', 'Tornillos tope', 'Horno', 'Aceites, taladrinas y jabones']) {
    await mas(); await page.locator('.tile .tt', { hasText: new RegExp('^' + p + '$') }).click(); await page.waitForTimeout(250);
    for (const t of ['Cambios', 'Por máquina', 'Gasto', 'Referencias', 'Añadir', 'Resumen']) {
      await page.locator('.secc-tabs').getByRole('tab', { name: new RegExp('^' + t) }).click(); await page.waitForTimeout(150);
      expect(await desbordes(page), p + ' › ' + t).toEqual([]);
    }
  }
  // en Contenedores: un aviso fijo, una lista y una idea
  await mas(); await page.locator('.tile .tt', { hasText: /^Contenedores$/ }).click();
  const addExtra = async (tipo, rellena) => {
    await page.locator('.secc-tabs').getByRole('tab', { name: /^Añadir/ }).click();
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

test('Base de datos: el buscador entiende las preguntas', async ({ page }) => {
  test.setTimeout(90000);
  const H={F4:'1a|idra1100|cerrado|krown|900kg',F10:'1a|stp500|abierto||600kg',F15:'1a|stp500|abierto||600kg',F16:'1a|stp500|abierto||600kg',F19:'1a|stp750|abierto||800kg',F20:'1a|idra700|cerrado|westofen|900kg',F21:'1a|stp900|cerrado|krown|900kg',F22:'1a|stp900|cerrado|krown|900kg',F23:'1b|idra420|abierto||600kg',F24:'1b|idra420|abierto||600kg',F25:'1b|idra1600|cerrado|westofen|2300kg',F26:'1b|stp900|cerrado|krown|900kg',F27:'1b|buhler840|cerrado|westofen|900kg',F28:'1a|idra900|cerrado|krown|900kg',F29:'1b|stp1100|cerrado|krown|1200kg',F30:'1a|idra700|cerrado|westofen|900kg',F31:'1a|buhler530|cerrado|westofen|650kg',F32:'1b|stp900|cerrado|krown|900kg',F33:'1a|stp900|cerrado|krown|900kg',F34:'1a|stp600|cerrado|krown|650kg',F51:'2|idra560|cerrado|westofen|650kg',F52:'2|idra560|cerrado|westofen|650kg',F53:'2|idra700|cerrado|westofen|900kg',F54:'2|buhler530|cerrado|westofen|650kg',F55:'2|buhler530|cerrado|westofen|650kg',F56:'2|buhler660|cerrado|westofen|900kg',F61:'2|stp900|cerrado|westofen|650kg',F62:'2|stp500|cerrado|westofen|650kg',F63:'2|buhler530|cerrado|krown|650kg',F64:'2|idra1600|cerrado|krown|1700kg',F65:'2|idra950|cerrado|westofen|900kg',F66:'2|stp1300|cerrado|krown|1200kg',F67:'2|idra560|cerrado|krown|650kg'};
  const err = await vigila(page);
  await page.addInitScript(H => { let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v; const a = v.cat.app;
    const op = (p, ts) => ts.map(t => ({ id: 'o-' + p + '-' + t.toLowerCase().replace(/[^a-z0-9]/g, ''), t }));
    a.fichaIny = { campos: [{ id: 'c-zona', nom: 'Zona', ops: op('zona', ['Nave 1A', 'Nave 1B', 'Nave 2']) }, { id: 'c-maq', nom: 'Modelo de máquina', ops: op('maq', ['STP 500','STP 600','STP 750','STP 900','STP 1100','STP 1300','IDRA 420','IDRA 560','IDRA 700','IDRA 900','IDRA 950','IDRA 1100','IDRA 1600','BUHLER 530','BUHLER 660','BUHLER 840']) },
      { id: 'c-htipo', nom: 'Tipo de horno', ops: op('htipo', ['Abierto', 'Cerrado']) }, { id: 'c-horno', nom: 'Modelo Horno', ops: op('horno', ['Krown', 'Westofen']) }, { id: 'c-hmed', nom: 'Capacidad horno', ops: op('hmed', ['600 kg','650 kg','800 kg','900 kg','1200 kg','1700 kg','2300 kg']) }] };
    const ids=a.maquinas.map(m=>m.id);
    a.maquinas = Object.keys(H).map(c => { const [z, mq, t, h, k] = H[c].split('|'); const f = { 'c-zona': ['o-zona-nave' + z], 'c-maq': ['o-maq-' + mq], 'c-htipo': ['o-htipo-' + t], 'c-hmed': ['o-hmed-' + k] }; if (h) f['c-horno'] = ['o-horno-' + h]; return { id: ids.includes(c)?c:c, cod: c, nave: z === '2' ? 'Nave 2' : 'Nave 1', ficha: f }; }); } }); }, H);
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  await expect(page.locator('.bd-sug .ejs summary')).toBeVisible();
  const resp = async q => { await page.fill('#bdQ', q); await page.waitForTimeout(200); return (await page.locator('.bd-resp').allTextContents()).join(' '); };
  expect(await resp('qué modelos de horno tenemos')).toContain('Hay 9 modelos de horno distintos entre 33 hornos');
  await expect(page.locator('#bdRes .it', { hasText: 'Krown 900 kg' })).toContainText('F4, F21, F22, F26, F28, F32, F33');
  expect(await resp('que marcas de horno hay')).toContain('Hay 3 marcas distintas');
  expect(await resp('hornos westofen')).toContain('14 hornos');
  expect(await resp('hornos westofent')).toContain('14 hornos');
  expect(await resp('máquinas con horno krown de 900')).toContain('7 máquinas');
  expect(await resp('cuántas STP hay')).toContain('6 modelos de máquina distintos entre 14 máquinas');
  expect(await resp('hornos de la nave 2')).toContain('13 hornos');
  expect(await resp('F28')).toContain('1 máquina');
  await page.locator('#bdRes button.lnk', { hasText: 'F28' }).click(); await page.waitForTimeout(300);
  await expect(page.locator('.op-pg').last()).toContainText('Lo que monta ahora');
  await page.locator('.op-pg').last().locator('.op-back').click();
  expect(await resp('zzzz hornos')).toContain('33 hornos');
  await expect(page.locator('#bdRes')).toContainText('No he encontrado «zzzz»');
  await page.fill('#bdQ', 'hornos we'); await page.waitForTimeout(200);
  expect((await page.locator('.bd-sug .chip').allTextContents()).some(t => t.includes('westofen'))).toBe(true);
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});

test('Base de datos: consumos, cambios y gasto («consumo de pistones en la F25»)', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  const resp = async q => { await page.fill('#bdQ', q); await page.waitForTimeout(250); return (await page.locator('.bd-resp').allTextContents()).join(' '); };
  const r1 = await resp('consumo de pistones en la F25');
  expect(r1).toMatch(/^F25 · Últimos 12 meses: \d+ pistones? · /);
  await expect(page.locator('#bdRes h2', { hasText: 'Por Ø' })).toBeVisible();
  await expect(page.locator('#bdRes .bd-ent')).toContainText('Cambios de pistón');
  await page.getByRole('button', { name: 'Por mes' }).click(); await page.waitForTimeout(200);
  await expect(page.locator('#bdRes h2', { hasText: 'Por mes' })).toBeVisible();
  expect(await resp('gasto de pistones este año por máquina')).toMatch(/^Este año: \d+ pistones/);
  expect(await resp('reparaciones de ejes este año')).toMatch(/reparaci(ón|ones)/);
  expect(await resp('consumo de la F4')).toMatch(/^F4 · /);
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});

test('Base de datos: se toca un grupo para ver solo esos y se vuelve a agrupar (eje con más reparaciones → por motivo)', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  await page.fill('#bdQ', 'que eje tiene más reparaciones'); await page.waitForTimeout(250);
  await expect(page.locator('#bdRes h2', { hasText: 'Por pieza' })).toBeVisible();
  const eje = (await page.locator('#bdRes .lst .it .t1').first().textContent()).trim();
  await page.locator('#bdRes .lst .it').first().click(); await page.waitForTimeout(250);
  await expect(page.locator('#bdRes .chip[aria-pressed=true]', { hasText: eje })).toBeVisible();
  await expect(page.locator('#bdRes h2', { hasText: 'Por motivo' })).toBeVisible();
  await expect(page.locator('.bd-resp')).toContainText(eje + ' · ');
  await page.getByRole('button', { name: 'Por mes' }).click(); await page.waitForTimeout(200);
  await expect(page.locator('#bdRes h2', { hasText: 'Por mes' })).toBeVisible();
  await page.locator('#bdRes .chip[aria-pressed=true]', { hasText: eje }).click(); await page.waitForTimeout(200);
  await expect(page.locator('#bdRes .chip[aria-pressed=true]')).toHaveCount(0);
  await page.fill('#bdQ', 'reparaciones de ejes por motivo'); await page.waitForTimeout(250);
  await expect(page.locator('#bdRes .lst .it .t1', { hasText: 'Postizo roto' })).toBeVisible();
  expect(err).toEqual([]);
});

test('Base de datos: «quién cambió el último pistón de la F25» responde con fecha, qué y quién', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  await page.fill('#bdQ', 'quién cambió el último pistón de la F25'); await page.waitForTimeout(250);
  const u = page.locator('.bd-ult');
  await expect(u).toContainText('El último cambio de pistón de la F25');
  await expect(u).toContainText('Lo hizo:');
  await expect(u.locator('.bd-ult-f')).toHaveText(/^\d\d\/\d\d\/\d\d · (hoy|ayer|hace \d+ días)$/);
  await page.fill('#bdQ', 'cuando fue la primera vez que se cambio pistón en la F4'); await page.waitForTimeout(250);
  await expect(page.locator('.bd-ult')).toContainText('El primer cambio de pistón de la F4');
  await page.fill('#bdQ', 'pistones de los últimos 30 días'); await page.waitForTimeout(250);
  await expect(page.locator('.bd-resp')).toContainText('Últimos 30 días');
  expect(err).toEqual([]);
});

test('Borrar la salida de un cambio de pistón borra también el cambio (no sale en el informe para Beatriz)', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Pistones$/ }).click(); await page.waitForTimeout(300);
  const maq = await page.locator('#pMaq option').nth(1).getAttribute('value');
  await page.selectOption('#pMaq', maq);
  const diam = await page.locator('#pDiam option').nth(2).getAttribute('value');
  await page.selectOption('#pDiam', diam);
  if (await page.locator('#pResp').count()) await page.fill('#pResp', 'Prueba borrar');
  const dest = await page.locator('#pDest option').nth(1).getAttribute('value'); await page.selectOption('#pDest', dest);
  expect(await page.inputValue('#pMot')).toBe('');
  await page.locator('#pBtn').click(); await expect(page.locator('body')).toContainText('Falta el motivo del cambio');
  await page.selectOption('#pMot', 'DESGASTE');
  await page.locator('#pBtn').click(); await page.waitForTimeout(500);
  const antes = await page.evaluate(() => JSON.stringify(window.__D.pist || {}).split('"movId"').length);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Movimientos$/ }).click(); await page.waitForTimeout(400);
  const hoyTxt = await page.evaluate(() => { const d = new Date(); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getFullYear()).slice(2); });
  const fila = page.locator('tr', { hasText: hoyTxt }).filter({ hasText: 'Pistón ' + diam }).first();
  await fila.getByRole('button', { name: 'Borrar movimiento' }).click();
  const d = page.locator('.dlg').last();
  await expect(d).toContainText('También se borra el cambio de pistón');
  await d.getByRole('button', { name: 'Borrar' }).click(); await page.waitForTimeout(500);
  const despues = await page.evaluate(() => JSON.stringify(window.__D.pist || {}).split('"movId"').length);
  expect(despues).toBe(antes - 1);
  expect(err).toEqual([]);
});

test('Base de datos: preguntas que se contestan con una frase (revisar, días, pedir, dinero, comparar, duración…)', async ({ page }) => {
  test.setTimeout(90000);
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  const resp = async q => { await page.fill('#bdQ', q); await page.waitForTimeout(200); return (await page.locator('#bdRes').innerText()).replace(/\s+/g, ' '); };
  const casos = [
    ['qué hay que revisar', /que revisar|Todo en orden/], ['qué está bajo mínimo', /bajo mínimo y \d+ para pedir|Nada bajo mínimo/],
    ['para cuántos días tengo pistones de 60', /Pistón Ø 60: hay \d+ ud, para/], ['qué se va a acabar antes', /Lo que antes se acaba es/],
    ['qué pedidos llevan más de 15 días sin llegar', /pedidos?|No hay/], ['qué ejes están pendientes de reparar', /en el taller/],
    ['qué no se mueve desde hace 6 meses', /meses/], ['cuánto hemos gastado este mes', /se han gastado [\d.]+ €/],
    ['qué máquina gasta más dinero en pistones', /Por máquina|se han gastado 0 €/], ['cuánto vale lo que hay en el almacén', /vale [\d.]+ €/],
    ['cuánto nos cuesta cada inyectora al mes', /al mes/], ['consumo de pistones de este mes comparado con el pasado', /frente a/],
    ['qué máquina cambia más pistones por semana', /por semana/], ['cuánto dura de media un pistón en la F66', /En la F66 un pistón dura de media \d+ días/],
    ['cuánto dura de media un eje', /Un eje aguanta de media|hace falta más historia/], ['qué ejes valen para la F28', /F28/],
    ['dónde está el eje 2.8.J-2', /El eje 2\.8\.J-2 .* está en el taller/], ['cuántos cambios de pistón faltan por mandar a Beatriz', /Faltan por mandar \d+ cambios|No falta/],
    ['qué máquinas llevan más tiempo sin cambiar pistón', /La que más tiempo lleva sin cambiar pistón es la F\d+/], ['qué entradas han llegado hoy', /Entradas/],
    ['qué se sacó ayer en el relevo de noche', /ayer/], ['cuándo tengo que pedir pistones', /hay que pedirlo|ya está pedido|No hay consumo/],
    ['cuántos pistones hay en la zona de pistones usados', /zona de pistones usados|primer recuento/], ['pistones usados de 60', /usados|primer recuento/]];
  for (const [q, re] of casos) { const t = await resp(q); expect(t, q).toMatch(re); expect(t, q).not.toContain('undefined'); }
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});

test('Base de datos: «cuántos pistones hay en la zona de usados» sale del recuento y los cambios', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => { let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v;
    v.cat.app.pusados = { ev: [{ t: 'cuenta', f: '2026-01-01', ts: 1, b: { Z: { 'Ø 60': 3, 'Ø 80': 2 }, R: { 'Ø 70': 1 }, M: {}, C: { 'Ø 90': 4 } } }] }; } }); });
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  await page.fill('#bdQ', 'cuántos pistones hay en la zona de pistones usados'); await page.waitForTimeout(250);
  const u = (await page.locator('#bdRes').innerText()).replace(/\s+/g, ' ');
  expect(u).toMatch(/En la zona de pistones usados debe haber \d+ pistones \(Ø 60: \d+/);
  expect(u).toMatch(/En el cajón de chatarra Ø 90: 4/);
  expect(err).toEqual([]);
});

test('Base de datos: «todo sobre…», lo raro, personas y planificar', async ({ page }) => {
  test.setTimeout(90000);
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  const resp = async q => { await page.fill('#bdQ', q); await page.waitForTimeout(200); return (await page.locator('#bdRes').innerText()).replace(/\s+/g, ' '); };
  const casos = [['todo sobre la F25', /F25 \(.*\): este año lleva \d+ cambios? de pistón/], ['todo sobre el eje 2.8.J-2', /El eje 2\.8\.J-2 .* está en reparación/], ['todo sobre el pistón de 80', /Pistón Ø 80: hay \d+ ud/],
    ['qué máquina está gastando más de lo normal', /más de lo normal/], ['qué pistones se han roto antes de tiempo', /antes de lo normal|menos de la mitad/], ['qué ejes vuelven al taller por lo mismo', /mismo motivo/],
    ['qué cambios se apuntaron sin responsable', /sin responsable/], ['quién no apunta el motivo de los cambios de pistón este año', /Este año: \d+ cambios? de pistón, (\d+ sin motivo|todos con motivo)/], ['qué ha hecho Josu este año', /Josu ha apuntado \d+ cosas/], ['quién cambia más pistones por rotura', /por quién/],
    ['qué tengo que pedir esta semana', /hay que pedir|no hace falta/], ['cuánto me voy a gastar el mes que viene', /se gastarán unos/], ['qué ejes me van a faltar', /reserva/], ['resumen del mes', /RESUMEN ALMACÉN/]];
  for (const [q, re] of casos) { const t = await resp(q); expect(t, q).toMatch(re); expect(t, q).not.toContain('undefined'); }
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});

test('Base de datos: «informe del valor de los pistones robados» (recuentos con la nota Robo)', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => { let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v; const k = Object.keys(v.mov)[0];
    v.mov[k].items.push({ id: 'r1', f: '2026-10-19', ts: 1, alm: 'n1', art: 'pist-60', cant: -5, nota: 'Robo 19/10/2026 (recuento: no queda ninguno)', tipo: 'ajuste', contado: 0, teorico: 5 },
      { id: 'r2', f: '2026-10-19', ts: 1, alm: 'n1', art: 'c1', cant: -2, nota: 'Robo 19/10/2026', tipo: 'ajuste', contado: 0, teorico: 2 }); } }); });
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  await page.fill('#bdQ', 'informe del valor de los pistones robados'); await page.waitForTimeout(250);
  let t = (await page.locator('#bdRes').innerText()).replace(/\s+/g, ' ');
  expect(t).toMatch(/Robado: 5 unidades con un valor de 900 €/);
  await page.fill('#bdQ', 'valor de todo lo robado'); await page.waitForTimeout(250);
  t = (await page.locator('#bdRes').innerText()).replace(/\s+/g, ' ');
  expect(t).toMatch(/Robado: 7 unidades con un valor de 900 € \(más 1 artículo sin precio\)/);
  expect(t).toContain('Copiar el informe');
  expect(err).toEqual([]);
});

test('Base de datos: dinero para informar (valor del stock, ejes en el taller, presupuesto, precio)', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  const resp = async q => { await page.fill('#bdQ', q); await page.waitForTimeout(250); return (await page.locator('#bdRes').innerText()).replace(/\s+/g, ' '); };
  expect(await resp('dame el valor del stock que tenemos de pistones de 80')).toMatch(/Pistón Ø 80: hay \d+ ud a 180 € = [\d.]+ €/);
  expect(await resp('dime el importe de las reparaciones que tenemos en el taller de los ejes')).toMatch(/ejes? en el taller: [\d.]+ €/);
  expect(await resp('dame un presupuesto de un pedido de pistones de 100 especial de unos 15 pistones')).toMatch(/Presupuesto: 2700 €, sin IVA.*15 × Pistón Ø 100 esp/);
  expect(await resp('presupuesto de 15 pistones de 100 especial y 10 de 80')).toMatch(/Presupuesto: 4500 €/);
  expect(await resp('cuánto cuesta un pistón de 80')).toMatch(/Pistón Ø 80: 180 € \/ ud/);
  expect(err).toEqual([]);
});

test('Ejes: se van añadiendo a la lista para pedir al taller, se manda un WhatsApp y la lista se vacía', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => { let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v; const k = Object.keys(v.rep)[0];
    v.rep[k].items.push({ id: 'r9', eje: '3.2.B-1', desp: 'ROSCA', alta: '2026-10-10', env: '2026-10-10', rec: null, res: null }); } }); });
  await page.goto(url); await page.waitForTimeout(1200);
  const abreEje = async c => { await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
    await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
    await page.fill('#bdQ', 'todo sobre el eje ' + c); await page.waitForTimeout(300);
    await page.locator('#bdRes button', { hasText: 'Abrir la ficha del eje' }).click(); await page.waitForTimeout(400); };
  await abreEje('2.8.J-2'); await page.locator('button', { hasText: 'Añadir a la lista para pedir al taller' }).click(); await page.waitForTimeout(600);
  await expect(page.locator('button', { hasText: 'En la lista para pedir' })).toBeVisible();
  await page.locator('.op-pg').last().locator('.op-back').click().catch(() => {}); await page.waitForTimeout(200);
  await abreEje('3.2.B-1'); await page.locator('button', { hasText: 'Añadir a la lista para pedir al taller' }).click(); await page.waitForTimeout(600);
  await page.locator('button', { hasText: 'Ver la lista y enviar (2)' }).click(); await page.waitForTimeout(300);
  await page.locator('.dlg button', { hasText: 'Preparar WhatsApp' }).click(); await page.waitForTimeout(400);
  const txt = await page.locator('#mtTxt').inputValue();
  expect(txt).toContain('- 2.8.J-2'); expect(txt).toContain('- 3.2.B-1');
  await page.locator('.dlg button', { hasText: 'Ya lo he enviado' }).click(); await page.waitForTimeout(600);
  const reps = await page.evaluate(() => Object.values(window.__D.rep).flatMap(x => x.items).filter(r => r.eje === '2.8.J-2' || r.eje === '3.2.B-1').filter(r => !r.res));
  expect(reps.every(r => r.traer && !r.apedir)).toBe(true);
  expect(err).toEqual([]);
});

test('Consultas: «qué pistones tengo en nave 2» da el stock de los almacenes de esa nave', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  const resp = async q => { await page.fill('#bdQ', q); await page.waitForTimeout(250); return (await page.locator('#bdRes').innerText()).replace(/\s+/g, ' '); };
  expect(await resp('qué pistones tengo en nave 2')).toMatch(/En Nave 2 hay \d+ pistones: Ø/);
  expect(await resp('pistones en la nave 1a')).toMatch(/En Nave 1A hay \d+ pistones/);
  expect(await resp('cuántos pistones de 80 hay en nave 1')).toMatch(/En Nave 1 (hay|no hay)/);
  expect(await resp('qué hay en el almacén general')).toMatch(/En Almacén general hay/);
  expect(await resp('consumo de pistones en nave 2')).toMatch(/Cambios de pistón/);
  expect(err).toEqual([]);
});

test('Consultas: al buscar un albarán se puede abrir su ficha', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => { let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v; const k = Object.keys(v.mov)[0];
    v.mov[k].items.push({ id: 'ea1', f: '2026-10-20', ts: 1, alm: 'gen', art: 'pist-80', cant: 5, tipo: 'entrada', alb: '001465A26' }); } }); });
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  await page.fill('#bdQ', 'albarán 001465A26'); await page.waitForTimeout(300);
  await page.locator('#bdRes button', { hasText: 'Abrir el albarán 001465A26' }).click(); await page.waitForTimeout(400);
  await expect(page.locator('.dlg').last()).toContainText('Pistón Ø 80');
  expect(err).toEqual([]);
});

test('Ficha de inyectora: fecha de fabricación del horno', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  await page.fill('#bdQ', 'todo sobre la F25'); await page.waitForTimeout(300);
  await page.locator('#bdRes button', { hasText: 'Abrir la ficha de la F25' }).click(); await page.waitForTimeout(400);
  await page.locator('button', { hasText: 'Editar ficha' }).last().click(); await page.waitForTimeout(300);
  await page.fill('#mqHFab', '2019-03'); await page.locator('.dlg button', { hasText: 'Guardar' }).last().click(); await page.waitForTimeout(800);
  const m = await page.evaluate(() => window.__D.cat.app.maquinas.find(x => x.cod === 'F25'));
  expect(m.hornoFab).toBe('2019-03');
  expect(err).toEqual([]);
});

test('Consultas: «quién cambió las barras de la F28» dice quién, cuándo y qué; una máquina sin cambios no se ignora; «qué máquina consume más de todo» se filtra por tipo', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => { let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v; const k = Object.keys(v.mov)[0];
    v.mov[k].items.push({ id: 'bx1', f: '2026-10-14', ts: 1, alm: 'cn1', art: 'b1', maq: v.cat.app.maquinas[0].id, por: 'Kepa', cant: 2, nota: 'Rotas', tipo: 'salida' }); } }); });
  await page.goto(url); await page.waitForTimeout(1200);
  const m0 = await page.evaluate(() => window.__D.cat.app.maquinas[0].cod);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  const resp = async q => { await page.fill('#bdQ', q); await page.waitForTimeout(300); return (await page.locator('#bdRes').innerText()).replace(/\s+/g, ' '); };
  const t = await resp('quién cambió las barras expulsoras de la ' + m0);
  expect(t).toContain('El último cambio de barra expulsora de la ' + m0); expect(t).toContain('Lo hizo: Kepa');
  const otra = await page.evaluate(m0 => window.__D.cat.app.maquinas.find(m => m.cod !== m0).cod, m0);
  expect(await resp('quién cambió las barras expulsoras de la ' + otra)).toContain('No hay cambios de barras expulsoras apuntados en la ' + otra);
  const t2 = await resp('qué máquina consume más de todo');
  expect(t2).toContain('Por tipo');
  await page.locator('#bdRes .btn', { hasText: 'Por tipo' }).click(); await page.waitForTimeout(300);
  expect(await page.locator('#bdRes').innerText()).toMatch(/Pistones/);
  expect(err).toEqual([]);
});

test('Consultas: la taladrina y el aceite van por nave (no se asignan a una máquina)', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => { let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v; const k = Object.keys(v.mov)[0];
    v.cat.app.articulos.push({ id: 'tq1', desc: 'TALADRINA ECOCOOL', fam: 'consumible', grupo: 'taladrina', ud: 'kg', alms: ['n2'], iny: [v.cat.app.maquinas[0].id] });
    v.mov[k].items.push({ id: 'tx1', f: '2026-10-20', ts: 1, alm: 'n2', art: 'tq1', cant: 190, nota: 'Limpieza: Cambiar bidón de taladrina · Nave 2', tipo: 'salida' }); } }); });
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  await page.fill('#bdQ', 'consumo de taladrina por nave'); await page.waitForTimeout(300);
  const t = (await page.locator('#bdRes').innerText()).replace(/\s+/g, ' ');
  expect(t).toContain('Por nave'); expect(t).toContain('Nave 2');
  await page.fill('#bdQ', 'qué máquina consume más de todo'); await page.waitForTimeout(300);
  expect((await page.locator('#bdRes').innerText()).replace(/\s+/g, ' ')).toContain('Nave 2 (general)');
  expect(err).toEqual([]);
});

test('Contadores de aceite y glicol: se apuntan las lecturas, salen los litros y avisa si es raro', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => { let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v;
    const it = [], base = { e220: 100, ter: 500, pre: 200, i46: 300, gli: 1000 }; const h = new Date();
    for (let i = 12; i >= 1; i--) { const x = new Date(h); x.setDate(x.getDate() - i); if (x.getDay() === 0 || x.getDay() === 6) continue; const f = x.toISOString().slice(0, 10);
      Object.keys(base).forEach(k => base[k] += 5); it.push({ id: 'c' + i, f, nave: 'Nave 1', c: Object.assign({}, base), por: 'Cristian', ts: i }); }
    v.cont = { [String(h.getFullYear())]: { items: it } }; } }); });
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Aceites, taladrinas y jabones$/ }).click(); await page.waitForTimeout(400);
  await expect(page.locator('h2', { hasText: 'Contadores de aceite y glicol' })).toBeVisible();
  await page.locator('button', { hasText: 'Apuntar lecturas' }).click(); await page.waitForTimeout(300);
  const ultimo = await page.evaluate(() => { const L = window.__D.cont[Object.keys(window.__D.cont)[0]].items; return L[L.length - 1].c; });
  await page.fill('#cte220', String(ultimo.e220 + 6));
  await expect(page.locator('.dlg')).toContainText('= 6 l');
  await page.fill('#ctter', String(ultimo.ter + 90));
  await expect(page.locator('.dlg')).toContainText('mucho más de lo normal');
  await page.locator('.dlg button', { hasText: 'Guardar' }).click(); await page.waitForTimeout(800);
  const items = await page.evaluate(() => Object.values(window.__D.cont).flatMap(x => x.items));
  expect(items[items.length - 1]).toMatchObject({ nave: 'Nave 1', c: { e220: ultimo.e220 + 6, ter: ultimo.ter + 90 } });
  await expect(page.locator('.banner.b')).toContainText('Consumo raro');
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  await page.fill('#bdQ', 'consumo de glicol este mes'); await page.waitForTimeout(300);
  expect(await page.locator('#bdRes').innerText()).toMatch(/Consumo de aceite y glicol/);
  expect(err).toEqual([]);
});

test('Contadores: cotejo de los cambios de GRG con lo que marcan los contadores', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => { let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v; const k = Object.keys(v.mov)[0];
    v.cat.app.articulos.push({ id: 'ater', desc: 'ACEITE TÉRMICO BESTERM HT', fam: 'consumible', grupo: 'aceite', ud: 'kg', alms: ['gen'] });
    const h = new Date(), f = n => { const x = new Date(h); x.setDate(x.getDate() - n); return x.toISOString().slice(0, 10); };
    // GRG de 870 kg (≈ 1000 l) el día 20 antes; otro el día 6 antes; los contadores marcan 700 l entre medias → desfase
    v.mov[k].items.push({ id: 'g1', f: f(20), alm: 'gen', art: 'ater', cant: 870, tipo: 'salida', nota: 'Limpieza: Cambiar GRG de aceite térmico' },
      { id: 'g2', f: f(6), alm: 'gen', art: 'ater', cant: 870, tipo: 'salida', nota: 'Limpieza: Cambiar GRG de aceite térmico' });
    v.cont = { [String(h.getFullYear())]: { items: [{ id: 'r1', f: f(20), nave: 'Nave 1', c: { ter: 0 }, grg: { ter: { ab: 900 } }, ts: 1 }, { id: 'r2', f: f(13), nave: 'Nave 1', c: { ter: 400 }, ts: 2 }, { id: 'r3', f: f(6), nave: 'Nave 1', c: { ter: 700 }, grg: { ter: { ab: 900 } }, ts: 3 }, { id: 'r4', f: f(1), nave: 'Nave 1', c: { ter: 800 }, ts: 4 }] } }; } }); });
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Aceites, taladrinas y jabones$/ }).click(); await page.waitForTimeout(400);
  await expect(page.locator('#view')).toContainText('Térmico: desfase de -30 %');
  await page.locator('button', { hasText: 'Cotejo con los cambios' }).click(); await page.waitForTimeout(300);
  const t = (await page.locator('.dlg').last().innerText()).replace(/\s+/g, ' ');
  expect(t).toMatch(/870 kg ≈ 1000 l · abajo 900 l/); expect(t).toMatch(/-300 l \(-30 %\)/); expect(t).not.toMatch(/-30 %\) aprox/); expect(t).toMatch(/quedan arriba ≈ 900 l/);
  await page.locator('.dlg').last().locator('button', { hasText: 'Cerrar' }).click(); await page.waitForTimeout(200);
  await page.locator('button', { hasText: 'Apuntar lecturas' }).click(); await page.waitForTimeout(300);
  const d = page.locator('.dlg').last();
  await d.locator('.seg button', { hasText: 'Nave 2' }).click();
  await d.locator('.chip', { hasText: /^Térmico$/ }).click(); await d.locator('.chip', { hasText: '½' }).click();
  await expect(d.locator('#ctGabter')).toHaveValue('500');
  expect(err).toEqual([]);
});

test('Contadores: el primer día se apunta el nivel de arriba y abajo y el cotejo ya es exacto', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => { let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v; const k = Object.keys(v.mov)[0];
    v.cat.app.articulos.push({ id: 'apre', desc: 'ACEITE PRENSA METALFORM V106', fam: 'consumible', grupo: 'aceite', ud: 'kg', alms: ['gen'] });
    const h = new Date(), f = n => { const x = new Date(h); x.setDate(x.getDate() - n); return x.toISOString().slice(0, 10); };
    v.mov[k].items.push({ id: 'g1', f: f(3), alm: 'gen', art: 'apre', cant: 800, tipo: 'salida', nota: 'Limpieza: Cambiar GRG de aceite de prensa' });
    v.cont = { [String(h.getFullYear())]: { items: [{ id: 'r1', f: f(10), nave: 'Nave 2', c: { pre: 0 }, grg: { pre: { ar: 600, ab: 1000 } }, ts: 1 },
      { id: 'r2', f: f(3), nave: 'Nave 2', c: { pre: 640 }, grg: { pre: { ab: 950 } }, ts: 2 }, { id: 'r3', f: f(1), nave: 'Nave 2', c: { pre: 700 }, ts: 3 }] } }; } }); });
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Aceites, taladrinas y jabones$/ }).click(); await page.waitForTimeout(400);
  await page.locator('button', { hasText: 'Cotejo con los cambios' }).click(); await page.waitForTimeout(300);
  const t = (await page.locator('.dlg').last().innerText()).replace(/\s+/g, ' ');
  // 600 arriba + 1000 abajo − 950 abajo al cambiar = 650 l; los contadores marcan 640 → -10 l, exacto
  expect(t).toMatch(/arriba 600 l · abajo 1000 l/); expect(t).toMatch(/-10 l \(-2 %\)(?! aprox)/); expect(t).toMatch(/800 kg ≈ 1000 l · abajo 950 l/);
  await page.locator('.dlg').last().locator('button', { hasText: 'Cerrar' }).click(); await page.waitForTimeout(200);
  await page.locator('button', { hasText: 'Apuntar lecturas' }).click(); await page.waitForTimeout(300);
  const d = page.locator('.dlg').last();
  await expect(d).toContainText('se apuntan en las lecturas de la Nave 2');
  await d.locator('.seg button', { hasText: 'Nave 2' }).click();
  await expect(d).toContainText('Primera vez');
  await d.locator('.chip', { hasText: /^Térmico$/ }).click();
  await expect(d.locator('button', { hasText: 'Solo apunto el nivel' })).toHaveAttribute('aria-pressed', 'true');
  await d.locator('#ctGarter').fill('300'); await d.locator('#ctGabter').fill('1000');
  expect(err).toEqual([]);
});

test('Ficha de inyectora: datos de la placa del horno y su apartado en Ahora y Documentos', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  await page.fill('#bdQ', 'todo sobre la F25'); await page.waitForTimeout(300);
  await page.locator('#bdRes button', { hasText: 'Abrir la ficha de la F25' }).click(); await page.waitForTimeout(400);
  await page.locator('button', { hasText: 'Editar datos del horno' }).first().click(); await page.waitForTimeout(300);
  const d = page.locator('.dlg').last();
  await d.locator('#hpMarca').fill('Striko'); await d.locator('#hpModelo').fill('Westofen 600'); await d.locator('#hpSerie').fill('SN-12345');
  await d.locator('#hpKg').fill('600'); await d.locator('#hpKw').fill('45'); await d.locator('#hpEn').selectOption('Gas'); await d.locator('#mqHFab').fill('2018-06');
  await d.locator('button', { hasText: 'Guardar' }).click(); await page.waitForTimeout(800);
  const m = await page.evaluate(() => window.__D.cat.app.maquinas.find(x => x.cod === 'F25'));
  expect(m.hornoPlaca).toEqual({ marca: 'Striko', modelo: 'Westofen 600', serie: 'SN-12345', kg: '600', kw: '45', energia: 'Gas' }); expect(m.hornoFab).toBe('2018-06');
  await expect(page.locator('body')).toContainText('SN-12345');
  await page.locator('[role=tab]', { hasText: 'Documentos' }).last().click(); await page.waitForTimeout(300);
  await expect(page.locator('body')).toContainText('Del horno');
  await expect(page.locator('body')).toContainText('Westofen 600');
  expect(err).toEqual([]);
});

test('Glicol: el depósito se coteja con los contadores de las dos naves y con el albarán de la cisterna', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => { let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v;
    const h = new Date(), f = n => { const x = new Date(h); x.setDate(x.getDate() - n); return x.toISOString().slice(0, 10); };
    v.cont = { [String(h.getFullYear())]: { items: [
      { id: 'a1', f: f(20), nave: 'Nave 1', c: { gli: 0 }, ts: 1 }, { id: 'b1', f: f(20), nave: 'Nave 2', c: { gli: 0 }, ts: 2 },
      { id: 'a2', f: f(5), nave: 'Nave 1', c: { gli: 300 }, ts: 3 }, { id: 'b2', f: f(5), nave: 'Nave 2', c: { gli: 500 }, ts: 4 },
      { id: 'a3', f: f(1), nave: 'Nave 1', c: { gli: 380 }, ts: 5 }, { id: 'b3', f: f(1), nave: 'Nave 2', c: { gli: 520 }, ts: 6 },
      { id: 'd1', f: f(20), dep: 'gli', tipo: 'nivel', n: 2000, ts: 7 }, { id: 'd2', f: f(5), dep: 'gli', tipo: 'recarga', kg: 954, dens: 1.06, l: 900, antes: 1150, despues: 2000, alb: 'C-77', ts: 8 }] } }; } }); });
  await page.goto(url); await page.waitForTimeout(1500);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Aceites, taladrinas y jabones$/ }).click(); await page.waitForTimeout(400);
  await expect(page.locator('#view')).toContainText('el nivel no sube lo que dice el albarán');
  await page.locator('button', { hasText: 'Cotejo con los cambios' }).click(); await page.waitForTimeout(300);
  const t = (await page.locator('.dlg').last().innerText()).replace(/\s+/g, ' ');
  // 2000 − 1150 = 850 l; los contadores de las dos naves marcan 300 + 500 = 800 → -50 l
  expect(t).toMatch(/Glicol · depósito/); expect(t).toMatch(/-50 l \(-6 %\)/); expect(t).toMatch(/quedan ≈ 1900 l/); expect(t).toMatch(/el albarán dice 954 kg ≈ 900 l y el nivel subió 850 l/);
  await page.locator('.dlg').last().locator('button', { hasText: 'Cerrar' }).click(); await page.waitForTimeout(200);
  await page.locator('button', { hasText: 'Recarga de glicol' }).click(); await page.waitForTimeout(300);
  const d = page.locator('.dlg').last();
  await d.locator('#glKg').fill('1060'); await d.locator('#glDens').fill('1,06'); await expect(d).toContainText('≈ 1000 l'); await d.locator('#glA').fill('900'); await d.locator('#glD').fill('1880');
  await d.locator('button', { hasText: 'Guardar' }).click(); await page.waitForTimeout(800);
  await expect.poll(() => page.evaluate(() => Object.values(window.__D.cont).flatMap(x => x.items).filter(x => x.dep === 'gli').length)).toBe(3);
  const its = await page.evaluate(() => Object.values(window.__D.cont).flatMap(x => x.items).filter(x => x.dep === 'gli')); expect(its[2]).toMatchObject({ tipo: 'recarga', kg: 1060, dens: 1.06, l: 1000, antes: 900, despues: 1880 });
  expect(err).toEqual([]);
});

test('Aceites: previsión con el gasto de los contadores, 1 GRG de reserva y punto de pedido que se afina solo', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => { let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v; const k = Object.keys(v.mov)[0];
    v.cat.app.articulos.push({ id: 'ater', desc: 'ACEITE TÉRMICO BESTERM HT', fam: 'consumible', grupo: 'aceite', ud: 'kg', alms: ['gen'] });
    const h = new Date(), f = n => { const x = new Date(h); x.setDate(x.getDate() - n); return x.toISOString().slice(0, 10); };
    v.mov[k].items.push({ id: 'e1', f: f(30), alm: 'gen', art: 'ater', cant: 2610, tipo: 'entrada' }, { id: 'g1', f: f(20), alm: 'gen', art: 'ater', cant: 870, tipo: 'salida', nota: 'Limpieza: Cambiar GRG de aceite térmico' });
    v.cont = { [String(h.getFullYear())]: { items: [{ id: 'r1', f: f(20), nave: 'Nave 1', c: { ter: 0 }, ts: 1 }, { id: 'r2', f: f(10), nave: 'Nave 1', c: { ter: 200 }, ts: 2 }, { id: 'r3', f: f(1), nave: 'Nave 1', c: { ter: 380 }, ts: 3 }] } }; } }); });
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Aceites, taladrinas y jabones$/ }).click(); await page.waitForTimeout(400);
  const card = page.locator('section', { hasText: 'Previsión y pedido de aceites' });
  // 380 l en 19 días = 20 l/día × 0,87 = 17,4 kg/día; mínimo 1 GRG (870); pedir al llegar a 870 + 17,4 × 7 = 992
  await expect(card).toContainText('20 l · 17,4 kg'); await expect(card).toContainText('1740 kg (2 GRG)'); await expect(card).toContainText('870 / 992 kg');
  await expect(card).toContainText('Falta el plazo de entrega de Térmico');
  await card.locator('button', { hasText: 'Plazos y reserva' }).click(); await page.waitForTimeout(300);
  await page.locator('#paPater').fill('30'); await page.locator('.dlg').last().locator('button', { hasText: 'Guardar' }).click(); await page.waitForTimeout(800);
  await expect(page.locator('section', { hasText: 'Previsión y pedido de aceites' })).toContainText('870 / 1392 kg');
  const a = await page.evaluate(() => window.__D.cat.app.articulos.find(x => x.id === 'ater'));
  expect(a.plazo).toBe(30); expect(a.min).toBe(870); expect(a.pp).toBe(1392);
  expect(err).toEqual([]);
});

test('Consultas: «qué tengo que pedir de … para noviembre / el mes que viene» calcula lo que hace falta pedir', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => { let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v; const k = Object.keys(v.mov)[0];
    v.cat.app.articulos.push({ id: 'rod', desc: 'Rodillo de prueba', fam: 'consumible', ud: 'ud', alms: ['gen'], min: 2, precio: '10' });
    const h = new Date(), f = n => { const x = new Date(h); x.setDate(x.getDate() - n); return x.toISOString().slice(0, 10); };
    v.mov[k].items.push({ id: 're', f: f(31), alm: 'gen', art: 'rod', cant: 40, tipo: 'entrada' });
    for (let i = 1; i <= 30; i++) v.mov[k].items.push({ id: 'rs' + i, f: f(i), alm: 'gen', art: 'rod', cant: 1, tipo: 'salida' }); } }); });
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  await page.fill('#bdQ', 'qué tengo que pedir de rodillo de prueba para el mes que viene'); await page.waitForTimeout(400);
  const t = (await page.locator('#bdRes').innerText()).replace(/\s+/g, ' ');
  // gasta ~1 al día: un mes entero + lo que queda de este + 2 de reserva − 10 que hay
  expect(t).toMatch(/Para \w+ de Rodillo de prueba tienes que pedir \d+ ud/); expect(t).toMatch(/hay 10 y la reserva mínima es 2/);
  await page.fill('#bdQ', 'qué tengo que pedir para el mes que viene'); await page.waitForTimeout(400);
  const t2 = (await page.locator('#bdRes').innerText()).replace(/\s+/g, ' ');
  expect(t2).toMatch(/hay que pedir \d+ artículos?/); expect(t2).toContain('Rodillo de prueba'); expect(t2).toContain('Copiar la lista para compras');
  await page.fill('#bdQ', 'que tengo que pedir de pistones de 80 para noviembre'); await page.waitForTimeout(400);
  const t3 = (await page.locator('#bdRes').innerText()).replace(/\s+/g, ' ');
  expect(t3).toMatch(/qué hay que pedir/); expect(t3).toMatch(/Pistón Ø 80|No hay consumo/); expect(t3).not.toMatch(/No he encontrado/);
  expect(err).toEqual([]);
});

test('Consultas: comparar el gasto de un material o una máquina con meses anteriores y ver desviaciones', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => { let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v; const k = Object.keys(v.mov)[0];
    v.cat.app.articulos.push({ id: 'rod', desc: 'Rodillo de prueba', fam: 'consumible', ud: 'ud', alms: ['gen'], precio: '10' });
    const m25 = v.cat.app.maquinas.find(x => x.cod === 'F25'), m30 = v.cat.app.maquinas.find(x => x.cod === 'F30') || v.cat.app.maquinas[1];
    const h = new Date(), mes = n => { const x = new Date(h.getFullYear(), h.getMonth() + n, 1, 12); return x.toISOString().slice(0, 7); };
    let i = 0; const s = (f, maq, cant) => v.mov[k].items.push({ id: 'cs' + (i++), f, alm: 'gen', art: 'rod', cant, tipo: 'salida', maq });
    for (let n = 1; n <= 6; n++) { s(mes(-n) + '-02', m25.id, 6); s(mes(-n) + '-03', m30.id, 4); }
    s(h.toISOString().slice(0, 8) + '01', m25.id, 26); s(h.toISOString().slice(0, 8) + '01', m30.id, 4); } }); });
  await page.addInitScript(() => { const h = new Date(), mes = n => { const x = new Date(h.getFullYear(), h.getMonth() + n, 1, 12); return x.toISOString().slice(0, 7); }; const M = {}; for (let n = 0; n <= 6; n++) M[mes(-n)] = { n: { 'Nave 1': 100000 }, m: {} }; window.__PROD = { sem: {}, mes: M }; });
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  await page.fill('#bdQ', 'compara el gasto de rodillo de prueba este mes con los meses anteriores'); await page.waitForTimeout(400);
  let t = (await page.locator('#bdRes').innerText()).replace(/\s+/g, ' ');
  expect(t).toMatch(/Este mes: 30 ud/); expect(t).toMatch(/La media de los 6 meses anteriores es 10 ud/); expect(t).toMatch(/Desviación fuerte/);
  expect(t).toMatch(/Por tonelada de aluminio: Este mes 30 ud por cada 100 t \(con 100 t\); la media de los 6 meses anteriores 10 ud por cada 100 t\. Gasta un 200 % más por tonelada/);
  expect(t).toMatch(/Lo que más se ha desviado al alza/); expect(t).toMatch(/F25 Este mes: 26 ud/); expect(t).toContain('Mes a mes'); expect(t).not.toMatch(/No he encontrado/);
  await page.fill('#bdQ', 'rodillo de prueba este mes frente al mes pasado'); await page.waitForTimeout(400);
  t = (await page.locator('#bdRes').innerText()).replace(/\s+/g, ' ');
  expect(t).toMatch(/Este mes: 30 ud · 300 €\. \w+: 10 ud · 100 €\. Un 200 % más\./);
  await page.fill('#bdQ', 'compara el gasto de la F25 este mes con los meses anteriores'); await page.waitForTimeout(400);
  t = (await page.locator('#bdRes').innerText()).replace(/\s+/g, ' ');
  expect(t).toMatch(/Rodillo de prueba/); expect(t).toMatch(/Desviación/);
  expect(err).toEqual([]);
});

test('Desviaciones: pico de gasto por tonelada, causa apuntada y aviso semanal guardado', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => {
    const lunes = f => { const d = new Date(f + 'T12:00:00'), w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return d.toISOString().slice(0, 10); };
    const mas = (f, n) => { const d = new Date(f + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
    const hoyS = new Date().toISOString().slice(0, 10), W0 = mas(lunes(hoyS), -7);
    const sem = {}; for (let i = 0; i <= 14; i++) { const w = mas(W0, -7 * i); sem[w] = { n: { 'Nave 1': 100000 }, m: { F25: 10000 }, d: { F25: 5 } }; }
    window.__PROD = { sem, mes: {} };
    let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v; const k = Object.keys(v.mov)[0];
      v.cat.app.articulos.push({ id: 'rod', desc: 'Rodillo de prueba', fam: 'consumible', ud: 'ud', alms: ['gen'], precio: '10' });
      const m25 = v.cat.app.maquinas.find(x => x.cod === 'F25'); let i = 0;
      for (let n = 1; n <= 13; n++) v.mov[k].items.push({ id: 'dv' + (i++), f: mas(W0, -7 * n + 2), alm: 'gen', art: 'rod', cant: n % 2 ? 2 : 3, tipo: 'salida', maq: m25.id });
      v.mov[k].items.push({ id: 'dv' + (i++), f: mas(W0, 2), alm: 'gen', art: 'rod', cant: 12, tipo: 'salida', maq: m25.id }); } }); });
  await page.goto(url); await page.waitForTimeout(1500);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Desviaciones$/ }).click(); await page.waitForTimeout(400);
  const v = page.locator('#view');
  await expect(v).toContainText('F25 · '); await expect(v).toContainText('Rodillo de prueba'); await expect(v).toContainText('para 10 t');
  await expect(v).toContainText(/120 € para 10 t; lo normal serían unos 25 €/); await expect(v).toContainText(/12 ud para 100 t; lo normal serían unos 2,5 ud/);
  await expect.poll(() => page.evaluate(() => ((window.__D.desv || {}).semana || {}).items?.length || 0)).toBeGreaterThan(0);
  await v.locator('section', { hasText: 'Rodillo de prueba' }).first().locator('button', { hasText: 'Investigar' }).click(); await page.waitForTimeout(300);
  let dI = page.locator('.dlg').last();
  await expect(dI).toContainText('Investigar: Rodillo de prueba'); await expect(dI).toContainText('12 ud en la semana del'); await expect(dI).toContainText('Lo que llama la atención'); await expect(dI).toContainText('Por motivo'); await expect(dI).toContainText('Sin responsable');
  await dI.locator('button.it', { hasText: 'Rodillo de prueba' }).first().click(); await page.waitForTimeout(300);
  await expect(page.locator('#ccMot')).toHaveCount(0);
  await page.fill('#ccResp', 'Operario X'); await page.locator('.dlg').last().getByRole('button', { name: 'Guardar' }).click(); await page.waitForTimeout(600);
  dI = page.locator('.dlg').last(); await expect(dI).toContainText('Investigar: Rodillo de prueba'); await expect(dI).toContainText('Operario X');
  await dI.getByRole('button', { name: 'Apuntar causa' }).click(); await page.waitForTimeout(300);
  let dc = page.locator('.dlg').last(); await expect(dc).toContainText('Causa y acción');
  await page.fill('#cnCausa', 'Fallo de prueba'); await dc.locator('.chip', { hasText: 'Revisar la máquina' }).click(); await page.waitForTimeout(150);
  dc = page.locator('.dlg').last(); await expect(dc).toContainText('Comprobar si ha funcionado'); await dc.getByRole('button', { name: 'Guardar' }).click(); await page.waitForTimeout(800);
  await expect(v).toContainText('Investigaciones y acciones'); await expect(v).toContainText('Acción: Revisar la máquina');
  await expect.poll(() => page.evaluate(() => JSON.stringify(window.__D.inv || {}))).toContain('Revisar la máquina');
  await v.locator('button.it', { hasText: 'Acción: Revisar la máquina' }).first().click(); await page.waitForTimeout(300);
  await expect(page.locator('.dlg').last()).toContainText('Comprobar'); await page.locator('.dlg').last().getByRole('button', { name: 'Cerrar' }).click(); await page.waitForTimeout(200);
  await v.locator('section', { hasText: 'F25 · ' }).first().locator('button', { hasText: 'Apuntar causa' }).click(); await page.waitForTimeout(300);
  await page.locator('.dlg').last().locator('.chip', { hasText: 'Molde nuevo' }).click();
  await page.locator('.dlg').last().locator('button', { hasText: 'Guardar' }).click(); await page.waitForTimeout(800);
  await expect(v).toContainText('Causa: Molde nuevo');
  await v.locator('button', { hasText: 'Informe del mes' }).click(); await page.waitForTimeout(300);
  await expect(page.locator('.dlg').last()).toContainText('Informe de desviaciones');
  expect(err).toEqual([]);
});

test('Consultas: las preguntas habituales van en una sola fila que no se sale de la pantalla', async ({ page }) => {
  const err = await vigila(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  await page.evaluate(() => { window.BuscaAprende.estado.top = ['qué maquina tiene mas consumo', 'dime modelo de la máquina de la F25', 'compara lo que ha consumido', 'quien cambio las ultima BE-02', 'qué maquina tiene mas consumo de barras', 'qué máquina tiene horno krown']; });
  await page.fill('#bdQ', 'x'); await page.fill('#bdQ', ''); await page.waitForTimeout(300);
  await expect(page.locator('.ba-top-q')).toHaveCount(5);
  const r = await page.evaluate(() => { const t = document.querySelector('.ba-top').getBoundingClientRect(); return { h: t.height, sw: document.documentElement.scrollWidth, w: window.innerWidth }; });
  expect(r.h).toBeLessThan(45); expect(r.sw).toBeLessThanOrEqual(r.w);
  await page.locator('.ba-top-q').first().click(); await page.waitForTimeout(300);
  await expect(page.locator('#bdQ')).toHaveValue('qué maquina tiene mas consumo');
  expect(err).toEqual([]);
});

test('Consultas: «coste de las reparaciones que están abiertas» da el importe de los ejes en el taller', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  for (const q of ['Coste de las reparaciones que están abiertas', 'cuánto cuestan las reparaciones pendientes', 'importe de las reparaciones en el taller']) {
    await page.fill('#bdQ', q); await page.waitForTimeout(400);
    await expect(page.locator('#bdRes')).toContainText('importe de los ejes en reparación'); }
  await page.fill('#bdQ', 'cuánto hemos gastado este mes'); await page.waitForTimeout(400);
  await expect(page.locator('#bdRes')).not.toContainText('importe de los ejes en reparación');
  expect(err).toEqual([]);
});

test('Pistones: entradas de nuevos y recuperados con su precio, en «Compras de pistones» y en Consultas', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => { let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v; const k = Object.keys(v.mov)[0];
    const a = v.cat.app.articulos.find(x => x.id === 'pist-80'); a.precio = '180'; a.precioRec = '60';
    const h = new Date().toISOString().slice(0, 10);
    v.mov[k].items.push({ id: 'pn1', f: h, alm: 'gen', art: 'pist-80', cant: 4, tipo: 'entrada' }, { id: 'pr1', f: h, alm: 'gen', art: 'pist-80', cant: 3, tipo: 'entrada', nota: 'Recuperado por Pistones' }); } }); });
  await page.goto(url); await page.waitForTimeout(1200);
  // apuntar una entrada de recuperados a mano
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Movimientos$/ }).click(); await page.waitForTimeout(300);
  await page.locator('#mArt').selectOption('pist-80'); await page.waitForTimeout(200);
  await page.locator('.seg button', { hasText: 'Recuperados' }).click(); await page.waitForTimeout(200);
  await expect(page.locator('#view')).toContainText('Precio de recuperado: 60 € cada uno');
  await page.fill('#mCant', '2'); await page.locator('#mBtn').click(); await page.waitForTimeout(800);
  const m = await page.evaluate(() => Object.values(window.__D.mov).flatMap(x => x.items).filter(x => x.art === 'pist-80' && x.cant === 2 && x.tipo === 'entrada'));
  expect(m.length).toBe(1); expect(m[0].rec).toBe(true);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  await page.fill('#bdQ', 'cuánto hemos gastado en compras de pistones este mes'); await page.waitForTimeout(400);
  await page.evaluate(() => { window.__q = 1; });
  // 4 nuevos × 180 = 720; 5 recuperados × 60 = 300; ahorro 5 × 120 = 600
  await expect(page.locator('#bdRes')).toContainText(/Este mes han entrado 4 pistones nuevos \(720(,00)? €\) y 5 recuperados \(300(,00)? €\): 1020(,00)? € en total\. Recuperar ha ahorrado unos 600(,00)? €/);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Pistones$/ }).click(); await page.waitForTimeout(400);
  const segs = await page.locator('#view .seg button').allTextContents();
  for (const t of segs) { if (await page.locator('#view').getByText('Compras de pistones').count()) break; await page.locator('#view .seg button', { hasText: t }).first().click(); await page.waitForTimeout(300); }
  await expect(page.locator('#view')).toContainText('Compras de pistones');
  await expect(page.locator('#view')).toContainText('Ahorro por recuperar');
  expect(err).toEqual([]);
});

test('Tolvas: enviar a reparar, vuelven al almacén con su importe y el cambio en la máquina suma al gasto del horno', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => { let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v; const k = Object.keys(v.mov)[0];
    const m25 = v.cat.app.maquinas.find(x => x.cod === 'F25');
    v.cat.app.articulos.push({ id: 'tv-h', desc: 'Tolva de hierro', fam: 'horno', grupo: 'Tolvas', ud: 'ud', alms: ['gen'], precio: '300', iny: [m25.id] }, { id: 'tv-r', desc: 'Tolva refractaria', fam: 'horno', grupo: 'Tolvas', ud: 'ud', alms: ['gen'], precio: '450', iny: [m25.id] });
    const h = new Date().toISOString().slice(0, 10);
    v.mov[k].items.push({ id: 'tvs', f: h, alm: 'gen', art: 'tv-h', cant: 1, tipo: 'salida', maq: m25.id }); } }); });
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Horno$/ }).click(); await page.waitForTimeout(400);
  const v = page.locator('#view');
  await expect(v).toContainText('Tolvas en reparación'); await expect(v).toContainText('ninguna en el taller');
  await v.locator('button', { hasText: 'Enviar a reparar' }).click(); await page.waitForTimeout(300);
  const d = page.locator('.dlg').last(); await d.locator('#tvCtv-h').fill('2'); await d.locator('#tvCtv-r').fill('1'); await d.locator('button', { hasText: 'Enviar' }).click(); await page.waitForTimeout(800);
  await expect(v).toContainText('3 en el taller'); await expect(v).toContainText('Tolva de hierro × 2');
  await v.locator('.it', { hasText: 'Tolva de hierro × 2' }).locator('button', { hasText: 'Han vuelto' }).click(); await page.waitForTimeout(300);
  const d2 = page.locator('.dlg').last(); await d2.locator('#tvvE').fill('550'); await d2.locator('button', { hasText: 'Guardar' }).click(); await page.waitForTimeout(900);
  await expect(v).toContainText('1 en el taller');
  const ent = await page.evaluate(() => Object.values(window.__D.mov).flatMap(x => x.items).filter(x => x.art === 'tv-h' && x.tipo === 'entrada'));
  expect(ent.length).toBe(1); expect(ent[0].cant).toBe(2);
  await expect(v.locator('section', { hasText: 'Tolvas en reparación' })).toContainText(/Tolva de hierro\s*2\s*550/);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  await page.fill('#bdQ', 'tolvas en reparación'); await page.waitForTimeout(400);
  await expect(page.locator('#bdRes')).toContainText('En el taller hay 1 tolva refractaria.');
  await page.fill('#bdQ', 'todo sobre la F25'); await page.waitForTimeout(400);
  await page.locator('#bdRes button', { hasText: 'Abrir la ficha de la F25' }).click(); await page.waitForTimeout(400);
  await page.locator('[role=tab]', { hasText: 'Gasto' }).last().click(); await page.waitForTimeout(300);
  await expect(page.locator('body')).toContainText(/Horno\s*300/);
  expect(err).toEqual([]);
});

test('Movimientos: modificar una entrada (pistones nuevos ↔ recuperados, cantidad y fecha de otro mes)', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => { let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v; const k = Object.keys(v.mov).sort().pop();
    const f = k + '-02'; v.mov[k].items.push({ id: 'em1', f, alm: 'gen', art: 'pist-80', cant: 4, tipo: 'entrada', nota: 'prueba editar', ts: Date.now() + 9e9 }); } }); });
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Movimientos$/ }).click(); await page.waitForTimeout(300);
  const mk = await page.evaluate(() => Object.keys(window.__D.mov).sort().pop()); await page.locator('#hMes').selectOption(mk); await page.waitForTimeout(300);
  await page.locator('tr', { hasText: 'prueba editar' }).locator('button', { hasText: 'Modificar' }).click(); await page.waitForTimeout(300);
  const d = page.locator('.dlg').last();
  await d.locator('.seg button', { hasText: 'Recuperados' }).click(); await d.locator('#emCant').fill('5'); await d.locator('button', { hasText: 'Guardar' }).click(); await page.waitForTimeout(800);
  let m = await page.evaluate(() => Object.values(window.__D.mov).flatMap(x => x.items).find(x => x.id === 'em1'));
  expect(m.rec).toBe(true); expect(m.cant).toBe(5);
  // cambiar de mes: se mueve al documento del otro mes
  await page.locator('tr', { hasText: 'prueba editar' }).locator('button', { hasText: 'Modificar' }).click(); await page.waitForTimeout(300);
  const otra = await page.evaluate(() => { const k = Object.keys(window.__D.mov).sort().pop(); const d = new Date(k + '-15T12:00:00'); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10); });
  await page.locator('.dlg').last().locator('#emF').fill(otra); await page.locator('.dlg').last().locator('button', { hasText: 'Guardar' }).click(); await page.waitForTimeout(800);
  const where = await page.evaluate(() => Object.entries(window.__D.mov).filter(([, x]) => (x.items || []).some(i => i.id === 'em1')).map(([k]) => k));
  expect(where).toEqual([otra.slice(0, 7)]);
  m = await page.evaluate(() => Object.values(window.__D.mov).flatMap(x => x.items).find(x => x.id === 'em1'));
  expect(m.rec).toBe(true); expect(m.cant).toBe(5); expect(m.f).toBe(otra);
  expect(err).toEqual([]);
});

test('Leer albarán: recuperación de Meyusa entra como recuperados con su Ø y avisa si el albarán ya está', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => {
    window.__ALB_MOCK = { proveedor: 'MEYUSA, S.A.', albaran: '001466A26', fecha: '2026-10-29', tipo: 'recuperacion', confianza: 'alta', lineas: [
      { texto: 'RECUP. PISTONES ESPECIALES DE Ø100 A Ø90', cantidad: 7, desde: '100', hasta: '90', especial: true },
      { texto: 'RECUP. PISTONES DE Ø100 A Ø90', cantidad: 1, desde: '100', hasta: '90', especial: false },
      { texto: 'RECUP. PISTONES DE Ø80 A Ø70', cantidad: 33, desde: '80', hasta: '70', especial: false }] };
  });
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Movimientos$/ }).click(); await page.waitForTimeout(300);
  await page.locator('#mLeerAlb').setInputFiles({ name: 'alb.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64') });
  await page.waitForTimeout(1200);
  const d = page.locator('.dlg').last();
  await expect(d).toContainText('Albarán de recuperación de pistones'); await expect(d).toContainText('Era Ø 80 → vuelve como Ø 70');
  await expect(d.locator('#laA0')).toHaveValue('pist-90esp'); await expect(d.locator('#laA2')).toHaveValue('pist-70');
  await d.locator('button', { hasText: 'Guardar entradas' }).click(); await page.waitForTimeout(900);
  const m = await page.evaluate(() => Object.values(window.__D.mov).flatMap(x => x.items).filter(x => x.alb === '001466A26'));
  expect(m.length).toBe(3); expect(m.every(x => x.rec === true)).toBe(true); expect(m.find(x => x.art === 'pist-70').cant).toBe(33);
  expect(m.find(x => x.art === 'pist-70').nota).toContain('era Ø 80');
  // otra vez el mismo albarán: avisa
  await page.locator('#mLeerAlb').setInputFiles({ name: 'alb.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64') });
  await page.waitForTimeout(1200);
  await expect(page.locator('.dlg').last()).toContainText('ya está apuntado');
  expect(err).toEqual([]);
});

test('Leer albarán: compra con una línea sin reconocer; lo que se elige se recuerda', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => { window.__ALB_MOCK = { proveedor: 'Meyusa', albaran: 'C-55', fecha: '2026-10-20', tipo: 'compra', lineas: [
    { texto: 'GUANTE ANTICORTE T9', cantidad: 12, unidad: 'par', art: 'c1' }, { texto: 'ESPUMADERA INOX 300', cantidad: 2, art: null }] }; });
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Movimientos$/ }).click(); await page.waitForTimeout(300);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
  await page.locator('#mLeerAlb').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: png }); await page.waitForTimeout(1200);
  const d = page.locator('.dlg').last();
  await expect(d.locator('#laA0')).toHaveValue('c1'); await expect(d.locator('#laProv')).not.toHaveValue('');
  await d.locator('button', { hasText: 'Guardar entradas' }).click(); await page.waitForTimeout(400);
  await expect(page.locator('#toast')).toContainText('Elige el artículo de «ESPUMADERA INOX 300»');
  await d.locator('#laA1').selectOption('c5'); await d.locator('button', { hasText: 'Guardar entradas' }).click(); await page.waitForTimeout(900);
  const map = await page.evaluate(() => window.__D.cat.app.albMap);
  expect(map['espumadera inox 300']).toBe('c5');
  await page.locator('#mLeerAlb').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: png }); await page.waitForTimeout(1200);
  await expect(page.locator('.dlg').last().locator('#laA1')).toHaveValue('c5');
  expect(err).toEqual([]);
});

test('Ejes: el plazo del taller cuenta desde que se pide; los que están allí sin pedir no son retraso', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => { let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v;
    const k = Object.keys(v.rep)[0], it = v.rep[k].items; const menos = (f, n) => { const x = new Date(f + 'T12:00:00'); x.setDate(x.getDate() - n); return x.toISOString().slice(0, 10); };
    it.filter(r => r.res === 'ok' && r.rec).slice(0, 6).forEach(r => { r.traer = menos(r.rec, 7); });
    const abiertos = it.filter(r => !r.res && r.env);
    const hoyS = new Date().toISOString().slice(0, 10);
    if (abiertos[0]) abiertos[0].traer = menos(hoyS, 40); else it.push({ id: 'rx', eje: '2.8.J-2', desp: 'X', alta: menos(hoyS, 90), env: menos(hoyS, 90), traer: menos(hoyS, 40) }); } }); });
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Ejes$/ }).click(); await page.waitForTimeout(500);
  const v = page.locator('#view');
  await expect(v).toContainText('Pedidos al taller, esperando a que vuelvan (1)');
  await expect(v).toContainText('Suelen tardar 5 días laborables');
  await expect(v.locator('section', { hasText: 'Pedidos al taller' }).locator('.pill.bad')).toHaveCount(1);
  await expect(v).toContainText(/En el taller sin pedir \(\d+\)/);
  expect(err).toEqual([]);
});

test('Plazos aprendidos: con dos pedidos que llegan, el artículo tiene su plazo calculado', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => { let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v; const k = Object.keys(v.mov)[0];
    v.cat.app.articulos.push({ id: 'rod', desc: 'Rodillo de prueba', fam: 'consumible', ud: 'ud', alms: ['gen'] });
    v.mov[k].items.push({ id: 'p1', f: '2026-09-11', ped: '2026-09-01', alm: 'gen', art: 'rod', cant: 5, tipo: 'entrada' }, { id: 'p2', f: '2026-10-13', ped: '2026-10-01', alm: 'gen', art: 'rod', cant: 5, tipo: 'entrada' }); } }); });
  await page.goto(url); await page.waitForTimeout(1200);
  const pl = await page.evaluate(() => { const b = [...document.querySelectorAll('#tabs button')].find(x => x.textContent.includes('Stock')); b.click(); return true; });
  await page.waitForTimeout(400);
  await page.evaluate(() => { window.__q = 1; });
  await page.locator('#view').getByText('Rodillo de prueba').first().click(); await page.waitForTimeout(400);
  await expect(page.locator('body')).toContainText(/Plazo de entrega\s*12 días \(calculado con 2 pedidos\)/);
  expect(err).toEqual([]);
});

test('Carga completa en un Excel: se descarga relleno, se completa y al subirlo se cargan artículos, proveedores, hornos y recuentos', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => { let c; Object.defineProperty(window, 'claude', { configurable: true, get: () => c, set: v => { c = { use: async n => n === 'downloads' ? { save: async ({ filename, data }) => { window.__dl = { filename, buf: Array.from(new Uint8Array(await data.arrayBuffer())) }; } } : v.use(n) }; } }); });
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Catálogo$/ }).click(); await page.waitForTimeout(400);
  await page.locator('button', { hasText: 'Descargar Excel para rellenar' }).click();
  await expect.poll(() => page.evaluate(() => !!window.__dl), { timeout: 15000 }).toBe(true);
  const dl = await page.evaluate(() => window.__dl);
  expect(dl.filename).toMatch(/^Carga_almacen_/);
  const XLSX = require('xlsx'); const wb = XLSX.read(Buffer.from(dl.buf));
  expect(wb.SheetNames).toEqual(['Artículos', 'Proveedores', 'Hornos', 'Modelos de eje', 'Inyectoras', 'Instrucciones']);
  // Bea completa: precio de un pistón, un proveedor con CIF, el horno de la F25 y un recuento
  const A = XLSX.utils.sheet_to_json(wb.Sheets['Artículos'], { defval: '' });
  const p80 = A.find(r => r['Descripción'] === 'Pistón Ø 80'); p80['Precio (€)'] = 175; p80['Precio recuperado (€)'] = 55; p80['Cantidad contada'] = 12; p80['Almacén del recuento'] = 'Almacén general';
  A.push({ 'ID': '', 'Descripción': 'Rodillo nuevo de prueba', 'Familia': 'Consumible', 'Unidad': 'ud', 'Stock mínimo': 3, 'Proveedor': 'Proveedor Nuevo SL' });
  wb.Sheets['Artículos'] = XLSX.utils.json_to_sheet(A);
  const P = XLSX.utils.sheet_to_json(wb.Sheets['Proveedores'], { defval: '' }); P[0]['CIF'] = 'B-12345678'; wb.Sheets['Proveedores'] = XLSX.utils.json_to_sheet(P);
  const H = XLSX.utils.sheet_to_json(wb.Sheets['Hornos'], { defval: '' }); const h25 = H.find(r => r['Inyectora'] === 'F25'); h25['Marca'] = 'Striko'; h25['Energía'] = 'Gas'; h25['Fabricación (MM/AAAA)'] = '06/2018'; wb.Sheets['Hornos'] = XLSX.utils.json_to_sheet(H);
  delete wb.Sheets['Inyectoras']; wb.SheetNames = wb.SheetNames.filter(n => n !== 'Inyectoras');
  const out = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  await page.locator('section', { hasText: 'Carga completa en un Excel' }).locator('input[type=file]').setInputFiles({ name: 'relleno.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: out });
  await page.waitForTimeout(1000);
  const d = page.locator('.dlg').last();
  await expect(d).toContainText('Artículos que cambian'); await expect(d).toContainText('Artículos nuevos'); await expect(d).toContainText('Recuentos de stock');
  await d.locator('button', { hasText: 'Cargar' }).click(); await page.waitForTimeout(1000);
  const c = await page.evaluate(() => window.__D.cat.app);
  const a80 = c.articulos.find(a => a.id === 'pist-80'); expect(+a80.precio).toBe(175); expect(+a80.precioRec).toBe(55);
  const nu = c.articulos.find(a => a.desc === 'Rodillo nuevo de prueba'); expect(nu.min).toBe(3); expect(c.proveedores.find(p => p.id === nu.prov).nom).toBe('Proveedor Nuevo SL');
  expect(c.proveedores.find(p => p.id === P[0]['ID']).cif).toBe('B-12345678');
  const m25 = c.maquinas.find(m => m.cod === 'F25'); expect(m25.hornoPlaca.marca).toBe('Striko'); expect(m25.hornoPlaca.energia).toBe('Gas'); expect(m25.hornoFab).toBe('2018-06');
  const aj = await page.evaluate(() => Object.values(window.__D.mov).flatMap(x => x.items).filter(x => x.art === 'pist-80' && x.tipo === 'ajuste' && /Excel/.test(x.nota || '')));
  expect(aj.length).toBe(1); expect(aj[0].contado).toBe(12);
  expect(err).toEqual([]);
});

test('Cambio de barra: el motivo empieza vacío y avisa si falta', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Barras expulsoras$/ }).click(); await page.waitForTimeout(300);
  await page.locator('#view button', { hasText: /^Registrar cambio$/ }).first().click(); await page.waitForTimeout(300);
  const d = page.locator('.dlg').last();
  await expect(d.locator('.chip[aria-pressed="true"]', { hasText: /Rotura|Desgaste/ })).toHaveCount(0);
  await expect(d).toContainText('Elige el motivo del cambio');
  const maq = await page.locator('#btM option').nth(1).getAttribute('value'); await page.selectOption('#btM', maq); await page.waitForTimeout(200);
  const a = await page.locator('#btA option[value]:not([value=""])').first().getAttribute('value');
  if (a) {
    await page.selectOption('#btA', a); await page.waitForTimeout(200);
    if (!(await page.inputValue('#btAl'))) { const al = await page.locator('#btAl option').nth(1).getAttribute('value'); await page.selectOption('#btAl', al); }
    await d.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.locator('body')).toContainText('Falta el motivo del cambio');
    await expect(page.locator('.dlg').last()).toBeVisible();
  }
  expect(err).toEqual([]);
});

test('Quién no apunta: pulsar un cambio deja ponerle motivo y responsable', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Pistones$/ }).click(); await page.waitForTimeout(300);
  const maq = await page.locator('#pMaq option').nth(1).getAttribute('value'); await page.selectOption('#pMaq', maq);
  const diam = await page.locator('#pDiam option').nth(2).getAttribute('value'); await page.selectOption('#pDiam', diam);
  const dest = await page.locator('#pDest option').nth(1).getAttribute('value'); await page.selectOption('#pDest', dest);
  await page.locator('#pBtn').click(); await page.waitForTimeout(200); await page.locator('#pBtn').click(); await page.waitForTimeout(500);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  await page.fill('#bdQ', 'cambios de pistones sin motivo'); await page.waitForTimeout(300);
  await expect(page.locator('#bdRes')).toContainText('Quién deja el motivo sin poner');
  await page.locator('#bdRes button.it', { hasText: /sin motivo/ }).first().click(); await page.waitForTimeout(200);
  const d = page.locator('.dlg').last();
  if (await d.locator('h3', { hasText: 'Completar el cambio' }).count() === 0) { await d.locator('button.it').first().click(); await page.waitForTimeout(200); }
  await page.selectOption('#ccMot', 'ROTURA'); await page.fill('#ccResp', 'Prueba');
  await page.locator('.dlg').last().getByRole('button', { name: 'Guardar' }).click(); await page.waitForTimeout(500);
  const ok = await page.evaluate(() => JSON.stringify(window.__D.pist || {}).includes('"resp":"Prueba"') && /"motivo":"ROTURA"[^}]*"resp":"Prueba"|"resp":"Prueba"[^}]*"motivo":"ROTURA"/.test(JSON.stringify(window.__D.pist || {})));
  expect(ok).toBe(true);
  expect(err).toEqual([]);
});

test('Pestaña Consumo: apuntar un consumo con el operario', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  await page.locator('#tabs button', { hasText: 'Consumo' }).click(); await page.waitForTimeout(300);
  await expect(page.locator('#view')).toContainText('Apuntar un consumo');
  await expect(page.locator('#view .seg[aria-label="Tipo de movimiento"]')).toHaveCount(0);
  const a = await page.locator('#mArt option[value]:not([value=""])').first().getAttribute('value'); await page.selectOption('#mArt', a); await page.waitForTimeout(200);
  await page.fill('#mCant', '1');
  await page.locator('#mBtn').click(); await expect(page.locator('body')).toContainText('Falta el operario');
  await page.fill('#mResp', 'Operario prueba');
  await page.locator('#mBtn').click(); await page.waitForTimeout(500);
  await expect(page.locator('#view')).toContainText('Operario: Operario prueba');
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});

test('Investigar: botón en Consultas, bajar por máquina y volver', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  await page.fill('#bdQ', 'pistones de 80 este año'); await page.waitForTimeout(400);
  const b = page.locator('#bdRes button', { hasText: 'Investigar esto' });
  await expect(b).toContainText('este año'); await b.click(); await page.waitForTimeout(300);
  let d = page.locator('.dlg').last();
  await expect(d).toContainText('Investigar: Pistón Ø 80'); await expect(d).toContainText('Por motivo'); await expect(d).toContainText('Cuándo');
  const t = (await d.innerText()).replace(/\s+/g, ' '); expect(t).not.toContain('undefined'); expect(t).not.toContain('NaN');
  await d.locator('button.it', { hasText: 'Pistón agarrotado' }).first().click(); await page.waitForTimeout(300);
  await expect(page.locator('.dlg').last()).toContainText('Investigar: Pistón Ø 80 · pistón agarrotado'); await page.locator('.dlg').last().getByRole('button', { name: '‹ Atrás' }).click(); await page.waitForTimeout(300);
  d = page.locator('.dlg').last();
  const fm = d.locator('button.it').first(); await fm.click(); await page.waitForTimeout(300);
  d = page.locator('.dlg').last();
  if (await d.getByRole('button', { name: '‹ Atrás' }).count()) { await d.getByRole('button', { name: '‹ Atrás' }).click(); await page.waitForTimeout(300); await expect(page.locator('.dlg').last()).toContainText('Investigar: Pistón Ø 80'); }
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});

test('Investigar desde las fichas y comprobar una acción vencida en Hoy', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => {
    let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v;
      const m = new Date(); m.setDate(m.getDate() - 40); const f = m.toISOString().slice(0, 10); const r = new Date(); r.setDate(r.getDate() - 2);
      v.inv = { lista: { items: [{ id: 'c1', f, t: 'Pistón Ø 80', F: { t: 'Pistón Ø 80', arts: [] }, causa: 'Roturas', accion: 'Revisar refrigeración', rev: r.toISOString().slice(0, 10), antes: { pd: 1, modo: 'u', ud: 'ud', per: 'x' }, estado: 'abierta', ts: 1 }] } }; } }); });
  await page.goto(url); await page.waitForTimeout(1500);
  await expect(page.locator('#view')).toContainText('acción para comprobar');
  await page.locator('#view button', { hasText: 'Comprobar' }).first().click(); await page.waitForTimeout(300);
  let d = page.locator('.dlg').last(); await expect(d).toContainText('Revisar refrigeración'); await expect(d).toContainText('Desde que se apuntó');
  await d.getByRole('button', { name: 'Ha funcionado', exact: true }).click(); await page.waitForTimeout(600);
  await expect.poll(() => page.evaluate(() => JSON.stringify(window.__D.inv))).toContain('"funciono"');
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Stock')).click()); await page.waitForTimeout(300);
  await page.locator('#view button.it').first().click(); await page.waitForTimeout(400);
  const inv = page.locator('.op-foot button', { hasText: 'Investigar' });
  await expect(inv).toHaveCount(1); { await inv.click(); await page.waitForTimeout(300); d = page.locator('.dlg').last(); await expect(d).toContainText('Investigar:'); await expect(d).toContainText('Hay '); await expect(d).toContainText('Apuntar conclusión'); }
  expect(err).toEqual([]);
});

test('Franjas de tiempo: atajos y desde/hasta en Consultas y en Investigar', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  await page.fill('#bdQ', 'pistones de 80'); await page.waitForTimeout(300);
  await expect(page.locator('.bd-per')).toContainText('sin elegir');
  await page.locator('.bd-per .chip', { hasText: 'Este año' }).click(); await page.waitForTimeout(300);
  expect(await page.inputValue('#bdQ')).toBe('pistones de 80 este año');
  await expect(page.locator('.bd-per')).toContainText('Periodo: este año');
  await page.locator('.bd-per .chip', { hasText: 'Desde / hasta' }).click();
  const y = new Date().getFullYear();
  await page.fill('#perD0', y + '-01-01'); await page.fill('#perD1', y + '-06-30');
  await page.locator('.bd-per button', { hasText: 'Aplicar' }).click(); await page.waitForTimeout(300);
  expect(await page.inputValue('#bdQ')).toBe('pistones de 80 del 01-01-' + y + ' al 30-06-' + y);
  await expect(page.locator('.bd-per')).toContainText('Periodo: del 01/01/');
  await page.locator('.bd-per .chip', { hasText: 'Este año' }).click(); await page.waitForTimeout(300);
  await page.locator('#bdRes button', { hasText: 'Investigar esto' }).click(); await page.waitForTimeout(300);
  let d = page.locator('.dlg').last(); await expect(d).toContainText('en este año');
  await d.locator('.chip', { hasText: 'Últimos 90 días' }).click(); await page.waitForTimeout(300);
  d = page.locator('.dlg').last(); await expect(d).toContainText('en últimos 90 días'); expect(await page.locator('.dlg').count()).toBe(1);
  await d.locator('.seg button', { hasText: 'Periodo anterior' }).click(); await page.waitForTimeout(300);
  d = page.locator('.dlg').last(); await expect(d.locator('.seg button[aria-pressed="true"]', { hasText: 'Periodo anterior' })).toHaveCount(1);
  const t = (await d.innerText()).replace(/\s+/g, ' '); expect(t).not.toContain('undefined'); expect(t).not.toContain('NaN');
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});

test('Averías: una rotura abre la avería, se añade otra rotura, causa evitable y resumen', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => {
    let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v;
      const m = new Date(); m.setDate(m.getDate() - 5); v.aver = { lista: { items: [{ id: 'av0', n: 1, maq: v.cat.app.maquinas[1].id, f: m.toISOString().slice(0, 10), t: 'Fuga vieja', causa: '', estado: 'cerrada', links: [], ts: 1 }] } }; } }); });
  await page.goto(url); await page.waitForTimeout(1500);
  await expect(page.locator('#view')).toContainText('avería sin causa');
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Pistones$/ }).click(); await page.waitForTimeout(300);
  const maq = await page.locator('#pMaq option').nth(1).getAttribute('value'); await page.selectOption('#pMaq', maq);
  const diam = await page.locator('#pDiam option').nth(2).getAttribute('value'); await page.selectOption('#pDiam', diam);
  await page.selectOption('#pMot', 'ROTURA');
  const dest = await page.locator('#pDest option').nth(1).getAttribute('value'); await page.selectOption('#pDest', dest);
  await page.locator('#pBtn').click(); await page.waitForTimeout(900);
  let d = page.locator('.dlg').last(); await expect(d).toContainText('¿Es por una avería?');
  await d.getByRole('button', { name: 'Abrir avería nueva' }).click(); await page.waitForTimeout(600);
  d = page.locator('.dlg').last(); await expect(d).toContainText('Pistón roto'); await expect(d).toContainText('Lo que se ha cambiado por esta avería'); await expect(d).toContainText('Pistas'); await expect(d).toContainText('2 meses anteriores');
  await d.locator('.chip', { hasText: 'Trabajando sin pistonwax' }).click(); await page.waitForTimeout(150);
  d = page.locator('.dlg').last(); await expect(d.locator('.seg button[aria-pressed="true"]', { hasText: 'Sí' })).toHaveCount(1);
  await d.getByRole('button', { name: 'Guardar' }).click(); await page.waitForTimeout(600);
  await expect.poll(() => page.evaluate(() => JSON.stringify(window.__D.aver))).toContain('Trabajando sin pistonwax');
  // barra rota en la misma máquina: se añade a la avería abierta
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Barras expulsoras$/ }).click(); await page.waitForTimeout(300);
  await page.locator('#view button', { hasText: /^Registrar cambio$/ }).first().click(); await page.waitForTimeout(300);
  await page.selectOption('#btM', maq); await page.waitForTimeout(200);
  const a = await page.locator('#btA option[value]:not([value=""])').first().getAttribute('value');
  if (a) {
    await page.selectOption('#btA', a); await page.waitForTimeout(200);
    if (!(await page.inputValue('#btAl'))) { const al = await page.locator('#btAl option').nth(1).getAttribute('value'); await page.selectOption('#btAl', al); }
    await page.locator('.dlg').last().locator('.chip', { hasText: /^Rotura$/ }).click(); await page.waitForTimeout(150);
    await page.locator('.dlg').last().locator('.seg button', { hasText: 'Chatarra' }).click(); await page.waitForTimeout(150);
    await page.locator('.dlg').last().getByRole('button', { name: 'Guardar', exact: true }).click(); await page.waitForTimeout(900);
    d = page.locator('.dlg').last(); await expect(d).toContainText('¿Es por una avería?');
    await d.locator('button.it', { hasText: 'Añadir a:' }).first().click(); await page.waitForTimeout(600);
    await expect.poll(() => page.evaluate(() => JSON.stringify(window.__D.aver).split('"k":"m"').length)).toBe(2);
  }
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Averías$/ }).click(); await page.waitForTimeout(400);
  const v = page.locator('#view'); await expect(v).toContainText('Abiertas'); await expect(v).toContainText('Pistón roto'); await expect(v).toContainText('Por causa'); await expect(v).toContainText('Trabajando sin pistonwax');
  await v.locator('button.it', { hasText: 'Pistón roto' }).first().click(); await page.waitForTimeout(300);
  d = page.locator('.dlg').last(); await d.getByRole('button', { name: 'Cerrar avería' }).click(); await page.waitForTimeout(600);
  await expect.poll(() => page.evaluate(() => JSON.stringify(window.__D.aver))).toContain('"fc":"');
  await v.locator('button.it', { hasText: 'Pistón roto' }).first().click(); await page.waitForTimeout(300);
  await page.locator('.dlg').last().getByRole('button', { name: 'Borrar', exact: true }).click(); await page.waitForTimeout(300);
  await page.locator('.dlg').last().getByRole('button', { name: 'Borrar', exact: true }).click(); await page.waitForTimeout(600);
  await expect.poll(() => page.evaluate(() => JSON.stringify(window.__D.aver))).not.toContain('Pistón roto');
  const t = (await v.innerText()).replace(/\s+/g, ' '); expect(t).not.toContain('undefined'); expect(t).not.toContain('NaN');
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});

test('Barras rotas: guardar para recuperar con el tornillo, mandar al taller, vuelven convertidas y suman a la avería', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1500);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Barras expulsoras$/ }).click(); await page.waitForTimeout(300);
  await page.locator('#view button', { hasText: /^Registrar cambio$/ }).first().click(); await page.waitForTimeout(300);
  const maq = await page.locator('#btM option').nth(1).getAttribute('value'); await page.selectOption('#btM', maq); await page.waitForTimeout(200);
  const a = await page.locator('#btA option[value]:not([value=""])').first().getAttribute('value'); await page.selectOption('#btA', a); await page.waitForTimeout(200);
  if (!(await page.inputValue('#btAl'))) { const al = await page.locator('#btAl option').nth(1).getAttribute('value'); await page.selectOption('#btAl', al); }
  let d = page.locator('.dlg').last();
  await d.locator('.chip', { hasText: /^Rotura$/ }).click(); await page.waitForTimeout(150);
  await d.getByRole('button', { name: 'Guardar', exact: true }).click(); await expect(page.locator('body')).toContainText('qué se hace con la barra rota');
  await d.locator('.seg button', { hasText: 'Guardar para recuperar' }).click(); await page.waitForTimeout(150);
  const tor = await page.locator('#btTor').count();
  if (tor) { await page.locator('#btTor').check(); await page.waitForTimeout(150); const t = await page.locator('#btTA option[value]:not([value=""])').first().getAttribute('value'); await page.selectOption('#btTA', t); }
  await d.getByRole('button', { name: 'Guardar', exact: true }).click(); await page.waitForTimeout(900);
  d = page.locator('.dlg').last(); await expect(d).toContainText('¿Es por una avería?'); if (tor) await expect(d).toContainText('y tornillo tope');
  await d.getByRole('button', { name: 'Abrir avería nueva' }).click(); await page.waitForTimeout(600);
  d = page.locator('.dlg').last(); await expect(d).toContainText('guardada para recuperar'); await d.getByRole('button', { name: 'Cancelar' }).click(); await page.waitForTimeout(300);
  const v = page.locator('#view'); await expect(v).toContainText('Barras rotas para recuperar');
  await v.locator('button', { hasText: 'Mandar a recuperar' }).click(); await page.waitForTimeout(300);
  await page.locator('.dlg').last().getByRole('button', { name: 'Mandar' }).click(); await page.waitForTimeout(600);
  await v.locator('button', { hasText: 'Han vuelto' }).first().click(); await page.waitForTimeout(300);
  const otra = await page.locator('#bvA option[value]:not([value=""])').last().getAttribute('value'); await page.selectOption('#bvA', otra);
  const n = +(await page.inputValue('#bvN')); await page.fill('#bvN', String(n > 1 ? n - 1 : n)); await page.fill('#bvC', n > 1 ? '1' : '0'); await page.fill('#bvE', '40');
  await page.locator('.dlg').last().getByRole('button', { name: 'Guardar', exact: true }).click(); await page.waitForTimeout(800);
  await expect.poll(() => page.evaluate(() => JSON.stringify(window.__D.mov))).toContain('Recuperada de');
  await expect.poll(() => page.evaluate(() => JSON.stringify(window.__D.brec))).toContain('"eur":40');
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Averías$/ }).click(); await page.waitForTimeout(400);
  await page.locator('#view button.it', { hasText: 'Barras rotas' }).first().click(); await page.waitForTimeout(300);
  d = page.locator('.dlg').last(); await expect(d).toContainText('Recuperada'); await expect(d).toContainText('por 40 €');
  expect(err).toEqual([]);
});

test('Pestaña Consumo con un pistón: pide motivo y destino, se guarda como cambio de pistón y sin pistonwax pregunta la avería con la causa puesta', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  await page.locator('#tabs button', { hasText: 'Consumo' }).click(); await page.waitForTimeout(300);
  const pa = await page.$eval('#mArt', s => [...s.options].find(o => /Pistón/.test(o.text)).value); await page.selectOption('#mArt', pa); await page.waitForTimeout(300);
  await expect(page.locator('#mMot')).toHaveCount(1); await expect(page.locator('#mDestP')).toHaveCount(1);
  await page.fill('#mCant', '1');
  const maq = await page.$eval('#mMaq', s => [...s.options].find(o => o.value && !o.value.startsWith('nave:')).value); await page.selectOption('#mMaq', maq);
  await page.selectOption('#mMot', 'TRABAJANDO SIN PISTONWAX'); await page.waitForTimeout(300);
  await page.selectOption('#mDestP', 'DESECHADO'); await page.fill('#mResp', '707');
  const antes = await page.evaluate(() => JSON.stringify(window.__D.pist || {}).split('"motivo"').length);
  await page.locator('#mBtn').click(); await page.waitForTimeout(900);
  expect(await page.evaluate(() => JSON.stringify(window.__D.pist || {}).split('"motivo"').length)).toBe(antes + 1);
  let d = page.locator('.dlg').last(); await expect(d).toContainText('¿Es por una avería?');
  await d.getByRole('button', { name: 'Abrir avería nueva' }).click(); await page.waitForTimeout(600);
  await expect.poll(() => page.evaluate(() => JSON.stringify(window.__D.aver))).toContain('"causa":"Trabajando sin pistonwax"');
  expect(err).toEqual([]);
});


test('Cambios de horno de Limpieza: llegan con motivo y quién, se revisan en Hoy y abren avería', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => {
    let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v; const k = Object.keys(v.mov).sort().pop();
      const a = v.cat.app.articulos.find(x => x.fam === 'horno') || v.cat.app.articulos[0]; const m = v.cat.app.maquinas[2];
      const f = new Date(); f.setDate(f.getDate() - 1); const fs = f.toISOString().slice(0, 10);
      v.mov[k].items.push({ id: 'hor_ot1_1', f: fs, tipo: 'salida', art: a.id, alm: 'gen', cant: 1, maq: m.id, nota: 'Horno H-' + m.cod + ': cambio tolva', motivo: 'ATASCO', motOrig: 'Tolva atascada', resp: 'Juan José Guerrero', ts: 1 });
      v.mov[k].items.push({ id: 'hor_ot2_1', f: fs, tipo: 'salida', art: a.id, alm: 'gen', cant: 1, maq: m.id, nota: 'Horno H-' + m.cod + ': cambio juntas', motivo: 'PREVENTIVO', motOrig: 'Cambio preventivo', resp: 'Juan José Guerrero', ts: 2 }); } }); });
  await page.goto(url); await page.waitForTimeout(1500);
  await expect(page.locator('#view')).toContainText('1 cambio de horno de Limpieza por revisar');
  await page.locator('#view button', { hasText: /^Revisar$/ }).first().click(); await page.waitForTimeout(300);
  let d = page.locator('.dlg').last(); await expect(d).toContainText('Tolva atascada'); await expect(d).toContainText('Juan José Guerrero');
  await d.getByRole('button', { name: 'Es avería', exact: true }).click(); await page.waitForTimeout(700);
  d = page.locator('.dlg').last(); await expect(d).toContainText('¿Es por una avería?');
  await d.getByRole('button', { name: 'Abrir avería nueva' }).click(); await page.waitForTimeout(700);
  await expect.poll(() => page.evaluate(() => JSON.stringify(window.__D.aver))).toContain('hor_ot1_1');
  await expect.poll(() => page.evaluate(() => JSON.stringify(window.__D.mov))).toContain('"rev":true');
  expect(err).toEqual([]);
});

test('Averías: eje en cuarentena sin cambio de pistón entra en una avería desde Ejes', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => {
    let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v;
      const m = new Date(); m.setDate(m.getDate() - 3); const mq = v.cat.app.maquinas[1];
      v.cat.app.ejePend = [{ id: 'pq1', f: m.toISOString().slice(0, 10), maq: mq.cod, mods: [], pist: null, diam: null, motivo: 'PISTÓN AGARROTADO', nota: null, manual: true }]; } }); });
  await page.goto(url); await page.waitForTimeout(1500);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Ejes$/ }).click(); await page.waitForTimeout(500);
  const v = page.locator('#view'); await expect(v).toContainText('Ejes en cuarentena (1)');
  const fuera = await page.evaluate(() => [...document.querySelectorAll('.pend-acc .btn')].filter(b => { const r = b.getBoundingClientRect(), c = b.closest('.card').getBoundingClientRect(); return r.left < c.left - 1 || r.right > c.right + 1; }).length);
  expect(fuera, 'botones de la cuarentena fuera del marco').toBe(0);
  await v.getByRole('button', { name: 'Avería', exact: true }).click(); await page.waitForTimeout(300);
  let d = page.locator('.dlg').last(); await expect(d).toContainText('¿Es por una avería?');
  await d.getByRole('button', { name: 'Abrir avería nueva' }).click(); await page.waitForTimeout(700);
  await expect.poll(() => page.evaluate(() => JSON.stringify(window.__D.aver))).toContain('"k":"q","id":"pq1"');
  const f0 = await page.evaluate(() => window.__D.cat.app.ejePend[0].f);
  await expect.poll(() => page.evaluate(() => window.__D.aver.lista.items[0].f)).toBe(f0);
  await page.locator('.dlg').last().getByRole('button', { name: 'Guardar' }).click().catch(() => {}); await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelectorAll('.dlg-ov').forEach(x => x.remove()));
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Ejes$/ }).click(); await page.waitForTimeout(500);
  await expect(v.getByRole('button', { name: 'Ver avería', exact: true })).toHaveCount(1);
  expect(err).toEqual([]);
});

test('Cuarentena a mano y luego el cambio de pistón de esa máquina: se juntan en un solo eje', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => {
    let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v;
      const m = new Date(); m.setDate(m.getDate() - 1); const mq = v.cat.app.maquinas[1];
      v.cat.app.ejePend = [{ id: 'pq2', f: m.toISOString().slice(0, 10), maq: mq.cod, mods: [], pist: null, diam: null, motivo: 'PISTÓN AGARROTADO', nota: null, manual: true }]; } }); });
  await page.goto(url); await page.waitForTimeout(1500);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Pistones$/ }).click(); await page.waitForTimeout(300);
  const mq = await page.evaluate(() => window.__D.cat.app.maquinas[1]);
  const vals = await page.locator('#pMaq option').evaluateAll(o => o.map(x => x.value));
  await page.selectOption('#pMaq', vals.find(x => x === mq.id || x === mq.cod));
  const diam = await page.locator('#pDiam option').nth(2).getAttribute('value'); await page.selectOption('#pDiam', diam);
  await page.selectOption('#pMot', 'ROTURA');
  const dest = await page.locator('#pDest option').nth(1).getAttribute('value'); await page.selectOption('#pDest', dest);
  await page.locator('#pBtn').click(); await page.waitForTimeout(1200);
  await expect.poll(() => page.evaluate(() => window.__D.cat.app.ejePend.length)).toBe(1);
  await expect.poll(() => page.evaluate(() => !!window.__D.cat.app.ejePend[0].pist)).toBe(true);
  expect(err).toEqual([]);
});

test('Consultas sobre averías: abiertas, sin causa, coste, máquinas, repetidas, causas, evitables y responsables', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => {
    let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v;
      const f = n => { const m = new Date(); m.setDate(m.getDate() - n); return m.toISOString().slice(0, 10); };
      const A = v.cat.app.maquinas[1].id, B = v.cat.app.maquinas[2].id;
      v.aver = { lista: { items: [
        { id: 'a1', n: 1, maq: A, f: f(2), t: 'Pistón agarrotado y eje', causa: 'Trabajando sin pistonwax', evit: true, resp: 'Juan', estado: 'cerrada', links: [], ts: 1 },
        { id: 'a2', n: 2, maq: A, f: f(1), t: 'Pistón agarrotado y eje', causa: 'Trabajando sin pistonwax', evit: true, resp: 'Juan', estado: 'abierta', links: [], ts: 2 },
        { id: 'a3', n: 3, maq: B, f: f(1), t: 'Barra rota', causa: 'Desgaste normal', evit: false, resp: 'Ana', estado: 'cerrada', links: [], ts: 3 },
        { id: 'a4', n: 4, maq: B, f: f(0), t: 'Eje: rotura', causa: '', evit: null, resp: null, estado: 'abierta', links: [], ts: 4 }] } }; } }); });
  await page.goto(url); await page.waitForTimeout(1500);
  const cod = await page.evaluate(() => window.__D.cat.app.maquinas[1].cod);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  const resp = async q => { await page.fill('#bdQ', q); await page.waitForTimeout(250); const t = (await page.locator('#bdRes').innerText()).replace(/\s+/g, ' '); expect(t, q).not.toMatch(/undefined|NaN/); return (await page.locator('.bd-resp').allTextContents()).join(' '); };
  expect(await resp('averías abiertas')).toContain('Hay 2 averías abiertas');
  expect(await resp('averías sin causa')).toContain('1 avería sin causa');
  expect(await resp('cuánto nos han costado las averías este año')).toContain('4 averías');
  expect(await resp('qué máquina tiene más averías')).toContain('la que más averías');
  expect(await resp('averías de la ' + cod)).toContain('2 averías en la ' + cod);
  expect(await resp('se repiten las averías')).toContain(cod + ' · Trabajando sin pistonwax (2 veces');
  expect(await resp('por qué se rompen los ejes')).toContain('Trabajando sin pistonwax');
  expect(await resp('averías por pistonwax')).toContain('2 averías por «Trabajando sin pistonwax»');
  expect(await resp('cuántas averías eran evitables')).toContain('2 averías evitables');
  expect(await resp('quién tiene más averías evitables')).toContain('Quien más tiene: Juan (2 de 2');
  await page.locator('#bdRes button.it', { hasText: 'Juan' }).first().click(); await page.waitForTimeout(300);
  await page.locator('.dlg').last().locator('button.it').first().click(); await page.waitForTimeout(300);
  await expect(page.locator('.dlg').last()).toContainText('Pistas');
  expect(err).toEqual([]);
});

test('Más consultas: cuarentena, taller, agarrotados, barras, conclusiones, recuentos, Limpieza, precios, proveedores, sin apuntar y mantener', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => {
    let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v;
      const f = n => { const m = new Date(); m.setDate(m.getDate() - n); return m.toISOString().slice(0, 10); };
      const a = v.cat.app, M1 = a.maquinas[1], M2 = a.maquinas[2], k = Object.keys(v.mov)[0], kr = Object.keys(v.rep)[0];
      a.ejePend = [{ id: 'q1', f: f(12), maq: M1.cod, mods: [], pist: null, motivo: 'PISTÓN AGARROTADO', manual: true }, { id: 'q2', f: f(2), maq: M2.cod, mods: [], pist: null, motivo: 'ROTURA', manual: true }];
      a.ejeRecup = [{ id: 'rc1', f: f(5), maq: M1.cod, mods: [], motivo: 'PISTÓN AGARROTADO' }];
      a.articulos.push({ id: 'res1', desc: 'Resistencia de horno 2kW', fam: 'horno', ud: 'ud', alms: ['gen'], precio: '50' });
      const p60 = a.articulos.find(x => x.id === 'pist-60'); p60.precio = '110'; p60.ph = [{ f: f(10), de: 100, a: 110, por: 'Cristian' }];
      v.rep[kr].items.push({ id: 'rx1', eje: '3.2.B-1', desp: 'PISTÓN AGARROTADO', alta: f(40), env: f(40), rec: f(10), res: 'ok', imp: 400, maq: M1.cod },
        { id: 'rx2', eje: '3.2.B-2', desp: 'ROTURA', alta: f(20), env: f(20), rec: null, res: null, maq: M1.cod });
      v.mov[k].items.push(
        { id: 'aj1', f: f(30), ts: 1, alm: 'n1', art: 'pist-80', cant: -2, tipo: 'ajuste', contado: 3, teorico: 5, nota: 'Recuento' },
        { id: 'aj2', f: f(3), ts: 2, alm: 'n1', art: 'pist-80', cant: 1, tipo: 'ajuste', contado: 4, teorico: 3, nota: 'Recuento' },
        { id: 'hor_77_0', f: f(1), ts: 3, alm: 'gen', art: 'res1', maq: M1.id, cant: 1, tipo: 'salida', motivo: 'ROTURA', resp: 'Juan', nota: 'Horno H-' + M1.cod },
        { id: 'sx1', f: f(4), ts: 4, alm: 'gen', art: 'res1', maq: M1.id, cant: 3, tipo: 'salida', por: 'Ana' },
        { id: 'sx2', f: f(4), ts: 5, alm: 'gen', art: 'res1', maq: M2.id, cant: 1, tipo: 'salida', por: 'Ana' },
        { id: 'en1', f: f(6), ts: 6, alm: 'gen', art: 'res1', cant: 10, tipo: 'entrada', prov: a.proveedores[0].id, alb: 'A1' });
      v.brec = { lista: { items: [{ id: 'b1', f: f(30), art: a.articulos.find(x => x.fam === 'barra').id, maq: M1.id, cant: 2, env: { f: f(25) }, vuelta: [{ f: f(5), cant: 1, art: a.articulos.find(x => x.fam === 'barra').id, eur: 10 }], chat: [], ts: 1 }] } };
      v.inv = { lista: { items: [{ id: 'c1', f: f(30), t: 'Pistones de la ' + M1.cod, F: { maq: M1.id }, causa: 'Sin pistonwax', accion: 'Revisar el bidón cada turno', rev: f(2), estado: 'abierta', antes: { pd: 1 } },
        { id: 'c2', f: f(60), t: 'Barras', F: {}, causa: 'Mal montaje', accion: 'Formación', estado: 'funciono', res: { f: f(20), pct: -40 } }] } }; } }); });
  await page.goto(url); await page.waitForTimeout(1500);
  const [c1, prov] = await page.evaluate(() => [window.__D.cat.app.maquinas[1].cod, window.__D.cat.app.proveedores[0].nom]);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  const resp = async q => { await page.fill('#bdQ', q); await page.waitForTimeout(300); const t = (await page.locator('#bdRes').innerText()).replace(/\s+/g, ' '); expect(t, q).not.toMatch(/undefined|NaN|Infinity/); return (await page.locator('.bd-resp').allTextContents()).join(' '); };
  expect(await resp('qué ejes llevan más tiempo en cuarentena')).toContain('El que más lleva: ' + c1 + ' (12 días');
  expect(await resp('cuánto tarda el taller en devolver los ejes')).toContain('El que más tardó: 3.2.B-1 (30 días)');
  expect(await resp('cuántos agarrotados se recuperan en planta')).toContain('Se han recuperado en planta 1 (');
  expect(await resp('cuánto nos cuestan los ejes de la ' + c1 + ' este año')).toContain('han costado');
  expect(await resp('qué barras hay para recuperar')).toContain('En Meyusa: 1');
  expect(await resp('cuánto tarda Meyusa')).toContain('Meyusa tarda 20 días de media');
  expect(await resp('qué conclusiones toca comprobar')).toContain('1 toca comprobar ya');
  expect(await resp('qué acciones han funcionado')).toContain('1 han funcionado');
  expect(await resp('qué toca contar esta semana')).toContain('Esta semana tocan');
  expect(await resp('qué artículos descuadran más en los recuentos')).toContain('2 de 2 recuentos');
  expect(await resp('qué cambios de horno ha mandado Limpieza sin revisar')).toContain('1 cambio de horno de Limpieza');
  expect(await resp('qué máquina cambia más resistencias')).toContain('la que más cambia es la ' + c1);
  expect(await resp('qué ha subido de precio este año')).toContain('+10 %');
  expect(await resp('cuánto le hemos comprado a ' + prov + ' este año')).toContain('por unos 500 €');
  expect(await resp('a qué proveedor le compramos más')).toContain('El que más: ' + prov);
  expect(await resp('qué máquinas no tienen nada apuntado desde hace 30 días')).toContain('nada apuntado desde hace más de 30 días');
  expect(await resp('cuánto cuesta mantener la ' + c1)).toContain('mantener la ' + c1 + ' ha costado');
  expect(await resp('qué máquina cuesta más de mantener')).toContain('la más cara de mantener');
  expect(err).toEqual([]);
});

test('Consultas: preguntas de la revisión semanal (estoy, últimas, quién, cuánto ha durado, un día suelto y palabras comunes)', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  const resp = async q => { await page.fill('#bdQ', q); await page.waitForTimeout(250); const t = (await page.locator('#bdRes').innerText()).replace(/\s+/g, ' '); expect(t, q).not.toMatch(/undefined|NaN/); return t; };
  let t = await resp('En que maquina estoy consumiendo mas'); expect(t).toContain('Todo lo gastado'); expect(t).toContain('por máquina'); expect(t).not.toContain('«estoy»');
  t = await resp('Últimas entradas de pis'); expect(t).toContain('Entradas'); expect(t).not.toContain('«ultimas»');
  expect(await resp('Quién')).not.toContain('«quien»');
  expect(await resp('Quien no apunta')).toContain('quién no apunta');
  for (const q of ['cuanto tiempo ha durado el pistón', 'cuánto tiempo duran los pistones']) expect(await resp(q), q).toMatch(/cuánto dura un pistón/);
  t = await resp('Qué maquina tiene mas consumo este mes cuanto tiempo ha durado el pistón en maquina'); expect(t).toContain('cuánto dura un pistón'); expect(t).not.toContain('«durado»');
  expect(await resp('Cuántos pistones an entrado')).not.toContain('«an»');
  expect(await resp('Consumo 20/10/26')).toMatch(/el 20\/10\/(20)?26/);
  expect(await resp('cambios de pistón del 1/9 al 15/10')).toMatch(/del \S+ al \S+/);
  const ap = await page.evaluate(() => { Object.assign(BuscaAprende.estado.sin, { 'almacen|no': 'pistones', 'almacen|apunta': 'quien no apunta el motivo de cambio de pistones', 'almacen|estoy': 'que maquina consume mas consumibles', 'almacen|grasa': 'aceite' });
    return [BuscaAprende.aplicar('almacen', 'qué máquinas no tienen nada apuntado'), BuscaAprende.aplicar('almacen', 'quien no apunta'), BuscaAprende.aplicar('almacen', 'stock de grasa')]; });
  expect(ap).toEqual(['que maquinas no tienen nada apuntado', 'quien no apunta', 'stock de aceite']);
  expect(err).toEqual([]);
});

test('Cambiar el precio de un artículo guarda el anterior (historial de precios)', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1500);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Stock')).click()); await page.waitForTimeout(400);
  await page.locator('#view button.it').first().click(); await page.waitForTimeout(400);
  await page.locator('.dlg').last().getByRole('button', { name: 'Editar', exact: true }).click(); await page.waitForTimeout(400);
  const antes = await page.inputValue('#aPrecio'); const nuevo = String((parseFloat(String(antes).replace(',', '.')) || 10) + 5);
  if (!(parseFloat(antes) > 0)) { await page.fill('#aPrecio', '10'); await page.locator('.dlg').last().getByRole('button', { name: 'Guardar' }).click(); await page.waitForTimeout(600);
    await page.locator('#view button.it').first().click(); await page.waitForTimeout(400); await page.locator('.dlg').last().getByRole('button', { name: 'Editar', exact: true }).click(); await page.waitForTimeout(400); }
  await page.fill('#aPrecio', nuevo); await page.locator('.dlg').last().getByRole('button', { name: 'Guardar' }).click(); await page.waitForTimeout(800);
  await expect.poll(() => page.evaluate(() => window.__D.cat.app.articulos.filter(a => (a.ph || []).length).length)).toBe(1);
  const ph = await page.evaluate(() => window.__D.cat.app.articulos.find(a => (a.ph || []).length).ph[0]);
  expect(ph.a).toBe(parseFloat(nuevo)); expect(ph.de).toBeGreaterThan(0);
  expect(err).toEqual([]);
});

test('Consultas: «valor de 2 tubos de westofen 21 y 3 krown 18» suma cada artículo a su precio', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => {
    let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v;
      v.cat.app.articulos.push({ id: 'hr-tdw21', cod: 'TD-W21', desc: 'Tubo dosificador Westofen 21', fam: 'horno', grupo: 'Tubos dosificadores', ud: 'ud', alms: ['gen'], precio: '518.01' },
        { id: 'hr-tdk18', cod: 'TD-K18', desc: 'Tubo dosificador Krown 18', fam: 'horno', grupo: 'Tubos dosificadores', ud: 'ud', alms: ['gen'], precio: '517.18' },
        { id: 'hr-jcf180', cod: 'JCF-180', desc: 'Junta tubo dosificador Westofen JCF-180', fam: 'horno', ud: 'ud', alms: ['gen'], precio: '22' },
        { id: 'hr-jplk1', cod: 'JPL-K1', desc: 'Junta puerta limpieza Krown (horno anterior a 2018)', fam: 'horno', ud: 'ud', alms: ['gen'] }); } }); });
  await page.goto(url); await page.waitForTimeout(1500);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  const resp = async q => { await page.fill('#bdQ', q); await page.waitForTimeout(300); return (await page.locator('#bdRes').innerText()).replace(/\s+/g, ' '); };
  let t = await resp('Dime el valor de 2 tubos de westofen 21 y 3 krown 18');
  expect(t).toContain('Valor: 2587,56 €'); expect(t).toContain('2 × Tubo dosificador Westofen 21'); expect(t).toContain('3 × Tubo dosificador Krown 18');
  t = await resp('cuánto valen 2 tubos westofen 21');
  expect(t).toContain('Valor: 1036,02 €');
  expect(err).toEqual([]);
});

test('Recuentos y ABC: clases por gasto, recuento de la semana y pestaña Averías en la inyectora', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(1500);
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Recuentos y ABC$/ }).click(); await page.waitForTimeout(400);
  const v = page.locator('#view'); await expect(v).toContainText('Clase A'); await expect(v).toContainText('Recuento de esta semana'); await expect(v).toContainText('Análisis ABC');
  const t = (await v.innerText()).replace(/\s+/g, ' '); expect(t).not.toContain('undefined'); expect(t).not.toContain('NaN');
  await v.locator('button', { hasText: 'Contar ahora' }).click(); await page.waitForTimeout(300);
  const d = page.locator('.dlg').last(); await expect(d).toContainText('Recuento');
  await d.locator('tbody input').first().fill('5');
  await d.getByRole('button', { name: 'Guardar recuento' }).click(); await page.waitForTimeout(600);
  await expect.poll(() => page.evaluate(() => JSON.stringify(window.__D.mov))).toContain('Recuento cíclico');
  expect(await desbordes(page)).toEqual([]);
  // pestaña Averías en la ficha de la inyectora
  await page.evaluate(() => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes('Más')).click());
  await page.locator('.tile .tt', { hasText: /^Consultas$/ }).click(); await page.waitForTimeout(300);
  await page.fill('#bdQ', 'todo sobre la F25'); await page.waitForTimeout(400);
  await page.locator('#bdRes button', { hasText: 'Abrir la ficha de la F25' }).click(); await page.waitForTimeout(400);
  await page.locator('.op-tabs button', { hasText: /^Averías/ }).click(); await page.waitForTimeout(200);
  await expect(page.locator('.op-body')).toContainText('Averías este año');
  expect(err).toEqual([]);
});
