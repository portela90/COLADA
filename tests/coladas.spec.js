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
