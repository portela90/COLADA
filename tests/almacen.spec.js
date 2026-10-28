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
  await page.locator('.tile .tt', { hasText: /^Base de datos$/ }).click(); await page.waitForTimeout(300);
  await expect(page.locator('.bd-sug .chip').first()).toBeVisible();
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
  await page.locator('.tile .tt', { hasText: /^Base de datos$/ }).click(); await page.waitForTimeout(300);
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
  await page.locator('.tile .tt', { hasText: /^Base de datos$/ }).click(); await page.waitForTimeout(300);
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
  await page.locator('.tile .tt', { hasText: /^Base de datos$/ }).click(); await page.waitForTimeout(300);
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
