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
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Consultas').click());
  await page.waitForTimeout(1500);
  await expect(page.getByText('Aluminio por mes')).toBeVisible();
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
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Consultas').click());
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
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Consultas').click());
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
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Consultas').click()); await page.waitForTimeout(300);
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
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Consultas').click()); await page.waitForTimeout(300);
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
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Consultas').click()); await page.waitForTimeout(300);
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
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Consultas').click()); await page.waitForTimeout(300);
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

test('Consultas: al buscar un albarán se puede abrir su ficha', async ({ page }) => {
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  await page.evaluate(async () => { const h = new Date(), f = d => { const x = new Date(h); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); }, mes = f(0).slice(0, 7);
    await db.doc('lotes/l4').set({ nombre: 'C25010', material: 'L-2630', nave: 'Nave 2', donde: 'nave', kgInv: 0, fardosInv: 0, entrada: f(-3), proveedor: 'IDALSA', albaran: 'ALB-7788' });
    await db.doc('mov/' + mes).set({ items: [{ i: 'e1', t: 'E', f: f(-3), d: 'l4', fa: 30, kg: 21000, a: 'ALB-7788' }] }); });
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(b => b.textContent === 'Consultas').click()); await page.waitForTimeout(300);
  await page.fill('#bqQ', 'albarán ALB-7788'); await page.waitForTimeout(300);
  await page.locator('.bq-res button', { hasText: 'Abrir el albarán ALB-7788' }).click(); await page.waitForTimeout(300);
  await expect(page.locator('.alb-ov')).toBeVisible();
  await page.evaluate(() => document.querySelector('.alb-ov').remove());
  await page.fill('#bqQ', 'entradas de este mes'); await page.waitForTimeout(300);
  await page.locator('.bq-res td button.linkcol', { hasText: 'ALB-7788' }).first().click(); await page.waitForTimeout(300);
  await expect(page.locator('.alb-ov')).toBeVisible();
  expect(err).toEqual([]);
});
