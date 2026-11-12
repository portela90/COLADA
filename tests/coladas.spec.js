// Coladas: todas las pestañas sin errores ni desbordes, y entrada sin albarán de principio a fin.
const { test, expect } = require('@playwright/test');
const { montar, vigila, pulsa, desbordes } = require('./util');
let url;
test.beforeAll(() => { url = montar('index.html', 'coladas.html'); });

test('las 7 pestañas abren sin errores y sin salirse de la pantalla', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  const tabs = await page.evaluate(() => [...document.querySelectorAll('nav button')].map(b => b.textContent));
  expect(tabs.length).toBeGreaterThanOrEqual(7);
  for (const t of tabs) {
    await page.evaluate(t => [...document.querySelectorAll('nav button')].find(b => b.textContent === t).click(), t);
    await page.waitForTimeout(400);
    expect(await desbordes(page), 'se sale de la pantalla en ' + t).toEqual([]);
  }
  expect(err).toEqual([]);
});

test('Entrada sin peso de báscula: queda pendiente de pesar y se pone después (o «no se va a pesar»)', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Entrada').click()); await page.waitForTimeout(300);
  await page.fill('#e-alb', 'ALB-77'); await page.fill('#e-col', '19094'); await pulsa(page, 'Nave 1'); await pulsa(page, 'AlSi9');
  await page.fill('#e-kg', '24269'); await page.fill('#e-fa', '35'); await page.waitForTimeout(200);
  await expect(page.locator('#e-kbd')).toContainText('quedará pendiente de pesar');
  await page.fill('#e-kb', '24100'); await expect(page.locator('#e-kbd')).toContainText('−169 kg (−0,7 %)'); await expect(page.locator('#e-kbd')).toHaveClass(/neg/);
  await page.fill('#e-kb', ''); await page.waitForTimeout(100);
  await page.click('#e-go'); await page.waitForTimeout(900);
  const mov = () => page.evaluate(() => Object.values(window.__D.mov).flatMap(x => x.items).find(r => r.t === 'E' && r.a === 'ALB-77'));
  expect(await mov()).toMatchObject({ pb: 1 });
  await expect(page.locator('#pend-bas')).toContainText('19094');
  await page.locator('#pend-bas button', { hasText: 'Poner peso' }).click(); await page.waitForTimeout(300);
  await page.fill('#pb-kb', '24250'); await expect(page.locator('#pb-dif')).toContainText('−19 kg');
  await page.click('#pb-ok'); await page.waitForTimeout(700);
  const m = await mov(); expect(m.kb).toBe(24250); expect(m.pb).toBeUndefined();
  await expect(page.locator('#pend-bas')).toHaveCount(0);
  // otra entrada marcada «no se va a pesar»: no queda pendiente
  await page.fill('#e-alb', 'ALB-78'); await page.fill('#e-col', '19095'); await page.fill('#e-kg', '24000'); await page.fill('#e-fa', '34');
  await page.check('#e-nopesa'); await page.waitForTimeout(200);
  await page.click('#e-go'); await page.waitForTimeout(900);
  const m2 = await page.evaluate(() => Object.values(window.__D.mov).flatMap(x => x.items).find(r => r.t === 'E' && r.a === 'ALB-78'));
  expect(m2).toMatchObject({ np: 1 }); expect(m2.pb).toBeUndefined();
  await expect(page.locator('#pend-bas')).toHaveCount(0);
  expect(err).toEqual([]);
});

test('entrada sin albarán: al llegar el albarán se lee la foto y se coteja con lo apuntado', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => { window.__ALBC_MOCK = { albaran: '20261206', fecha: '2026-11-10', fecha_albaran: '2026-11-09', proveedor: 'Estrella', aleacion: 'AlSi9Cu3', nave: 'Nave 1', kg: 24269, fardos: 35, coladas: [{ colada: '19094', kg: 24269, fardos: 35 }], sap: '5005385417', confianza: 'alta' }; });
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Entrada').click()); await page.waitForTimeout(300);
  await page.click('.chk-sa'); await page.waitForTimeout(200);
  await page.fill('#e-col', '19094'); await pulsa(page, 'Nave 1'); await pulsa(page, 'AlSi9');
  await page.fill('#e-fa', '34'); await page.waitForTimeout(200);
  await page.click('#e-go'); await page.waitForTimeout(800);
  await pulsa(page, 'Completar');
  const d = page.locator('.dlg').last();
  await expect(d.locator('#ca-leer')).toBeHidden();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
  await d.locator('#ca-foto').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: png });
  await d.locator('#ca-leer').click(); await page.waitForTimeout(500);
  await expect(d.locator('[data-k="a"]')).toHaveValue('20261206'); await expect(d.locator('[data-k="kg"]')).toHaveValue('24269'); await expect(d.locator('[data-k="fa"]')).toHaveValue('35');
  await expect(d.locator('.ca-cot')).toContainText('no coincide en 1 cosa');
  await expect(d.locator('.ca-t tr.mal')).toContainText('Fardos');
  await expect(d.locator('[data-k="obs"]')).toHaveValue(/SAP 5005385417 · Albarán del 09\/11\/2026/);
  await d.getByRole('button', { name: 'Guardar' }).click(); await page.waitForTimeout(800);
  const m = await page.evaluate(() => Object.values(window.__D.mov).flatMap(x => x.items).find(r => r.a === '20261206'));
  expect(m).toMatchObject({ kg: 24269, fa: 35 }); expect(m.sa).toBeUndefined();
  expect(err).toEqual([]);
});

test('Camión con retraso que ya se metió a mano: «Ya está metido» lo une a la entrada (sin duplicar)', async ({ page }) => {
  const err = await vigila(page);
  await page.clock.setFixedTime(new Date('2026-11-11T07:00:00+01:00'));
  await page.addInitScript(() => { let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v;
    v.lotes.lx = { nombre: 'C26200', material: 'L-2630', nave: 'Nave 2', donde: 'nave', kgInv: 0, fardosInv: 0, entrada: '2026-11-10', sinAlb: true };
    (v.mov['2026-11'] = v.mov['2026-11'] || { items: [] }).items.push({ i: 'e1', t: 'E', f: '2026-11-10', d: 'lx', fa: 33, kg: 24000, sa: true });
    const pl = v.cfg.app.plan = v.cfg.app.plan || {}; pl['2026-11'] = { camiones: [], consumo: {}, entradas: [
      { f: '2026-11-10', k: 'Nave 2|L-2630', o: 'C', p: 'BEFESA', fa: 37 },
      { f: '2026-11-12', k: 'Nave 1|L-2630', o: 'C', p: 'BEFESA', fa: 37, rec: { f: '2026-11-10', k: 'Nave 2|L-2630', l: 'lx' } }] }; } }); });
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Entrada').click()); await page.waitForTimeout(300);
  await page.locator('.chip.tarde').first().click(); await page.waitForTimeout(300);
  await page.locator('#e-yametido').click(); await page.waitForTimeout(300);
  const d = page.locator('.dlg').last();
  await expect(d).toContainText('ahora unida al camión del 12/11');
  await d.locator('.ym-it', { hasText: 'C26200' }).click(); await page.waitForTimeout(600);
  const P = await page.evaluate(() => window.__D.cfg.app.plan['2026-11'].entradas);
  expect(P[0].rec).toMatchObject({ l: 'lx' }); expect(P[1].rec).toBeUndefined();
  expect(err).toEqual([]);
});

test('Repaso: un camión unido a la entrada de otra nave sale para arreglarlo y se vuelve a unir bien', async ({ page }) => {
  const err = await vigila(page);
  await page.clock.setFixedTime(new Date('2026-11-11T07:00:00+01:00'));
  await page.addInitScript(() => { let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v;
    v.lotes.lx = { nombre: 'C26200', material: 'L-2630', nave: 'Nave 2', donde: 'nave', kgInv: 0, fardosInv: 0, entrada: '2026-11-10' };
    v.lotes.ly = { nombre: 'C26201', material: 'L-2630', nave: 'Nave 1', donde: 'nave', kgInv: 0, fardosInv: 0, entrada: '2026-11-10' };
    (v.mov['2026-11'] = v.mov['2026-11'] || { items: [] }).items.push({ i: 'e1', t: 'E', f: '2026-11-10', d: 'lx', fa: 33, kg: 24000 }, { i: 'e2', t: 'E', f: '2026-11-10', d: 'ly', fa: 35, kg: 25000 });
    const pl = v.cfg.app.plan = v.cfg.app.plan || {}; pl['2026-11'] = { camiones: [], consumo: {}, entradas: [
      { f: '2026-11-10', k: 'Nave 1|L-2630', o: 'C', p: 'BEFESA', fa: 37, rec: { f: '2026-11-10', k: 'Nave 2|L-2630', l: 'lx' } }] }; } }); });
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Informes').click()); await page.waitForTimeout(500);
  await page.locator('.stk-t', { hasText: 'Repaso de la semana' }).first().click(); await page.waitForTimeout(400);
  const rep = page.locator('.card', { hasText: 'Repaso de la semana' }).last();
  await expect(rep).toContainText('1 camión unido a una entrada que no es suya');
  await rep.locator('button, .chip', { hasText: 'unido a C26200' }).first().click(); await page.waitForTimeout(300);
  await page.locator('.dlg').last().locator('.ym-it', { hasText: 'C26201' }).click(); await page.waitForTimeout(600);
  const P = await page.evaluate(() => window.__D.cfg.app.plan['2026-11'].entradas);
  expect(P[0].rec).toMatchObject({ l: 'ly' });
  expect(err).toEqual([]);
});

test('entrada sin albarán: se mete con kilos estimados y se completa después', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Entrada').click());
  await page.waitForTimeout(300);
  await page.click('.chk-sa'); await page.waitForTimeout(200);
  await page.fill('#e-col', 'C25070'); await pulsa(page, 'Nave 1'); await pulsa(page, 'AlSi9');
  await page.fill('#e-fa', '33'); await page.waitForTimeout(200);
  expect(await page.textContent('#e-kgest')).toContain('kg estimados');
  await page.click('#e-go'); await page.waitForTimeout(800);
  const m = await page.evaluate(() => Object.values(window.__D.mov).flatMap(x => x.items).pop());
  expect(m).toMatchObject({ t: 'E', fa: 33, sa: 1, ke: 1 });
  await pulsa(page, 'Completar');
  const f = await page.$$('.dlg input');
  await f[0].fill('ALB-1'); await f[1].fill('C25070-C25072'); await f[2].fill('23950');
  await pulsa(page, 'Guardar'); await page.waitForTimeout(800);
  const m2 = await page.evaluate(() => Object.values(window.__D.mov).flatMap(x => x.items).pop());
  expect(m2).toMatchObject({ kg: 23950, a: 'ALB-1' });
  expect(m2.sa).toBeUndefined();
  expect(await page.$('.sa-row')).toBeNull();
  expect(err).toEqual([]);
});

test('Consultas: gráficos de aluminio por mes', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Informes').click());
  await page.waitForTimeout(1500);
  await page.locator('.stk-t', { hasText: 'Aluminio por mes' }).first().click(); await page.waitForTimeout(800);
  await expect(page.locator('.stk-det h2', { hasText: 'Aluminio por mes' }).last()).toBeVisible();
  expect(await page.locator('.card svg').count()).toBeGreaterThanOrEqual(1);
  if (process.env.CAPTURA) { await page.evaluate(() => [...document.querySelectorAll('h2')].find(h => h.textContent === 'Aluminio por mes').scrollIntoView()); await page.waitForTimeout(300); await page.screenshot({ path: process.env.CAPTURA }); }
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});

test('Precios: se meten y se ven en €/kg (y si se escribe en €/t se entiende igual)', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(() => db.doc('cfg/app').set(Object.assign({}, __D.cfg.app, { proveedores: ['BEFESA', 'IDALSA'], precios: { '2026-09': { prov: { BEFESA: 2892.5 } } } })));
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent.includes('Precios')).click());
  await page.waitForTimeout(300);
  await page.selectOption('#pr-mes', '2026-10'); await page.waitForTimeout(200);
  const fila = n => page.locator('tr', { hasText: n }).locator('input').first();
  await expect(page.locator('th', { hasText: 'AlSi9 €/kg' })).toBeVisible();
  await expect(fila('BEFESA')).toHaveAttribute('placeholder', /2,8925/);
  await fila('BEFESA').fill('2,7875'); await fila('BEFESA').dispatchEvent('change');
  await expect.poll(() => page.evaluate(() => ((__D.cfg.app.precios['2026-10'] || {}).prov || {}).BEFESA)).toBe(2787.5);
  await expect(fila('BEFESA')).toHaveValue('2,7875');
  await fila('IDALSA').fill('2797,5'); await fila('IDALSA').dispatchEvent('change');
  await expect.poll(() => page.evaluate(() => ((__D.cfg.app.precios['2026-10'] || {}).prov || {}).IDALSA)).toBe(2797.5);
  await expect(fila('IDALSA')).toHaveValue('2,7975');
  // precio redondo: sale con tres decimales (2,670)
  await fila('BEFESA').fill('2,67'); await fila('BEFESA').dispatchEvent('change');
  await expect.poll(() => page.evaluate(() => ((__D.cfg.app.precios['2026-10'] || {}).prov || {}).BEFESA)).toBe(2670);
  await expect(fila('BEFESA')).toHaveValue('2,670');
  // nº de pedido del proveedor en el mes
  const ped = page.locator('[aria-label="Nº de pedido de BEFESA"]');
  await ped.fill('2499700'); await ped.dispatchEvent('change');
  await expect.poll(() => page.evaluate(() => ((__D.cfg.app.pedidos || {})['2026-10'] || {}).BEFESA)).toBe('2499700');
  expect(err).toEqual([]);
});

test('Consultas: el buscador responde preguntas con palabras normales', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(async () => {
    await db.doc('lotes/l4').set({ nombre: 'C25010', material: 'L-2521-B', nave: 'Nave 2', donde: 'nave', kgInv: 0, fardosInv: 0, entrada: '2026-10-20', proveedor: 'IDALSA', albaran: 'ALB-77' });
    await db.doc('mov/2026-10').set({ items: [
      { i: 'm0', t: 'C', f: '2026-10-13', u: 'Mañana', o: 'l3', fa: 2 },
      { i: 'm1', t: 'E', f: '2026-10-20', d: 'l4', fa: 30, kg: 21000, a: 'ALB-77' },
      { i: 'm2', t: 'C', f: '2026-10-21', u: 'Noche', o: 'l4', fa: 3, kg: 2100 },
      { i: 'm3', t: 'C', f: '2026-10-22', u: 'Tarde', o: 'l4', fa: 1, kg: 700 }] });
  });
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Informes').click());
  await page.waitForTimeout(400);
  const pregunta = async t => { await page.fill('#bqQ', t); await page.waitForTimeout(150); return (await page.locator('.bq-res').textContent()); };
  // consumo de una nave en un mes, repartido por relevo
  let r = await pregunta('consumo de octubre 2026 en nave 2 por relevo');
  expect(r).toMatch(/se han consumido 2\.?800 kg \(4 fardos\) en Nave 2/);
  expect(r).toContain('Noche');
  expect(await page.locator('.bq-resto').isHidden()).toBe(true);
  // tocar un grupo afina
  await page.locator('.bq-it', { hasText: 'Noche' }).click(); await page.waitForTimeout(150);
  expect(await page.locator('.bq-resp').textContent()).toMatch(/2\.?100 kg/);
  // stock por aleación
  r = await pregunta('stock de AlSi12');
  expect(r).toMatch(/Hay 18\.200 kg \(26 fardos\) de AlSi12 en 1 colada/);
  // el último camión de un proveedor
  r = await pregunta('último camión de Idalsa');
  expect(await page.locator('.bq-ult').textContent()).toContain('20/10/2026');
  expect(r).toContain('ALB-77');
  // «qué relevo consume más»: lo dice directamente
  r = await pregunta('qué relevo consume más en octubre 2026');
  expect(await page.locator('.bq-ult').textContent()).toMatch(/que más consume.*Noche.*2\.?100 kg/);
  expect(r).toContain('Le sigue Mañana');
  // «cuánto ha entrado … a nave 2»: en una frase
  r = await pregunta('cuánto ha entrado en octubre 2026 a nave 2');
  expect(await page.locator('.bq-resp').textContent()).toMatch(/ha entrado 21\.?000 kg \(30 fardos\) en Nave 2, en 1 entrada/);
  // «qué camiones tienen que entrar mañana»: lo planificado
  await page.evaluate(async () => { const d = new Date(); d.setDate(d.getDate() + 1); const f = d.toISOString().slice(0, 10);
    const app = Object.assign({}, __D.cfg.app); app.plan = { [f.slice(0, 7)]: { camiones: [], consumo: {}, entradas: [{ f, k: 'Nave 1|L-2630', fa: 33, o: 'C' }] } }; await db.doc('cfg/app').set(app); });
  await page.fill('#bqQ', ''); await page.waitForTimeout(100);
  r = await pregunta('qué camiones tiene que entrar mañana');
  expect(await page.locator('.bq-resp').textContent()).toMatch(/^Mañana, .* tiene que entrar 1 camión del proveedor \(33 fardos\)/);
  expect(r).toContain('Nave 1 · AlSi9');
  r = await pregunta('qué camiones tienen que entrar mañana en nave 2');
  expect(r).toContain('no hay ninguna entrada planificada');
  r = await pregunta('qué camiones tienen que entrar hoy');
  expect(r).toContain('La siguiente');
  // «para cuántos días tengo aluminio»
  r = await pregunta('para cuántos días tengo aluminio en nave 1');
  expect(r).toContain('Nave 1 · AlSi9');
  expect(r).toContain('fardos en la nave');
  expect(r).not.toContain('Nave 2');
  // palabras que no casan: se avisa
  r = await pregunta('coladas de zzzz');
  expect(r).toContain('No he encontrado «zzzz»');
  // vacío: vuelve lo de siempre
  await page.fill('#bqQ', ''); await page.waitForTimeout(150);
  expect(await page.locator('.bq-resto').isHidden()).toBe(false);
  if (process.env.CAPTURA) { await pregunta('consumo de octubre 2026 por relevo'); await page.screenshot({ path: process.env.CAPTURA, fullPage: true }); }
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});

test('Consultas: preguntas de dinero, planificación, lo que falta, coladas y máquinas', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(async () => {
    const h = new Date(), f = d => { const x = new Date(h); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); }, mes = f(0).slice(0, 7);
    await db.doc('lotes/l4').set({ nombre: 'C25010', material: 'L-2630', nave: 'Nave 1', donde: 'nave', kgInv: 0, fardosInv: 0, entrada: f(-3), proveedor: 'IDALSA' });
    await db.doc('mov/' + mes).set({ items: [
      { i: 'e1', t: 'E', f: f(-3), d: 'l4', fa: 30, kg: 21000, a: 'ALB-9' },
      { i: 'c1', t: 'C', f: f(-2), u: 'Mañana', o: 'l4', fa: 4 }, { i: 'c2', t: 'C', f: f(-1), u: 'Tarde', o: 'l4', fa: 5 }] });
    await db.doc('maq/' + mes).set({ items: [{ i: 'q1', f: f(-5), u: 'Mañana', m: 'F55', on: false, cu: false, az: false }] });
    const app = Object.assign({}, __D.cfg.app, { proveedores: ['IDALSA', 'BEFESA'], minimos: { 'Nave 1|L-2630': { fardosNave: 30 } },
      precios: { [mes]: { prov: { IDALSA: 2900, BEFESA: 2800 } } }, plan: { [mes]: { camiones: [{ p: 'IDALSA', m: 'L-2630', n: 3 }], consumo: {}, entradas: [] } } });
    await db.doc('cfg/app').set(app);
  });
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Informes').click());
  await page.waitForTimeout(400);
  const resp = async t => { await page.fill('#bqQ', t); await page.waitForTimeout(200); return (await page.locator('.bq-res').textContent()); };
  expect(await resp('qué hay que revisar')).toMatch(/que revisar|Todo en orden/);
  expect(await resp('qué proveedor sale más barato')).toContain('el más barato es BEFESA');
  expect(await resp('cuánto vale lo que tengo en stock')).toMatch(/vale unos [\d.]+ €/);
  expect(await resp('cuánto ha costado el aluminio este mes')).toMatch(/ha costado unos [\d.]+ €/);
  expect(await resp('consumo de este mes comparado con el pasado')).toContain('frente a');
  expect(await resp('cuánto pesa de media un fardo de Idalsa')).toContain('pesa de media 700 kg');
  expect(await resp('qué relevos no se han apuntado esta semana')).toMatch(/relevo|No falta/);
  expect(await resp('qué entradas faltan por completar')).toContain('No hay ninguna entrada pendiente');
  expect(await resp('qué líneas están bajo mínimo')).toContain('Nave 1 · AlSi9');
  expect(await resp('hay algo en negativo')).toMatch(/negativo/);
  expect(await resp('cuántos camiones quedan por traer este mes')).toContain('Quedan por traer 2 camiones de 3');
  expect(await resp('con cuánto stock acabo el mes')).toMatch(/final de mes|Con lo planificado/);
  expect(await resp('cuándo tengo que pedir camión para nave 1')).toMatch(/Nave 1 · AlSi9|no hace falta/);
  expect(await resp('qué colada toca gastar en nave 1')).toContain('Nave 1 · AlSi9: C25');
  expect(await resp('coladas más antiguas del externo')).toContain('La más antigua es C2500');
  expect(await resp('qué máquinas están paradas en nave 2')).toContain('Nave 2: 1 parada (F55)');
  expect(await resp('cómo está la F55')).toContain('F55 (Nave 2) está ahora parada');
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});

test('Consultas: «todo sobre la colada», relevos raros, coste previsto y cruces con el Almacén (por tonelada, resumen del mes)', async ({ page }) => { const err = await vigila(page);
  await page.addInitScript(() => { const rows=[{col:'alm_cat',id:'app',data:{maquinas:[{id:'m1',cod:'F25'},{id:'m2',cod:'F55'}],articulos:[{fam:'piston',diam:'Ø 60',precio:'180'}],modelos:[{cod:'X',precioRep:'200'}]}},
     {col:'alm_pist',id:'2026',data:{items:[{f:new Date().toISOString().slice(0,10),maq:'m1',diam:'Ø 60',cant:1},{f:'2026-10-02',maq:'m2',diam:'Ø 60',cant:2}]}},{col:'alm_rep',id:'2026',data:{items:[{eje:'E1',rec:'2026-10-05',res:'ok',maq:'F25'}]}},{col:'alm_ejes',id:'e1',data:{cod:'E1',mod:'X',estado:'planta'}},{col:'alm_mov',id:'2026-10',data:{items:[]}}];
    window.sbColada={from:()=>({select:()=>({in:async()=>({data:rows})})})}; });
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(async () => { const h=new Date(),f=d=>{const x=new Date(h);x.setDate(x.getDate()+d);return x.toISOString().slice(0,10);},mes=f(0).slice(0,7);
    await db.doc('mov/'+mes).set({items:[{i:'c1',t:'C',f:f(-2),u:'Mañana',o:'l3',fa:4},{i:'c2',t:'C',f:f(-1),u:'Tarde',o:'l1',fa:5},{i:'a1',t:'A',f:f(-1),o:'l2',fa:-1}]});
    await db.doc('maq/'+mes).set({items:[{i:'q1',f:f(-20),u:'Mañana',m:'F55',on:false}]}); });
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Informes').click()); await page.waitForTimeout(300);
  const resp = async t => { await page.fill('#bqQ', t); await page.waitForTimeout(400); return (await page.locator('.bq-res').innerText()).replace(/\s+/g, ' '); };
  expect(await resp('todo sobre la colada C25001')).toMatch(/La colada C25001 \(AlSi9, Nave 1\)/);
  expect(await resp('qué relevo gasta más de lo normal')).toMatch(/Fardos por máquina/);
  expect(await resp('qué proveedor me ha mandado menos kilos')).toMatch(/recuentos/);
  expect(await resp('cuánto aluminio se gasta por máquina en marcha')).toMatch(/kg por máquina y relevo/);
  expect(await resp('cuánto me va a costar el aluminio este mes')).toMatch(/Este mes el aluminio costará unos/);
  expect(await resp('pistones por tonelada de aluminio en nave 1')).toMatch(/Nave 1: [\d,]+ pistones por tonelada/);
  expect(await resp('qué gasta más por tonelada')).toMatch(/€ por tonelada/);
  const r = await resp('resumen del mes');
  expect(r).toMatch(/RESUMEN ESTE MES/); expect(r).toMatch(/Pistones cambiados: 3/); expect(r).not.toContain('undefined');
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});

test('Consultas: «lo que tengo, lo que ha entrado y lo que ha consumido cada nave este mes»', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(async () => { const h = new Date(), f = d => { const x = new Date(h); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); }, mes = f(0).slice(0, 7);
    await db.doc('lotes/l4').set({ nombre: 'C25010', material: 'L-2521-B', nave: 'Nave 2', donde: 'nave', kgInv: 0, fardosInv: 0, entrada: f(-3), proveedor: 'IDALSA' });
    await db.doc('mov/' + mes).set({ items: [{ i: 'e1', t: 'E', f: f(-3), d: 'l4', fa: 30, kg: 21000, a: 'A1' }, { i: 'c1', t: 'C', f: f(-2), u: 'Mañana', o: 'l4', fa: 4 }] }); });
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Informes').click()); await page.waitForTimeout(300);
  await page.fill('#bqQ', 'dime lo que tengo en cada nave de aluminio lo que ha entrado a cada nave y lo que ha consumido cada nave este mes'); await page.waitForTimeout(300);
  const t = (await page.locator('.bq-res').innerText()).replace(/\s+/g, ' ');
  expect(t).toMatch(/Nave 2: tiene 18\.?200 kg \(26 fardos\) en la nave; este mes han entrado 21\.?000 kg \(30 f\) y ha consumido 2\.?800 kg \(4 f\)/);
  expect(t).toContain('Copiar el informe');
  expect(err).toEqual([]);
});

test('Consultas: «cuántos camiones han entrado en cada nave, del proveedor y del externo»', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(async () => { const h = new Date(), f = d => { const x = new Date(h); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); }, mes = f(0).slice(0, 7);
    await db.doc('lotes/l4').set({ nombre: 'C25010', material: 'L-2630', nave: 'Nave 2', donde: 'nave', kgInv: 0, fardosInv: 0, entrada: f(-3), proveedor: 'IDALSA' });
    await db.doc('mov/' + mes).set({ items: [{ i: 'e1', t: 'E', f: f(-3), d: 'l4', fa: 30, kg: 21000, a: 'A1' }, { i: 't1', t: 'T', f: f(-2), o: 'l1', d: 'l1', kg: 0, fa: 0, n: 'Subida entera del almacén externo (24 fardos)' }] }); });
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Informes').click()); await page.waitForTimeout(300);
  await page.fill('#bqQ', 'cuántos camiones han entrado en nave 1 y nave 2 y cuántos del almacén externo y cuántos del proveedor'); await page.waitForTimeout(300);
  const t = (await page.locator('.bq-res').innerText()).replace(/\s+/g, ' ');
  expect(t).toMatch(/han llegado a las naves 2 camiones: 1 del proveedor y 1 del almacén externo/);
  expect(err).toEqual([]);
});

const stubAprende = () => { const T = { sinonimos: [], consultas_log: [] }; let id = 0;
  const q = (t) => { let rows = () => T[t]; const api = { _f: [], select() { return api; }, eq(k, v) { api._f.push(r => r[k] === v); return api; }, order() { return api; }, limit() { return api; },
    then(res) { res({ data: T[t].filter(r => api._f.every(f => f(r))), error: null }); },
    insert(o) { const r = Object.assign({ id: ++id, util: null }, o); T[t].push(r); return { select: () => ({ single: async () => ({ data: r, error: null }) }) }; },
    update(o) { return { eq: async (k, v) => { T[t].filter(r => r[k] === v).forEach(r => Object.assign(r, o)); return { error: null }; } }; },
    upsert: async (o) => { T[t] = T[t].filter(r => !(r.app === o.app && r.palabra === o.palabra)); T[t].push(o); return { error: null }; } }; return api; };
  window.__T = T; window.sbColada = { from: q }; };
test('Consultas: el buscador aprende (enseñar una palabra, guardar la pregunta y «¿te ha servido?»)', async ({ page }) => { const err = await vigila(page); await page.addInitScript(stubAprende);
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Informes').click()); await page.waitForTimeout(300);
  await page.fill('#bqQ', 'stock de las blanquitas'); await page.waitForTimeout(300);
  await expect(page.locator('.ba-ens')).toContainText('«blanquitas»');
  await page.locator('.ba-ens .ba-b', { hasText: 'AlSi9' }).click(); await page.waitForTimeout(300);
  await expect(page.locator('.bq-resp')).toContainText('de AlSi9');
  await page.waitForTimeout(2800); await page.locator('.ba-voto .ba-b', { hasText: 'Sí' }).click(); await page.waitForTimeout(500);
  const T = await page.evaluate(() => window.__T);
  expect(T.sinonimos[0]).toMatchObject({ app: 'coladas', palabra: 'blanquitas', significa: 'AlSi9' });
  expect(T.consultas_log[0]).toMatchObject({ app: 'coladas', util: 1 });
  expect(err).toEqual([]);
});

test('Consultas: preguntas de la revisión semanal (fechas, camiones, albaranes, externo, cargador, cuánto pedir y palabras comunes)', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  const F = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 10); const p = n => String(n).padStart(2, '0'); return { iso: d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()), dd: p(d.getDate()), mm: p(d.getMonth() + 1), yy: String(d.getFullYear()).slice(2), m: d.getMonth() }; });
  const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  await page.evaluate(async F => {
    const mm = F.iso.slice(0, 7);
    await db.doc('cfg/app').update({ proveedores: ['BEFESA'] });
    await db.doc('lotes/k1').set({ nombre: 'C30001', material: 'L-2630', nave: 'Nave 1', donde: 'nave', kgInv: 0, fardosInv: 0, entrada: F.iso, proveedor: 'BEFESA', albaran: 'CEVA2601688' });
    await db.doc('lotes/k2').set({ nombre: 'C30002', material: 'L-2630', nave: 'Nave 2', donde: 'nave', kgInv: 700, fardosInv: 1, entrada: F.iso, proveedor: 'IDALSA', albaran: 'ZZZ-999' });
    await db.doc('mov/' + mm).set({ items: [{ i: 'e1', t: 'E', f: F.iso, d: 'k1', fa: 30, kg: 21000, a: 'CEVA2601688' }, { i: 'c1', t: 'C', f: F.iso, u: 'Mañana', o: 'k1', fa: 3, kg: 2100 }] });
    await db.doc('maq/' + mm).set({ items: [{ i: 'q1', f: F.iso, u: 'Mañana', m: 'CARG|Nave 2', on: false }, { i: 'q2', f: F.iso, u: 'Noche', m: 'CARG|Nave 2', on: true }] });
  }, F);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Informes').click()); await page.waitForTimeout(400);
  const pregunta = async t => { await page.fill('#bqQ', t); await page.waitForTimeout(200); const r = (await page.locator('.bq-res').innerText()).replace(/\s+/g, ' '); expect(r, t).not.toMatch(/undefined|NaN/); return r; };
  const dm = F.dd + '/' + F.mm, dmy = dm + '/' + F.yy;
  // un día suelto, con nave y aunque sobre «este año»
  for (const q of ['Consumo ' + dmy, 'Consumo ' + dmy + ' nave 1', 'Consumo el ' + dmy + ' nave 1 este año']) expect(await pregunta(q), q).toMatch(/se han consumido 2\.?100 kg \(3 fardos\)/);
  // «entró» y el camión de un día
  let r = await pregunta('Que camión entró el ' + dm + ' en nave 1');
  expect(r).toContain('han llegado a Nave 1 1 camión: 1 del proveedor'); expect(r).toContain('CEVA2601688');
  expect(await pregunta('Cuántos kg an entrado a nave 1 los últimos 30 días')).toMatch(/ha entrado 21\.?000 kg/);
  // entradas del proveedor frente a las del externo
  expect(await pregunta('Entradas ' + MES[F.m] + ' nave 1 de proveedor')).toContain('1 del proveedor');
  // albaranes: de un proveedor y por un trozo del número
  r = await pregunta('Dame albaranes de BEFESA'); expect(r).toContain('1 albarán de BEFESA: 21.000 kg'); expect(r).toContain('C30001');
  r = await pregunta('Ceva26'); expect(r).toContain('1 albarán'); expect(r).toContain('CEVA2601688');
  // lo que hay en el externo
  r = await pregunta('Cuantas cargas tenemos en externo de nave 1'); expect(r).toContain('En el externo de Nave 1 hay unas'); expect(r).toContain('44 fardos');
  // el cargador
  r = await pregunta('Qué día se estropeó el cargador de nave 2'); expect(r).toContain('Nave 2: el cargador se estropeó por última vez'); expect(r).toContain('y se arregló');
  // cuánto pedir para un mes
  r = await pregunta('Cuantos kilos tengo que pedir para diciembre'); expect(r).toContain('lo que hay que pedir para diciembre'); expect(r).toMatch(/Para diciembre (hay que pedir unos|no hace falta)/);
  // las palabras de todos los días no se cambian aunque estén enseñadas; las de verdad, sí
  const ap = await page.evaluate(() => { Object.assign(BuscaAprende.estado.sin, { 'coladas|tengo': 'cuantos aluminio necesito para diciembre 2026', 'coladas|an': 'alsi9', 'coladas|dia': 'que dia se estropeo el cargador en nave 2', 'coladas|proveedor': 'que cuantas cargas han entrado', 'coladas|ceva26': 'dame el albaran', 'coladas|blanquitas': 'alsi9' });
    return [BuscaAprende.aplicar('coladas', 'qué día tengo más proveedor'), BuscaAprende.aplicar('coladas', 'stock de las blanquitas'), BuscaAprende.aplicar('coladas', 'ceva26')]; });
  expect(ap).toEqual(['que dia tengo mas proveedor', 'stock de las alsi9', 'dame el albaran']);
  r = await pregunta('Ceva26'); expect(r).toContain('1 albarán'); expect(r).not.toContain('ZZZ-999'); // aunque «ceva26» esté enseñada como otra cosa
  expect(err).toEqual([]);
});

test('Consultas: al buscar un albarán se puede abrir su ficha', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(async () => { const h = new Date(), f = d => { const x = new Date(h); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); }, mes = f(0).slice(0, 7);
    await db.doc('lotes/l4').set({ nombre: 'C25010', material: 'L-2630', nave: 'Nave 2', donde: 'nave', kgInv: 0, fardosInv: 0, entrada: f(-3), proveedor: 'IDALSA', albaran: 'ALB-7788' });
    await db.doc('mov/' + mes).set({ items: [{ i: 'e1', t: 'E', f: f(-3), d: 'l4', fa: 30, kg: 21000, a: 'ALB-7788' }] }); });
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Informes').click()); await page.waitForTimeout(300);
  await page.fill('#bqQ', 'albarán ALB-7788'); await page.waitForTimeout(300);
  await page.locator('.bq-res button', { hasText: 'Abrir el albarán ALB-7788' }).click(); await page.waitForTimeout(300);
  await expect(page.locator('.alb-ov')).toBeVisible();
  await page.evaluate(() => document.querySelector('.alb-ov').remove());
  await page.fill('#bqQ', 'entradas de este mes'); await page.waitForTimeout(300);
  await page.locator('.bq-res td button.linkcol', { hasText: 'ALB-7788' }).first().click(); await page.waitForTimeout(300);
  await expect(page.locator('.alb-ov')).toBeVisible();
  expect(err).toEqual([]);
});

test('Consultas: tocar una fila de la respuesta abre la colada', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Informes').click()); await page.waitForTimeout(300);
  await page.fill('#bqQ', 'coladas en externo'); await page.waitForTimeout(300);
  await page.locator('.bq-res tr.fila-link td[data-l="Aleación"]').first().click(); await page.waitForTimeout(400);
  await expect(page.locator('.ficha-ov').last()).toContainText('C2500');
  expect(err).toEqual([]);
});

test('Cierre de mes: «Antes de cerrar», recuento de cierre guardado aunque cuadre y comparar con la fábrica', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Informes').click()); await page.waitForTimeout(500);
  await page.locator('.stk-t', { hasText: 'Cierre de mes' }).first().click(); await page.waitForTimeout(500);
  const card = page.locator('.card', { hasText: 'Antes de cerrar' }).last();
  await expect(card).toContainText(/recuento de cierre/i);
  await expect(card).toContainText('relevo');
  // comparar con la fábrica: inicio 7000 kg menos en la primera línea
  const det = page.locator('details', { hasText: 'Comparar con el cierre de la fábrica' }).first();
  await det.locator('summary').click(); await page.waitForTimeout(200);
  const ins = det.locator('tbody tr').first().locator('input');
  const apps = await det.locator('tbody tr').first().locator('td .sub').allTextContents();
  const n = s => parseInt(s.replace(/[^0-9-]/g, ''), 10) || 0;
  const v = apps.slice(1).map(n);
  await ins.nth(0).fill(String(v[0] - 7000)); await ins.nth(1).fill(String(v[1])); await ins.nth(2).fill(String(v[2])); await ins.nth(3).fill(String(v[3] - 7000));
  await det.getByRole('button', { name: 'Comparar' }).click(); await page.waitForTimeout(600);
  await expect(det).toContainText('Empezáis de distinto stock');
  await expect(det).toContainText('no cuadra');
  const fab = await page.evaluate(() => JSON.stringify(window.__D.cfg));
  expect(fab).toContain('"fab"');
  // recuento de cierre: todo cuadra → se guarda igual
  const chip = card.locator('.chip', { hasText: /contar|✓/ }).first();
  if (await chip.count()) {
    await chip.click(); await page.waitForTimeout(400);
    const filas = page.locator('.rc-ov tbody tr');
    const k = await filas.count();
    for (let i = 0; i < k; i++) { const app = await filas.nth(i).locator('td').nth(1).textContent(); await filas.nth(i).locator('input').fill(String(n(app))); }
    await page.locator('.rc-ov button', { hasText: 'Guardar recuento (todo cuadra)' }).click(); await page.waitForTimeout(600);
    await expect.poll(() => page.evaluate(() => JSON.stringify(window.__D.cfg))).toContain('"recuentos"');
  }
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});

test('Kilos sin redondeos acumulados: una colada gastada entera (con un ajuste por medio) queda en 0 kg exactos', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => {
    let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v;
      v.lotes.l4 = { nombre: 'C25193', material: 'L-2630', nave: 'Nave 1', donde: 'nave', kgInv: 25007, fardosInv: 34, entrada: '2026-09-27' };
      const C = (i, f, u, fa) => ({ i, t: 'C', f, u, o: 'l4', fa });
      v.mov['2026-10'].items.push(C('r1', '2026-10-01', 'Tarde', 4), C('r2', '2026-10-01', 'Noche', 3), C('r3', '2026-10-02', 'Noche', 3), C('r4', '2026-10-02', 'Mañana', 1), C('r5', '2026-10-02', 'Tarde', 4), C('r6', '2026-10-05', 'Tarde', 4),
        { i: 'r7', t: 'A', f: '2026-10-05', o: 'l4', fa: 1, kg: 736, n: 'Recuento físico: 14 fardos (la app tenía 15)' }, C('r8', '2026-10-07', 'Mañana', 14)); } }); });
  await page.goto(url); await page.waitForTimeout(900);
  await expect(page.locator('body')).toContainText('34.200');
  expect(err).toEqual([]);
});

test('Consumo por kilos: kilos de cada fardo, peso raro, se guarda con kilos reales y al acabar la colada se ajusta la diferencia', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Consumo').click()); await page.waitForTimeout(300);
  await page.locator('.stk-t', { hasText: 'Por kilos' }).first().click(); await page.waitForTimeout(300);
  const card = page.locator('.card', { hasText: 'Nave 1 · AlSi9' }).first();
  await card.locator('select').first().selectOption({ label: '⬅ C25003 · 8 f' });
  await page.waitForTimeout(200);
  await card.locator('input.num').first().fill('650 640 700'); await page.waitForTimeout(200);
  await expect(card.locator('.kil-f')).toHaveCount(3);
  await expect(card.locator('.kil-f.raro')).toHaveCount(1);
  await expect(card).toContainText('3 fardos · 1990 kg');
  await expect(page.locator('body')).toContainText('1 peso raro');
  await page.locator('#k-go').click(); await page.waitForTimeout(300);
  await page.locator('.dlg button', { hasText: 'Registrar' }).click(); await page.waitForTimeout(600);
  const m = await page.evaluate(() => Object.values(window.__D.mov).flatMap(x => x.items).filter(r => r.t === 'C').pop());
  expect(m.fa).toBe(3); expect(m.kg).toBe(1990); expect(m.pk).toEqual([650, 640, 700]); expect(m.o).toBe('l3');
  // el resto de la colada (5 fardos) pesado: se acaba con 40 kg de menos (la ventana «Por kilos» sigue abierta)
  const card2 = page.locator('.card', { hasText: 'Nave 1 · AlSi9' }).first();
  await card2.locator('select').first().selectOption({ label: '⬅ C25003 · 5 f' }); await page.waitForTimeout(200);
  await card2.locator('input.num').first().fill('650 650 650 650 650'); await page.waitForTimeout(200);
  await page.locator('#k-go').click(); await page.waitForTimeout(300);
  await page.locator('.dlg button', { hasText: /^(Registrar|Sumar)$/ }).click(); await page.waitForTimeout(700);
  const resto = page.locator('.card', { hasText: 'Coladas acabadas con diferencia de peso' });
  await expect(resto).toContainText('C25003');
  await expect(resto).toContainText('faltan 40 kg');
  await resto.getByRole('button', { name: 'Apuntar ajuste' }).click(); await page.waitForTimeout(300);
  await page.locator('.dlg button', { hasText: 'Apuntar ajuste' }).click(); await page.waitForTimeout(600);
  const a = await page.evaluate(() => Object.values(window.__D.mov).flatMap(x => x.items).filter(r => r.t === 'A').pop());
  expect(a.kg).toBe(40); expect(a.d).toBe('l3'); expect(a.fa).toBe(0);
  await expect(page.locator('.card', { hasText: 'Coladas acabadas con diferencia de peso' })).toHaveCount(0);
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});

test('Stock: panel de mosaicos que abren su ventana (lista al lado en el ordenador) y vuelven al panel', async ({ page }) => {
  const err = await vigila(page);
  await page.setViewportSize({ width: 1300, height: 850 });
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(() => { try { localStorage.removeItem('colada.stkv'); } catch (e) {} });
  await page.reload(); await page.waitForTimeout(900);
  for (const t of ['Granalla de cobre', 'Máquinas', 'Falta por apuntar', 'Parte del día', 'Previsión de gasto', 'Mínimos']) await expect(page.locator('.stk-grid .stk-t', { hasText: t })).toHaveCount(1);
  await page.locator('.stk-grid .stk-t', { hasText: 'Máquinas' }).click(); await page.waitForTimeout(400);
  await expect(page.locator('.stk-side')).toBeVisible();
  await expect(page.locator('.stk-side .stk-t.on')).toContainText('Máquinas');
  await expect(page.locator('.stk-det')).toContainText('Cargador de bebederos');
  await page.locator('.stk-side .stk-t', { hasText: 'Nave 1' }).first().click(); await page.waitForTimeout(400);
  await expect(page.locator('.stk-det')).toContainText('Coladas');
  expect(await desbordes(page)).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(300);
  await expect(page.locator('.stk-side')).toBeHidden();
  await page.locator('.stk-volver-m').click(); await page.waitForTimeout(300);
  await expect(page.locator('.stk-grid')).toBeVisible();
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});

test('Consumo, Consultas y Plan: panel de mosaicos que abre cada ventana', async ({ page }) => {
  const err = await vigila(page);
  await page.setViewportSize({ width: 1300, height: 850 });
  await page.goto(url); await page.waitForTimeout(900);
  const ir = t => page.evaluate(t => [...document.querySelectorAll('nav button')].find(b => b.textContent === t).click(), t);
  await ir('Consumo'); await page.waitForTimeout(400);
  for (const t of ['Por relevo', 'Por kilos', 'Apunte suelto', 'Falta por apuntar']) await expect(page.locator('.stk-grid .stk-t', { hasText: t })).toHaveCount(1);
  await page.locator('.stk-grid .stk-t', { hasText: 'Por relevo' }).click(); await page.waitForTimeout(300);
  await expect(page.locator('.stk-det')).toContainText('Consumo del relevo');
  await ir('Informes'); await page.waitForTimeout(600);
  for (const t of ['Cierre de mes', 'Movimientos', 'Copia de seguridad']) await expect(page.locator('.stk-grid .stk-t', { hasText: t })).toHaveCount(1);
  await page.locator('.stk-grid .stk-t', { hasText: 'Movimientos' }).click(); await page.waitForTimeout(300);
  await expect(page.locator('.stk-det')).toContainText('Consultar movimientos');
  await expect(page.locator('.stk-det')).toContainText('Detalle');
  await ir('Plan'); await page.waitForTimeout(600);
  await expect(page.locator('.card', { hasText: 'Plan del mes' }).first()).toBeVisible();
  await page.locator('.stk-grid .stk-t', { hasText: 'Valor del stock' }).click(); await page.waitForTimeout(300);
  await expect(page.locator('.stk-side .stk-t.on')).toContainText('Valor del stock');
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});

test('Recuento diario: fardos de las hojas (o kilos) + lo contado, se apunta, cuadra o ajusta, y da el parte para compras', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Consumo').click()); await page.waitForTimeout(300);
  await page.locator('.stk-t', { hasText: 'Recuento diario' }).first().click(); await page.waitForTimeout(400);
  const card = page.locator('.card', { hasText: 'Nave 1 · AlSi9' }).first();
  const k = 'Nave 1|L-2630';
  const ya0 = Number(await page.locator(`[id="rdr-${k}-0"]`).getAttribute('placeholder')) || 0;
  const ya1 = Number(await page.locator(`[id="rdr-${k}-1"]`).getAttribute('placeholder')) || 0;
  await expect(page.locator('#rd-go')).toBeDisabled();
  await page.locator(`[id="rdr-${k}-0"]`).fill(String(ya0 + 2));
  await page.locator(`[id="rdr-${k}-1"]`).fill(Array(ya1).fill('720').concat(['700', '710']).join(' '));
  await expect(card).toContainText((ya1 + 2) + ' f · ');
  await card.locator('.rd-fifo').first().click(); // pone lo que quedaría por FIFO: 8 - 4
  await expect(card).toContainText('Cuadra: 4 fardos');
  await page.locator('[id="rdc-l3"]').fill('3'); // uno más gastado de lo que dicen las hojas
  await expect(card).toContainText('en las hojas falta 1 fardo');
  await expect(card.locator('.rd-mot')).toBeVisible();
  await expect(card.locator('.rd-mot select').first()).toHaveValue('con');
  await page.locator('#rd-go').click(); await page.waitForTimeout(300);
  await page.locator('.dlg button', { hasText: 'Lo contado es lo correcto' }).click(); await page.waitForTimeout(700);
  const ms = await page.evaluate(() => Object.values(window.__D.mov).flatMap(x => x.items).filter(r => /Recuento diario/.test(r.n || '')));
  const C = ms.filter(r => r.t === 'C'), A = ms.filter(r => r.t === 'A');
  expect(C.reduce((s, r) => s + r.fa, 0)).toBe(4);
  expect(C.find(r => r.pk)).toMatchObject({ fa: 2, pk: [700, 710], kg: 1410, o: 'l3' });
  expect(A).toHaveLength(1); expect(A[0]).toMatchObject({ o: 'l3', fa: 1, mot: 'con' });
  const S = await page.evaluate(() => window.__D.cfg.app.rdiario);
  expect(S.c.l3).toBe(3);
  // tras guardar se abre el parte para compras
  await expect(page.locator('.dlg textarea')).toHaveValue(/PARTE DE ALUMINIO/);
  await expect(page.locator('.dlg textarea')).toHaveValue(/NAVE 1 · ALSI9[\s\S]*Queda en nave: 3 f[\s\S]*C25003: 3 f[\s\S]*Queda en externo/);
  // enviar por WhatsApp: abre el chat con el parte escrito
  await page.evaluate(() => { window.open = u => { window.__abierto = u; return null; }; });
  await page.locator('.dlg .env-wa').click();
  const wa = await page.evaluate(() => window.__abierto);
  expect(wa).toMatch(/^https:\/\/wa\.me\/\?text=/); expect(decodeURIComponent(wa)).toContain('PARTE DE ALUMINIO');
  await page.locator('.dlg button', { hasText: 'Cerrar' }).click();
  // la próxima vez empieza en el relevo de hoy: lo ya apuntado sale como «ya apuntados»
  await expect(page.locator('.stk-t', { hasText: 'Recuento diario' }).first()).toContainText('Hecho');
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});

test('Recuento diario: fardo sin etiqueta en la hoja queda pendiente (sin ajuste) y se cierra al pegarla', async ({ page }) => {
  const err = await vigila(page);
  await page.clock.setFixedTime(new Date('2026-11-04T16:00:00+01:00'));
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Consumo').click()); await page.waitForTimeout(300);
  await page.locator('.stk-t', { hasText: 'Recuento diario' }).first().click(); await page.waitForTimeout(400);
  const card = page.locator('.card', { hasText: 'Nave 1 · AlSi9' }).first();
  const k = 'Nave 1|L-2630', kid = k.replace(/[^A-Za-z0-9]/g, '');
  const n = await card.locator('.rd-rels input').count();
  for (let j = 0; j < n; j++) { const ph = await page.locator(`[id="rdr-${k}-${j}"]`).getAttribute('placeholder'); await page.locator(`[id="rdr-${k}-${j}"]`).fill(ph || '0'); }
  const fifo = Number(await card.locator('.rd-fifo').first().textContent());
  await page.locator('[id="rdc-l3"]').fill(String(fifo - 1)); // se ha gastado uno que no sale en la hoja
  await expect(card).toContainText('en las hojas falta 1 fardo');
  await expect(card.locator(`#rdp-${kid}`)).toBeHidden();
  await page.selectOption(`#rdm-${kid}`, 'pend');
  await expect(card.locator(`#rdp-${kid}`)).toBeVisible();
  await page.selectOption(`#rdp-${kid}`, String(n - 1));
  await page.locator('#rd-go').click(); await page.waitForTimeout(300);
  await expect(page.locator('.dlg').last()).toContainText('1 pendiente de etiqueta');
  await page.locator('.dlg button', { hasText: 'Lo contado es lo correcto' }).click(); await page.waitForTimeout(700);
  const todos = () => page.evaluate(() => Object.values(window.__D.mov).flatMap(x => x.items));
  let ms = await todos();
  expect(ms.filter(r => r.t === 'A')).toHaveLength(0);
  const pe = ms.find(r => r.pe); expect(pe).toMatchObject({ t: 'C', o: 'l3', fa: 1 });
  await page.locator('.dlg button', { hasText: 'Cerrar' }).click(); await page.waitForTimeout(300);
  await expect(page.locator('#rd-pend')).toContainText('C25003');
  // siguiente recuento: la hoja de ese relevo ya trae la etiqueta → se cierra solo, sin consumo nuevo ni ajuste
  const ph0 = Number(await page.locator(`[id="rdr-${k}-0"]`).getAttribute('placeholder'));
  await page.locator(`[id="rdr-${k}-0"]`).fill(String(ph0 - 1)); // aún sin etiqueta: vale, sigue pendiente
  await expect(card.locator('.rd-ya.mal')).toHaveCount(0);
  await page.locator(`[id="rdr-${k}-0"]`).fill(String(ph0));
  for (let j = 1; j < await card.locator('.rd-rels input').count(); j++) await page.locator(`[id="rdr-${k}-${j}"]`).fill('0');
  await card.locator('.rd-fifo').first().click();
  await expect(card).toContainText('Etiqueta pegada: el fardo pendiente se cierra');
  await expect(card.locator('.rd-mot')).toBeHidden();
  await page.locator('#rd-go').click(); await page.waitForTimeout(300);
  await expect(page.locator('.dlg').last()).toContainText('1 f de etiqueta pegada');
  await page.locator('.dlg button', { hasText: 'Guardar' }).click(); await page.waitForTimeout(700);
  ms = await todos();
  expect(ms.filter(r => r.pe)).toHaveLength(0);
  expect(ms.find(r => r.i === pe.i).n).toContain('etiqueta pegada después');
  expect(ms.filter(r => r.t === 'A')).toHaveLength(0);
  expect(ms.filter(r => r.t === 'C' && r.f + r.u > pe.f + pe.u)).toHaveLength(0);
  await page.locator('.dlg button', { hasText: 'Cerrar' }).click(); await page.waitForTimeout(300);
  await expect(page.locator('#rd-pend')).toHaveCount(0);
  expect(err).toEqual([]);
});

test('Fardo pendiente de etiqueta: se cierra a mano con los kilos de la etiqueta', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(async () => { const m = '2026-10', it = ((window.__D.mov[m] || {}).items || []).slice(); it.push({ i: 'pe1', t: 'C', f: '2026-10-01', u: 'Mañana', o: 'l3', fa: 1, kg: 700, pe: 1, n: 'Recuento diario · falta la etiqueta en la hoja' }); await db.doc('mov/' + m).set({ items: it }); }); await page.waitForTimeout(400);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Consumo').click()); await page.waitForTimeout(300);
  await page.locator('.stk-t', { hasText: 'Recuento diario' }).first().click(); await page.waitForTimeout(400);
  await page.locator('#rd-pend .chip').first().click();
  await expect(page.locator('.dlg').last()).toContainText('Fardo pendiente de etiqueta');
  await page.fill('#pe-kg', '712,5'); await page.locator('#pe-pegada').click(); await page.waitForTimeout(500);
  const r = await page.evaluate(() => Object.values(window.__D.mov).flatMap(x => x.items).find(x => x.i === 'pe1'));
  expect(r.pe).toBeUndefined(); expect(r.kg).toBe(712.5); expect(r.n).toContain('etiqueta pegada después');
  await expect(page.locator('#rd-pend')).toHaveCount(0);
  expect(err).toEqual([]);
});

test('Recuento diario: si bajan dos coladas, los pesos de cada una van a su colada', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(async () => { await db.doc('lotes/l2').update({ donde: 'nave' }); }); await page.waitForTimeout(300);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Consumo').click()); await page.waitForTimeout(300);
  await page.locator('.stk-t', { hasText: 'Recuento diario' }).first().click(); await page.waitForTimeout(400);
  const k = 'Nave 1|L-2630', card = page.locator('.card', { hasText: 'Nave 1 · AlSi9' }).first();
  const ya0 = Number(await page.locator(`[id="rdr-${k}-0"]`).getAttribute('placeholder')) || 0;
  await page.locator(`[id="rdr-${k}-0"]`).fill(String(ya0 + 4));
  await expect(card.locator('.rd-var')).toBeHidden();
  await page.locator('[id="rdc-l2"]').fill('18'); await page.locator('[id="rdc-l3"]').fill('6');
  await expect(card.locator('.rd-var')).toBeVisible();
  await page.locator(`[id="rdk-${k}-0-l2"]`).fill('700 710');
  await page.locator(`[id="rdk-${k}-0-l3"]`).fill('650 660');
  await expect(card).toContainText('Cuadra: 4 fardos');
  await page.locator('#rd-go').click(); await page.waitForTimeout(300);
  await page.locator('.dlg button', { hasText: 'Guardar' }).click(); await page.waitForTimeout(700);
  const C = await page.evaluate(() => Object.values(window.__D.mov).flatMap(x => x.items).filter(r => r.t === 'C' && /Recuento diario/.test(r.n || '')));
  expect(C.find(r => r.o === 'l2')).toMatchObject({ fa: 2, pk: [700, 710], kg: 1410 });
  expect(C.find(r => r.o === 'l3')).toMatchObject({ fa: 2, pk: [650, 660], kg: 1310 });
  const A = await page.evaluate(() => Object.values(window.__D.mov).flatMap(x => x.items).filter(r => r.t === 'A'));
  expect(A).toHaveLength(0);
  expect(err).toEqual([]);
});

test('Recuento diario: de madrugada el relevo en marcha es la noche del día anterior', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-04T05:19:00+01:00'));
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Consumo').click()); await page.waitForTimeout(300);
  await page.locator('.stk-t', { hasText: 'Recuento diario' }).first().click(); await page.waitForTimeout(400);
  const card = page.locator('.card', { hasText: 'Nave 1 · AlSi9' }).first();
  const rels = await card.locator('.rd-rels .rd-rl').allInnerTexts();
  expect(rels[rels.length - 1]).toContain('mar 03/11 noche');
  expect(rels.join('|')).not.toContain('mié');
});

test('Recuento diario: cada nave se guarda por separado', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(async () => { await db.doc('lotes/l9').set({ nombre: 'C26009', material: 'L-2630', nave: 'Nave 2', donde: 'nave', kgInv: 7000, fardosInv: 10, entrada: '2026-09-20' }); }); await page.waitForTimeout(300);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Consumo').click()); await page.waitForTimeout(300);
  await page.locator('.stk-t', { hasText: 'Recuento diario' }).first().click(); await page.waitForTimeout(400);
  await expect(page.locator('.stk-det .seg button[aria-pressed="true"]')).toHaveText('Nave 1');
  await expect(page.locator('.card', { hasText: 'Nave 2 · AlSi9' })).toHaveCount(0);
  await page.locator('[id="rdc-l3"]').fill('8');
  await page.locator('#rd-go').click(); await page.waitForTimeout(300);
  await page.locator('.dlg button', { hasText: 'Guardar' }).click(); await page.waitForTimeout(700);
  await expect(page.locator('.dlg textarea')).toHaveCount(0);
  await expect(page.locator('.stk-det .seg button[aria-pressed="true"]')).toHaveText('Nave 2');
  await expect(page.locator('.stk-det .seg button', { hasText: 'Nave 1 ✓' })).toHaveCount(1);
  await expect(page.locator('.stk-side .stk-t', { hasText: 'Recuento diario' })).toContainText('1 de 2');
  await page.locator('[id="rdc-l9"]').fill('10');
  await expect(page.locator('#rd-go')).toHaveText('Guardar recuento de Nave 2');
  await page.locator('#rd-go').click(); await page.waitForTimeout(300);
  await page.locator('.dlg button', { hasText: 'Guardar' }).click(); await page.waitForTimeout(700);
  await expect(page.locator('.dlg textarea')).toHaveValue(/recuento: Nave 1 a las .*Nave 2 a las/);
  const N = await page.evaluate(() => Object.keys(window.__D.cfg.app.rdiarioN));
  expect(N.sort()).toEqual(['Nave 1', 'Nave 2']);
  expect(err).toEqual([]);
});

test('Calendario de camiones: stock de cada día, camiones del color del proveedor y se mueven de día y de nave', async ({ page }) => {
  const err = await vigila(page);
  await page.clock.setFixedTime(new Date('2026-11-05T10:00:00+01:00'));
  await page.setViewportSize({ width: 1300, height: 900 });
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(async () => { const app = Object.assign({}, __D.cfg.app); app.proveedores = ['Bepesa', 'Estrella'];
    app.plan = { '2026-11': { camiones: [{ p: 'Bepesa', m: 'L-2630', n: 11 }, { p: 'Estrella', m: 'L-2630', n: 3 }], consumo: { 'Nave 1|L-2630': 2 },
      entradas: [{ f: '2026-11-09', k: 'Nave 1|L-2630', fa: 37, o: 'C', p: 'Bepesa' }, { f: '2026-11-10', k: 'Nave 1|L-2630', fa: 37, o: 'C', p: 'Estrella' }] } };
    await db.doc('cfg/app').set(app); }); await page.waitForTimeout(300);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Plan').click()); await page.waitForTimeout(300);
  await page.locator('.stk-t', { hasText: 'Calendario de camiones' }).first().click(); await page.waitForTimeout(400);
  const card = page.locator('.card', { hasText: 'Calendario de camiones' });
  await expect(card).toContainText('Bepesa');
  await expect(card).toContainText('1 de 11 camiones');
  await expect(card.locator('.cc-chip')).toHaveCount(2);
  // stock del lunes 9 al empezar: 8 f hoy − 2 f/día jueves y viernes (sin noche) ≈ 5
  const l9 = card.locator('.cc-d', { has: page.locator('.cc-dn', { hasText: /^9$/ }) }).locator('.cc-l').first();
  await expect(l9.locator('.cc-v')).toHaveText('5');
  // mover el camión de Bepesa al jueves 12 y a la Nave 2
  await l9.locator('.cc-chip').click();
  await page.fill('#cm-f', '2026-11-12'); await page.locator('#cm-k').selectOption('Nave 2|L-2630');
  await page.locator('#cm-ok').click(); await page.waitForTimeout(500);
  let E = await page.evaluate(() => window.__D.cfg.app.plan['2026-11'].entradas);
  expect(E.find(x => x.p === 'Bepesa')).toMatchObject({ f: '2026-11-12', k: 'Nave 2|L-2630', fa: 37 });
  // arrastrar el de Estrella al lunes 16
  const chipE = page.locator('.cc-chip').filter({ hasText: '+37' }).nth(0);
  const d16 = page.locator('.cc-d', { has: page.locator('.cc-dn', { hasText: /^16$/ }) }).locator('.cc-l[data-k="Nave 1|L-2630"]');
  await chipE.dragTo(d16); await page.waitForTimeout(500);
  E = await page.evaluate(() => window.__D.cfg.app.plan['2026-11'].entradas);
  expect(E.find(x => x.p === 'Estrella')).toMatchObject({ f: '2026-11-16', k: 'Nave 1|L-2630' });
  // tocar un hueco añade un camión
  await page.locator('.cc-d', { has: page.locator('.cc-dn', { hasText: /^18$/ }) }).locator('.cc-l[data-k="Nave 1|L-2630"]').click();
  await page.locator('#cm-p').selectOption('Bepesa'); await page.locator('#cm-ok').click(); await page.waitForTimeout(500);
  E = await page.evaluate(() => window.__D.cfg.app.plan['2026-11'].entradas);
  expect(E.filter(x => x.f === '2026-11-18')).toHaveLength(1);
  // pincel: tocar Estrella y luego el camión del 18 lo pone de Estrella
  await page.locator('button.cc-prov', { hasText: 'Estrella' }).click();
  await expect(page.locator('.cc-pincel')).toContainText('Poniendo «Estrella»');
  await page.locator('.cc-d', { has: page.locator('.cc-dn', { hasText: /^18$/ }) }).locator('.cc-chip').click(); await page.waitForTimeout(400);
  E = await page.evaluate(() => window.__D.cfg.app.plan['2026-11'].entradas);
  expect(E.find(x => x.f === '2026-11-18').p).toBe('Estrella');
  await page.locator('.cc-pincel button', { hasText: 'Terminar' }).click();
  await expect(page.locator('.cc-pincel')).toHaveCount(0);
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});

test('Stock de un día: elegir un día y ver cada colada en nave y externo, lo consumido y lo que entró', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(async () => { await db.doc('mov/2026-10').set({ items: [
    { i: 'm0', t: 'C', f: '2026-10-13', u: 'Mañana', o: 'l3', fa: 2 },
    { i: 'm1', t: 'C', f: '2026-10-20', u: 'Mañana', o: 'l3', fa: 3 }, { i: 'm2', t: 'C', f: '2026-10-20', u: 'Tarde', o: 'l3', fa: 1 }] }); });
  await page.waitForTimeout(300);
  await page.locator('.stk-t', { hasText: 'Stock de un día' }).first().click(); await page.waitForTimeout(400);
  await page.fill('#sd-f', '2026-10-20'); await page.locator('#sd-f').dispatchEvent('change'); await page.waitForTimeout(400);
  const card = page.locator('.card', { hasText: 'Nave 1 · AlSi9' }).first();
  await expect(page.locator('.sd-tit')).toContainText('martes 20/10/2026');
  await expect(card.locator('.sd-kpis')).toContainText('−4 f');
  await expect(card.locator('.sd-kpis')).toContainText('mañana 3, tarde 1');
  await expect(card.locator('tr', { hasText: 'C25003' })).toContainText('4');
  // el día antes tenía 4 fardos más
  await page.locator('button[aria-label="Día anterior"]').click(); await page.waitForTimeout(400);
  await expect(page.locator('.sd-tit')).toContainText('19/10/2026');
  await expect(card.locator('tr', { hasText: 'C25003' }).locator('td').nth(2)).toHaveText('8');
  // tocar una barra de la gráfica va a ese día
  await card.locator('.sd-gb').last().click(); await page.waitForTimeout(300);
  await expect(page.locator('.sd-tit')).toContainText('19/10/2026');
  // la leyenda lleva el nombre entero y al tocar una colada se resalta en la barra y en la tabla
  await card.locator('.sd-li', { hasText: 'C25003' }).click();
  await expect(card.locator('.sd-seg.sel')).toHaveCount(1);
  await expect(card.locator('tr.sd-tr.sel')).toContainText('C25003');
  await expect(card.locator('.sd-info')).toContainText('C25003 · 8 f');
  // filtro de nave sin salir de la ventana
  await page.locator('.sd-filtro button', { hasText: 'Nave 2' }).click(); await page.waitForTimeout(300);
  await expect(page.locator('.card', { hasText: 'Nave 1 · AlSi9' })).toHaveCount(0);
  await page.locator('.sd-filtro .seg[aria-label="Nave"] button', { hasText: 'Todas' }).click(); await page.waitForTimeout(300);
  // quitar lo del externo
  await page.locator('.sd-filtro .seg[aria-label="Dónde"] button', { hasText: 'En nave' }).click(); await page.waitForTimeout(300);
  const c2 = page.locator('.card', { hasText: 'Nave 1 · AlSi9' }).first();
  await expect(c2.locator('.sd-kpis')).not.toContainText('En el externo');
  await expect(c2.locator('tr', { hasText: 'C25001' })).toHaveCount(0);
  await page.locator('.sd-filtro .seg[aria-label="Dónde"] button', { hasText: 'Todo' }).click(); await page.waitForTimeout(300);
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});

test('Recuento diario: «Ha subido del externo» y «Ha llegado un camión» sin salir del recuento', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(async () => { const app = Object.assign({}, __D.cfg.app); app.proveedores = ['BEFESA'];
    app.plan = { '2026-10': { camiones: [{ p: 'BEFESA', m: 'L-2630', n: 2 }], consumo: {}, entradas: [{ f: '2026-10-30', k: 'Nave 1|L-2630', fa: 37, o: 'C', p: 'BEFESA' }] } };
    await db.doc('cfg/app').set(app); }); await page.waitForTimeout(300);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Consumo').click()); await page.waitForTimeout(300);
  await page.locator('.stk-t', { hasText: 'Recuento diario' }).first().click(); await page.waitForTimeout(400);
  const card = page.locator('.card', { hasText: 'Nave 1 · AlSi9' }).first();
  await expect(page.locator('[id="rdc-l1"]')).toHaveCount(0);
  await card.locator('button', { hasText: 'Ha subido del externo (2)' }).click();
  await page.locator('.dlg .seg button', { hasText: 'Solo una parte' }).click();
  await page.fill('#rd-sub-n', '10'); await page.locator('#rd-sub-ok').click(); await page.waitForTimeout(700);
  await expect(page.locator('[id="rdc-l3"]')).toBeVisible();
  const T = await page.evaluate(() => Object.values(window.__D.mov).flatMap(x => x.items).filter(r => r.t === 'T'));
  expect(T.length).toBeGreaterThan(0);
  // camión previsto con retraso: se abre la entrada rellena y al guardar se vuelve al recuento
  await page.locator('.card', { hasText: 'Nave 1 · AlSi9' }).first().locator('button', { hasText: 'Ha llegado un camión (1 previsto)' }).click();
  await page.locator('.dlg .rd-ext-b', { hasText: 'BEFESA · 37 f' }).click(); await page.waitForTimeout(400);
  await expect(page.locator('#e-volver')).toBeVisible();
  await page.fill('#e-col', 'C26100'); await page.fill('#e-alb', 'ALB-9'); await page.fill('#e-kg', '25000'); await page.fill('#e-kb', '24800'); await page.waitForTimeout(200);
  await page.click('#e-go'); await page.waitForTimeout(900);
  await expect(page.locator('.card', { hasText: 'Nave 1 · AlSi9' }).first()).toContainText('C26100');
  const E = await page.evaluate(() => Object.values(window.__D.mov).flatMap(x => x.items).find(r => r.t === 'E' && r.a === 'ALB-9'));
  expect(E).toMatchObject({ kg: 25000, kb: 24800 });
  const P = await page.evaluate(() => window.__D.cfg.app.plan['2026-10'].entradas[0]);
  expect(P.rec).toBeTruthy();
  expect(err).toEqual([]);
});

test('Proveedor que solo descarga en una nave: GRUPAL ART solo en Nave 2 (aviso y no deja moverlo a Nave 1)', async ({ page }) => {
  const err = await vigila(page);
  await page.clock.setFixedTime(new Date('2026-11-05T10:00:00+01:00'));
  await page.setViewportSize({ width: 1300, height: 900 });
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(async () => { const app = Object.assign({}, __D.cfg.app); app.proveedores = ['BEFESA', 'GRUPAL ART'];
    app.plan = { '2026-11': { camiones: [{ p: 'BEFESA', m: 'L-2630', n: 2 }, { p: 'GRUPAL ART', m: 'L-2630', n: 2 }], consumo: { 'Nave 1|L-2630': 2 },
      entradas: [{ f: '2026-11-09', k: 'Nave 1|L-2630', fa: 37, o: 'C', p: 'GRUPAL ART' }, { f: '2026-11-10', k: 'Nave 2|L-2630', fa: 37, o: 'C', p: 'GRUPAL ART' }] } };
    await db.doc('cfg/app').set(app); }); await page.waitForTimeout(300);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Plan').click()); await page.waitForTimeout(300);
  await page.locator('.stk-t', { hasText: 'Calendario de camiones' }).first().click(); await page.waitForTimeout(400);
  const card = page.locator('.card', { hasText: 'Calendario de camiones' });
  await expect(card.locator('.banner.b')).toContainText('GRUPAL ART solo descarga en Nave 2');
  await expect(card.locator('.cc-chip.mal')).toHaveCount(1);
  // intentar pasar el de Nave 2 a Nave 1: no deja y avisa
  const d10 = card.locator('.cc-d', { has: page.locator('.cc-dn', { hasText: /^10$/ }) });
  await d10.locator('.cc-chip').click(); await page.locator('#cm-k').selectOption('Nave 1|L-2630'); await page.locator('#cm-ok').click();
  await expect(page.locator('.dlg')).toContainText('solo pueden descargar en Nave 2');
  await page.locator('.dlg button', { hasText: 'Cancelar' }).click();
  let E = await page.evaluate(() => window.__D.cfg.app.plan['2026-11'].entradas);
  expect(E.find(x => x.f === '2026-11-10').k).toBe('Nave 2|L-2630');
  // corregir el mal puesto: a Nave 2
  await card.locator('.cc-chip.mal').click(); await page.locator('#cm-k').selectOption('Nave 2|L-2630'); await page.locator('#cm-ok').click(); await page.waitForTimeout(400);
  await expect(page.locator('.cc-chip.mal')).toHaveCount(0);
  // en Camiones contratados sale «Solo Nave 2»
  await page.locator('.stk-t', { hasText: 'Camiones contratados' }).first().click(); await page.waitForTimeout(300);
  await expect(page.locator('select[aria-label="Dónde descarga GRUPAL ART"]')).toHaveValue('Nave 2');
  expect(err).toEqual([]);
});

test('Horneros: semana con rotación, cambio de un día y consultas por hornero', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => { const rows = [{ col: 'alm_cat', id: 'app', data: { maquinas: [{ id: 'm1', cod: 'F25' }], articulos: [{ id: 't1', fam: 'horno', desc: 'Tolva de hierro' }] } },
    { col: 'alm_mov', id: '2026-10', data: { items: [{ id: 'x1', tipo: 'salida', art: 't1', cant: 1, maq: 'm1', f: '2026-10-27', u: 'Mañana' }] } },
    { col: 'alm_pist', id: '2026', data: { items: [{ id: 'p1', f: '2026-10-27', maq: 'm1', diam: 'Ø 60', cant: 1, motivo: 'ROTURA', u: 'Tarde' }] } }];
    window.sbColada = { from: () => ({ select: () => ({ in: async () => ({ data: rows }) }) }) }; });
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(async () => {
    const app = Object.assign({}, __D.cfg.app); app.horn = { lista: [{ id: 'h1', n: 'Juan' }, { id: 'h2', n: 'Pedro' }, { id: 'h3', n: 'Luis' }, { id: 'h4', n: 'Ana' }], sem: {}, dia: {} }; await db.doc('cfg/app').set(app);
    await db.doc('mov/2026-10').set({ items: [{ i: 'c1', t: 'C', f: '2026-10-27', u: 'Mañana', o: 'l3', fa: 3, n: 'Recuento diario · Fuera de FIFO' }, { i: 'c2', t: 'C', f: '2026-10-27', u: 'Tarde', o: 'l3', fa: 1 }] }); });
  await page.waitForTimeout(300);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Consumo').click()); await page.waitForTimeout(300);
  await page.locator('.stk-t', { hasText: 'Horneros' }).first().click(); await page.waitForTimeout(400);
  await expect(page.locator('.hn-sem')).toContainText('Semana del 26/10');
  const pon = async (cel, nombre) => { await page.locator(`button[aria-label="Quién está ${cel}"]`).click(); await page.locator('.dlg .hn-chk', { hasText: nombre }).locator('input').check(); await page.locator('#hn-ok').click(); await page.waitForTimeout(300); };
  await pon('Nave 1 Mañana', 'Juan'); await pon('Nave 1 Tarde', 'Pedro'); await pon('Nave 1 Noche', 'Luis');
  // el de la cuchara de reparto también gira
  await page.locator('button[aria-label="Cuchara Nave 1 Mañana"]').click(); await page.locator('.dlg .hn-chk', { hasText: 'Ana' }).locator('input').check(); await page.locator('#hn-ok').click(); await page.waitForTimeout(300);
  // la semana siguiente sale sola por la rotación: el de mañana pasa a noche
  await page.locator('button[aria-label="Semana siguiente"]').click(); await page.waitForTimeout(300);
  await expect(page.locator('button[aria-label="Quién está Nave 1 Noche"]')).toContainText('Juan');
  await expect(page.locator('button[aria-label="Quién está Nave 1 Mañana"]')).toContainText('Pedro');
  await expect(page.locator('button[aria-label="Quién está Nave 1 Tarde"]')).toContainText('Luis');
  await expect(page.locator('button[aria-label="Cuchara Nave 1 Noche"]')).toContainText('Ana');
  // baja de un día: Ana sustituye a Pedro el martes 3/11 por la mañana
  await page.locator('button', { hasText: '+ Baja o sustitución' }).click();
  await page.fill('#hn-f', '2026-11-03'); await page.locator('#hn-sig').click();
  await page.locator('.dlg .hn-chk', { hasText: 'Pedro' }).locator('input').uncheck(); await page.locator('.dlg .hn-chk', { hasText: 'Ana' }).locator('input').check(); await page.locator('#hn-ok').click(); await page.waitForTimeout(300);
  await expect(page.locator('.card', { hasText: 'Cambios de un día' })).toContainText('Ana (en vez de Pedro)');
  // cambiar el nombre de un hornero: se cambia en todas las semanas
  await page.locator('button[aria-label="Cambiar el nombre de Luis"]').click();
  await page.locator('.dlg input').fill('Luis M.'); await page.locator('.dlg button', { hasText: 'Guardar' }).click(); await page.waitForTimeout(400);
  await expect(page.locator('button[aria-label="Quién está Nave 1 Tarde"]')).toContainText('Luis M.');
  // consultas
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Informes').click()); await page.waitForTimeout(300);
  const resp = async t => { await page.fill('#bqQ', t); await page.waitForTimeout(500); return (await page.locator('.bq-res').innerText()).replace(/\s+/g, ' '); };
  let r = await resp('consumo por hornero este mes');
  expect(r).toMatch(/Quien más aluminio gasta en este mes: Juan 3 f por relevo/); expect(r).toMatch(/Consumo por persona/);
  r = await resp('quién no sigue el fifo este mes');
  expect(r).toMatch(/Quien menos sigue el FIFO en este mes: Juan 1 de/);
  // cruce con el Almacén: tolvas y pistones por persona
  r = await resp('con quién se cambian más tolvas este mes');
  expect(r).toMatch(/Por cada 10 relevos \(carga del horno, este mes\): Juan 2/);
  r = await resp('tolvas por cuchara este mes');
  expect(r).toMatch(/cuchara de reparto, este mes\): Ana 2/);
  r = await resp('cómo trabaja Juan este mes');
  expect(r).toMatch(/Juan \(carga del horno\) en este mes: \d+ relevos/); expect(r).toContain('Cambios de tolva (por 10 relevos)');
  expect(err).toEqual([]);
});

test('Cierre de mes: consumo como lo calcula la fábrica, partiendo del final de la fábrica del mes anterior', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => { let v; Object.defineProperty(window, '__D', { configurable: true, get() { return v; }, set(x) {
    if (x && x.cfg && x.cfg.app) x.cfg.app.fab = { '2026-09': { 'Nave 1|L-2630': { ini: 1, ent: 0, con: 0, fin: 5000 } } }; v = x; } }); });
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Informes').click()); await page.waitForTimeout(500);
  await page.locator('.stk-t', { hasText: 'Cierre de mes' }).first().click(); await page.waitForTimeout(500);
  const c = page.locator('.card', { hasText: 'Consumo como lo calcula la fábrica' }).last();
  await expect(c).toContainText('Inicio fábrica 5000');
  await expect(c).toContainText('Apuntado en las hojas');
  // la cuenta: inicio fábrica + entradas − final = consumo
  const t = await c.locator('.banner').first().innerText();
  const n = s => parseInt(String(s).replace(/\./g, ''), 10);
  const m = t.match(/Inicio fábrica ([\d.]+) \+ entradas ([\d.]+) − final ([\d.]+)/), tot = t.match(/: (-?[\d.]+) kg de consumo/);
  expect(n(m[1]) + n(m[2]) - n(m[3])).toBe(n(tot[1]));
  expect(err).toEqual([]);
});

test('Cierre: con el mes cerrado (candado) no se puede apuntar nada de ese mes; se reabre; repaso de la semana', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => { let v; Object.defineProperty(window, '__D', { configurable: true, get() { return v; }, set(x) {
    if (x && x.cfg && x.cfg.app) x.cfg.app.candado = { '2026-10': { ts: '2026-10-31T10:00:00Z', por: 'Prueba' } }; v = x; } }); });
  await page.goto(url); await page.waitForTimeout(900);
  const n0 = await page.evaluate(() => Object.values(window.__D.mov).flatMap(x => x.items).length);
  // recuento diario de hoy (octubre, cerrado): no deja guardar y lo explica
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Consumo').click()); await page.waitForTimeout(300);
  await page.locator('.stk-t', { hasText: 'Recuento diario' }).first().click(); await page.waitForTimeout(400);
  const k = 'Nave 1|L-2630';
  const ya0 = Number(await page.locator(`[id="rdr-${k}-0"]`).getAttribute('placeholder')) || 0;
  await page.locator(`[id="rdr-${k}-0"]`).fill(String(ya0 + 1));
  for (const b of await page.locator('.rd-fifo').all()) await b.click();
  await expect(page.locator('#rd-go')).toBeEnabled({ timeout: 3000 });
  await page.locator('#rd-go').click(); await page.waitForTimeout(300);
  await page.locator('.dlg button', { hasText: /^(Guardar|Lo contado es lo correcto)$/ }).last().click({ timeout: 3000 }); await page.waitForTimeout(600);
  await expect(page.locator('#toast')).toContainText('está cerrado');
  expect(await page.evaluate(() => Object.values(window.__D.mov).flatMap(x => x.items).length)).toBe(n0);
  // en el cierre sale cerrado y se puede reabrir
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Informes').click()); await page.waitForTimeout(500);
  await page.locator('.stk-t', { hasText: 'Cierre de mes' }).first().click(); await page.waitForTimeout(500);
  await expect(page.locator('.banner', { hasText: 'Octubre 2026 cerrado' })).toBeVisible();
  await page.locator('.banner', { hasText: 'Octubre 2026 cerrado' }).getByRole('button', { name: 'Reabrir' }).click();
  await page.locator('.dlg button', { hasText: 'Reabrir' }).last().click(); await page.waitForTimeout(500);
  expect(await page.evaluate(() => (window.__D.cfg.app.candado || {})['2026-10'])).toBeFalsy();
  // repaso de la semana
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Informes').click()); await page.waitForTimeout(500);
  await page.locator('.stk-t', { hasText: 'Repaso de la semana' }).first().click(); await page.waitForTimeout(400);
  const rep = page.locator('.card', { hasText: 'Repaso de la semana' }).last();
  await expect(rep).toContainText('relevo');
  await expect(rep).toContainText('Del ');
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});

test('Cierre: recuento de cierre guiado, un sitio detrás de otro', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Informes').click()); await page.waitForTimeout(500);
  await page.locator('.stk-t', { hasText: 'Cierre de mes' }).first().click(); await page.waitForTimeout(500);
  await page.locator('.chip', { hasText: 'Empezar el recuento de cierre guiado' }).click(); await page.waitForTimeout(400);
  const ov = page.locator('.rc-ov');
  await expect(ov).toContainText(/Recuento de cierre · paso 1 de \d/);
  const filas = ov.locator('tbody tr'), k = await filas.count();
  const n = s => parseInt(String(s).replace(/[^0-9-]/g, ''), 10) || 0;
  for (let i = 0; i < k; i++) { const app = await filas.nth(i).locator('td').nth(1).textContent(); await filas.nth(i).locator('input').fill(String(n(app))); }
  await ov.locator('button', { hasText: 'Guardar recuento (todo cuadra)' }).click(); await page.waitForTimeout(1200);
  await expect(page.locator('.rc-ov')).toContainText(/paso 2 de \d/);
  expect(err).toEqual([]);
});

test('Consultas: al tocar un mes se abre su ficha completa (camiones, consumo, ajustes, coladas) y Todo vuelve al panel', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Informes').click()); await page.waitForTimeout(500);
  await expect(page.locator('.meses-tabs .mes-tab').first()).toHaveText('Todo');
  await page.locator('.mes-tab', { hasText: 'Octubre 2026' }).click(); await page.waitForTimeout(500);
  await expect(page.locator('.mes-tab', { hasText: 'Octubre 2026' })).toHaveAttribute('aria-selected', 'true');
  const f = page.locator('.mes-aud');
  await expect(f).toContainText('Resumen de octubre 2026');
  await expect(f).toContainText('Camiones que entraron');
  await expect(f).toContainText('Consumo por día y relevo');
  await expect(f).toContainText('Ajustes de recuento');
  await expect(f).toContainText('Coladas al final del mes');
  await expect(f.locator('table').first()).toContainText('Nave 1');
  await expect(page.locator('#mes-xlsx')).toBeVisible();
  expect(await desbordes(page)).toEqual([]);
  await page.locator('.mes-tab', { hasText: 'Todo' }).click(); await page.waitForTimeout(400);
  await expect(page.locator('.mes-aud')).toHaveCount(0);
  await expect(page.locator('.stk-t', { hasText: 'Cierre de mes' }).first()).toBeVisible();
  expect(err).toEqual([]);
});

test('Consultas: informe del año y registro de cambios', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Informes').click()); await page.waitForTimeout(500);
  await page.locator('.stk-t', { hasText: 'Informe del año' }).first().click(); await page.waitForTimeout(300);
  await expect(page.locator('#inf-ano')).toHaveValue('2026');
  await expect(page.locator('#inf-ano-xlsx')).toBeVisible();
  await page.locator('button:visible', { hasText: '← Panel' }).first().click(); await page.waitForTimeout(300);
  await page.locator('.stk-t', { hasText: 'Registro de cambios' }).first().click(); await page.waitForTimeout(300);
  await expect(page.locator('.card', { hasText: 'Registro de cambios' }).last()).toContainText('quién cambió qué');
  await page.locator('button:visible', { hasText: '← Panel' }).first().click(); await page.waitForTimeout(300);
  await page.locator('.mes-tab', { hasText: 'Octubre 2026' }).click(); await page.waitForTimeout(400);
  await expect(page.locator('.mes-aud')).toContainText('Cambios en los apuntes de este mes');
  expect(err).toEqual([]);
});

test('Incidencias: se apuntan desde la ficha de la colada y salen en Consultas; proveedores del año', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Informes').click()); await page.waitForTimeout(300);
  await page.fill('#bqQ', 'coladas en externo'); await page.waitForTimeout(300);
  await page.locator('.bq-res tr.fila-link td[data-l="Aleación"]').first().click(); await page.waitForTimeout(400);
  const fi = page.locator('.ficha-ov').last();
  await fi.locator('#inc-nueva').click();
  await page.selectOption('#inc-tipo', 'Mojados o con humedad'); await page.fill('#inc-fa', '3'); await page.fill('#inc-nota', 'Llovió en la descarga');
  await page.click('#inc-ok'); await page.waitForTimeout(600);
  const I = await page.evaluate(() => Object.values(window.__D.incid || {}).flatMap(x => x.items || []));
  expect(I).toHaveLength(1); expect(I[0]).toMatchObject({ tipo: 'Mojados o con humedad', fa: 3, estado: 'abierta' });
  await expect(page.locator('.ficha-ov').last()).toContainText('Mojados o con humedad');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.fill('#bqQ', ''); await page.waitForTimeout(300);
  await page.locator('.stk-t', { hasText: 'Incidencias del material' }).first().click(); await page.waitForTimeout(300);
  const c = page.locator('.card', { hasText: 'Incidencias del material' }).last();
  await expect(c).toContainText('Mojados o con humedad');
  await c.getByRole('button', { name: 'Reclamada' }).click(); await page.waitForTimeout(400);
  expect(await page.evaluate(() => Object.values(window.__D.incid).flatMap(x => x.items)[0].estado)).toBe('reclamada');
  await page.locator('button:visible', { hasText: '← Panel' }).first().click(); await page.waitForTimeout(300);
  await page.locator('.stk-t', { hasText: 'Proveedores del año' }).first().click(); await page.waitForTimeout(300);
  await expect(page.locator('.card', { hasText: 'Proveedores del año' }).last()).toContainText('Incidencias');
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});

test('Trazabilidad: qué colada se usaba un día y nave; certificado en la ficha de la colada', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Informes').click()); await page.waitForTimeout(300);
  await page.locator('.stk-t', { hasText: '¿Qué colada se usaba ese día?' }).first().click(); await page.waitForTimeout(300);
  await page.fill('#tz-f', '2026-10-13'); await page.locator('#tz-f').dispatchEvent('change'); await page.waitForTimeout(300);
  const c = page.locator('.card', { hasText: '¿Qué colada se usaba ese día?' }).last();
  await expect(c).toContainText('2 f');
  await expect(c).toContainText('Sin consumo apuntado en este relevo');
  await page.locator('button:visible', { hasText: '← Panel' }).first().click(); await page.waitForTimeout(300);
  await page.fill('#bqQ', 'coladas en externo'); await page.waitForTimeout(300);
  await page.locator('.bq-res tr.fila-link td[data-l="Aleación"]').first().click(); await page.waitForTimeout(400);
  await expect(page.locator('.ficha-ov').last()).toContainText('Certificado de calidad');
  await expect(page.locator('#cert-in')).toHaveCount(1);
  expect(err).toEqual([]);
});

test('Consumo: mosaico «Consumo del mes» con comparativa frente al mes pasado y 6 meses', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Consumo').click()); await page.waitForTimeout(400);
  const t = page.locator('.stk-grid .stk-t', { hasText: 'Consumo del mes' });
  await expect(t).toHaveCount(1);
  await expect(t.locator('.stk-t-cmp')).toContainText(/vs\. mes pasado|sin consumo el mes pasado/);
  await expect(t.locator('.stk-t-cmp')).toHaveAttribute('title', /1–30 de sep/);
  await expect(t.locator('.tspark rect')).toHaveCount(6);
  await t.click(); await page.waitForTimeout(300);
  const c = page.locator('#cons-mes');
  await expect(c).toContainText('1–31 oct'); await expect(c).toContainText('1–30 sep'); await expect(c).toContainText('Total');
  await expect(c).toContainText('Últimos 6 meses'); await expect(c).toContainText('oct (en curso)');
  expect(await c.innerText()).not.toMatch(/undefined|NaN/);
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});

test('Reglas automáticas en Coladas: se monta una regla, se guarda en los ajustes y sale en la campana', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Informes').click());
  await page.waitForTimeout(1500);
  await page.locator('.stk-t', { hasText: 'Reglas automáticas' }).first().click(); await page.waitForTimeout(600);
  await page.locator('button', { hasText: '+ Nueva regla' }).last().click(); await page.waitForTimeout(300);
  const d = page.locator('.rgx-dlg');
  await d.locator('#rgxM').selectOption('stock_kg');
  await d.locator('#rgxF_nave').selectOption('Nave 1');
  await d.locator('#rgxOp').selectOption('>'); await d.locator('#rgxN').fill('0');
  await expect(d).toContainText('Quedará así: «Avisar si los kilos en stock en la Nave 1 son más de 0 kg»');
  await expect(d.locator('.rgx-prev')).toContainText('Ahora mismo saltaría');
  await d.locator('button', { hasText: 'Guardar' }).click(); await page.waitForTimeout(800);
  const g = await page.evaluate(() => __D.cfg.app.reglas); expect(g.length).toBe(1); expect(g[0]).toMatchObject({ m: 'stock_kg', f: { nave: 'Nave 1' }, op: '>', n: 0 });
  await expect(page.locator('.rgx-it').first()).toContainText('salta ahora');
  await page.waitForTimeout(1800);
  await page.locator('.camp-b, #campana, [aria-label*="visos"]').first().click(); await page.waitForTimeout(300);
  await expect(page.locator('body')).toContainText('Nave 1 · ');
  await expect(page.locator('body')).toContainText('kilos en stock');
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});

test('Aprobaciones en Coladas: un ajuste grande queda pendiente, se aprueba y lo pequeño no pide nada', async ({ page }) => {
  await page.addInitScript(() => { window.__rpc = [];
    window.yoId = () => 'u-cris'; window.yoNombre = () => 'Cristian'; window.yoAdmin = () => true;
    const q = d => { const o = { select: () => o, in: () => o, eq: () => o, then: (ok, ko) => Promise.resolve({ data: d, error: null }).then(ok, ko) }; return o; };
    window.sbColada = { from: () => q([{ user_id: 'u-cris', nombre: 'Cristian', activo: true, coladas: true }]), rpc: async (f, a) => { window.__rpc.push([f, a]); return { data: true }; } }; });
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(async () => {
    await db.doc('cfg/app').set(Object.assign({}, __D.cfg.app, { aprob: { quien: ['u-cris'], ajuste_kg: 1000, desde: '2026-10-01' } }));
    const sn = await db.doc('mov/2026-10').get(); const it = sn.exists ? (sn.data().items || []) : [];
    await db.doc('mov/2026-10').set({ items: it.concat([{ i: 'aj1', t: 'A', o: 'l1', f: '2026-10-30', fa: -3, kg: -2100, n: 'Recuento: faltan 3 fardos' }, { i: 'aj2', t: 'A', o: 'l1', f: '2026-10-30', fa: -1, kg: -700, n: 'Recuento' }]) }); });
  await page.waitForTimeout(2200);
  await page.locator('.campana').click(); await page.waitForTimeout(200);
  await expect(page.locator('.campana-pan')).toContainText('1 apunte pendiente de aprobar');
  await page.locator('.campana-pan .campana-x').click();
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Informes').click()); await page.waitForTimeout(1500);
  await page.locator('.stk-t', { hasText: 'Por aprobar' }).first().click(); await page.waitForTimeout(600);
  const c = page.locator('.card.apr').last();
  await expect(c.locator('.apr-it')).toHaveCount(1);
  await expect(c).toContainText('Ajuste de −2100 kg (3 f) · colada C25001');
  await c.locator('button', { hasText: 'Aprobar' }).click(); await page.waitForTimeout(700);
  const m = await page.evaluate(() => __D.mov['2026-10'].items.find(x => x.i === 'aj1'));
  expect(m.apr).toMatchObject({ est: 'ok', por: 'Cristian' }); expect(m.kg).toBe(-2100);
  await expect(page.locator('.card.apr').last()).toContainText('Aprobado por Cristian');
  expect(err).toEqual([]);
});

test('Enlace para compartir: desde un informe se crea un enlace que caduca, se copia y se puede anular', async ({ page }) => {
  await page.addInitScript(() => { window.__ins = []; window.__upd = [];
    const filas = [];
    const t = () => { const st = {}; const o = { insert: x => { st.op = 'ins'; st.x = x; return o; }, update: x => { st.op = 'upd'; st.x = x; return o; }, select: () => o, order: () => o, limit: () => o, eq: (k, v) => { st.eq = v; return o; },
      then: (ok, ko) => { let data = null;
        if (st.op === 'ins') { const r = Object.assign({ id: 'c' + filas.length, token: 'abcdef0123456789abcdef0123', creado: new Date().toISOString(), vistas: 0 }, st.x); filas.unshift(r); window.__ins.push(st.x); data = [r]; }
        else if (st.op === 'upd') { Object.assign(filas.find(f => f.id === st.eq), st.x); window.__upd.push(st.x); }
        else data = filas.slice();
        return Promise.resolve({ data, error: null }).then(ok, ko); } }; return o; };
    window.sbColada = { from: () => t(), rpc: async () => ({ data: [] }) }; });
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  await page.locator('#hInf').click(); await page.waitForTimeout(300);
  await page.locator('.inf-it').first().click(); await page.waitForTimeout(400);
  await page.locator('.inf-acc button', { hasText: 'Enlace para compartir' }).click(); await page.waitForTimeout(300);
  const d = page.locator('.cmp-ov');
  await d.locator('.chip', { hasText: '7 días' }).click();
  await d.locator('button', { hasText: 'Crear el enlace' }).click(); await page.waitForTimeout(500);
  await expect(d.locator('.cmp-url')).toHaveValue(/informe\.html#k=abcdef0123456789abcdef0123$/);
  const ins = await page.evaluate(() => window.__ins[0]);
  expect(ins.contenido.texto.length).toBeGreaterThan(20); expect(ins.app).toBeTruthy();
  const ahora = await page.evaluate(() => Date.now()); expect(Math.round((Date.parse(ins.caduca) - ahora) / 864e5)).toBe(7);
  await expect(d.locator('.cmp-l li')).toHaveCount(1); await expect(d.locator('.cmp-l li')).toContainText('0 veces abierto');
  await d.locator('.cmp-l button', { hasText: 'Anular' }).click(); await page.waitForTimeout(400);
  expect((await page.evaluate(() => window.__upd[0])).anulado).toBeTruthy();
  await expect(d.locator('.cmp-l li')).toContainText('anulado');
  expect(await desbordes(page)).toEqual([]); expect(err).toEqual([]);
});

test('Consumo: la pestaña abre la vista general y el botón naranja lleva al recuento diario', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  const consumo = () => page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Consumo').click());
  await consumo(); await page.waitForTimeout(500);
  await expect(page.locator('.stk-t', { hasText: 'Recuento diario' }).first()).toBeVisible();
  await expect(page.locator('.stk-t', { hasText: 'Por relevo' }).first()).toBeVisible();
  await page.locator('button', { hasText: '+ Recuento diario' }).click(); await page.waitForTimeout(500);
  await expect(page.locator('.stk-det h2').first()).toContainText('Recuento diario');
  /* al volver a la pestaña, otra vez la vista general */
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Stock').click()); await page.waitForTimeout(200);
  await consumo(); await page.waitForTimeout(500);
  await expect(page.locator('.stk-t', { hasText: 'Por relevo' }).first()).toBeVisible();
  expect(err).toEqual([]);
});

test('«¿No cuadra?» al pie de cada pantalla y en la ficha de una colada', async ({ page }) => {
  const err = await vigila(page);
  await page.addInitScript(() => { window.__NC_MOCK = []; });
  await page.goto(url); await page.waitForTimeout(900);
  await page.locator('#ncPie').click(); await page.waitForTimeout(200);
  await page.fill('#ncTxt', 'en Nave 1 salen 12 fardos y hay 10');
  await page.locator('#ncEnviar').click(); await page.waitForTimeout(200);
  let nc = await page.evaluate(() => window.__NC_MOCK);
  expect(nc[0].t).toContain('12 fardos'); expect(nc[0].ctx.tipo).toBe('Pantalla'); expect(nc[0].ctx.ve.length).toBeGreaterThan(10);
  const nom = await page.evaluate(() => { const [id, l] = Object.entries(window.__D.lotes)[0]; window.abrirFicha(id); return l.nombre; }); await page.waitForTimeout(400);
  await page.locator('#ncFicha').click(); await page.waitForTimeout(200);
  await page.fill('#ncTxt', 'la colada pone 0 kg');
  await page.locator('#ncEnviar').click(); await page.waitForTimeout(200);
  nc = await page.evaluate(() => window.__NC_MOCK);
  expect(nc[1].ctx.tipo).toBe('Colada'); expect(nc[1].ctx.titulo).toBe('Colada ' + nom);
  expect(err).toEqual([]);
});
