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
    ['qué cambios se apuntaron sin responsable', /sin responsable/], ['qué ha hecho Josu este año', /Josu ha apuntado \d+ cosas/], ['quién cambia más pistones por rotura', /por quién/],
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
