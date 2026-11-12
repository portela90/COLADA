// Ningún texto aplastado (letra a letra, en columna) en ninguna pantalla, en el móvil más estrecho (320 px, como un iPhone con «Zoom de pantalla»).
// Recorre cada pestaña, cada pantalla de «Más» y sus pestañas, mosaicos y vistas. Usa desbordes(), que también
// avisa si algo se sale por la derecha.
const { test, expect } = require('@playwright/test');
const { montar, vigila, desbordes } = require('./util');
const { abre, ADMIN, OPER } = require('./limp');

const ANCHO = 320;
async function mira(page, donde, malos) { const d = await desbordes(page); if (d.length) malos.push(donde + ': ' + d.join(' | ')); }
/* pulsa uno a uno los botones de navegación de dentro de la pantalla (pestañas, mosaicos, vistas) */
async function dentro(page, sel, donde, malos, rehacer) {
  const n = await page.evaluate(s => document.querySelectorAll(s).length, sel);
  for (let i = 0; i < Math.min(n, 14); i++) {
    if (rehacer) await rehacer();
    const t = await page.evaluate(([s, i]) => { const b = document.querySelectorAll(s)[i]; if (!b || !b.offsetParent) return null; const x = (b.textContent || '').trim().slice(0, 30); b.click(); return x; }, [sel, i]);
    if (t == null) continue;
    await page.waitForTimeout(250);
    await page.evaluate(() => document.querySelectorAll('.ov').forEach(o => o.remove())); /* si se abrió una ventana, fuera */
    await mira(page, donde + ' › ' + t, malos);
  }
}
const NAV_ALM = '#view .op-tabs button, #view .pv-t, #view .stk-t, #view .seg button';

test('Almacén: ningún texto aplastado en el móvil', async ({ page }) => {
  test.setTimeout(240000);
  await page.setViewportSize({ width: ANCHO, height: 800 });
  /* un eje llegado del taller por revisar y otro pedido: el aviso largo de «Modelos en el mínimo» */
  await page.addInitScript(() => { let d; Object.defineProperty(window, '__D', { configurable: true, get: () => d, set: v => { d = v;
    (v.cat.app.modelos || []).forEach(m => { if (m.cod === '2.8.J') m.min = 2; });
    Object.values(v.rep).forEach(x => x.items.forEach(r => { if (r.eje === '2.8.J-2' && !r.res) r.lleg = '2026-10-30'; }));
    Object.values(v.ejes).forEach(e => { if (e.cod === '2.8.J-2') e.estado = 'revisar'; }); } }); });
  const err = await vigila(page); await page.goto(montar('almacen.html', 'almacen.html')); await page.waitForTimeout(1200);
  const malos = [];
  const tab = t => page.evaluate(t => [...document.querySelectorAll('#tabs button')].find(b => b.textContent.includes(t)).click(), t);
  for (const t of ['Hoy', 'Apuntar', 'Stock', 'Reponer']) {
    await tab(t); await page.waitForTimeout(350); await mira(page, t, malos);
    await dentro(page, NAV_ALM, t, malos, async () => { await tab(t); await page.waitForTimeout(200); });
  }
  await tab('Más'); await page.waitForTimeout(300);
  const tiles = await page.evaluate(() => [...document.querySelectorAll('.tile .tt')].map(x => x.textContent.trim()));
  expect(tiles.length).toBeGreaterThan(5);
  for (const t of tiles) {
    const abrir = async () => { await tab('Más'); await page.waitForTimeout(200); await page.evaluate(t => [...document.querySelectorAll('.tile .tt')].find(x => x.textContent.trim() === t).click(), t); await page.waitForTimeout(350); };
    await abrir(); await mira(page, 'Más › ' + t, malos);
    await dentro(page, NAV_ALM, 'Más › ' + t, malos, abrir);
  }
  expect(malos).toEqual([]);
  expect(err).toEqual([]);
});

test('Coladas: ningún texto aplastado en el móvil', async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: ANCHO, height: 800 });
  const err = await vigila(page); await page.goto(montar('index.html', 'coladas.html')); await page.waitForTimeout(1200);
  const malos = [];
  const tabs = await page.evaluate(() => [...document.querySelectorAll('nav button')].filter(b => b.offsetParent).map(b => b.textContent.trim()));
  for (const t of tabs) {
    const ir = async () => { await page.evaluate(t => [...document.querySelectorAll('nav button')].find(b => b.textContent.trim() === t).click(), t); await page.waitForTimeout(300); };
    await ir(); await mira(page, t, malos);
    await dentro(page, 'main .stk-t, main .seg button, main .op-tabs button', t, malos, ir);
  }
  expect(malos).toEqual([]);
  expect(err).toEqual([]);
});

for (const [quien, yo] of [['jefe', ADMIN], ['operario', OPER]]) {
  test('Limpieza (' + quien + '): ningún texto aplastado en el móvil', async ({ page }) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width: ANCHO, height: 800 });
    const { err } = await abre(page, yo);
    const malos = [];
    await mira(page, 'inicio', malos);
    const sel = '#nav button, #nav a, nav button';
    const n = await page.evaluate(s => document.querySelectorAll(s).length, sel);
    for (let i = 0; i < n; i++) {
      const t = await page.evaluate(([s, i]) => { const b = document.querySelectorAll(s)[i]; if (!b || !b.offsetParent || (b.href && !b.href.includes('#') && !b.href.includes('limpieza'))) return null; const x = b.textContent.trim().slice(0, 30); b.click(); return x; }, [sel, i]);
      if (t == null) continue;
      await page.waitForTimeout(400);
      await page.evaluate(() => document.querySelectorAll('.ov').forEach(o => o.remove()));
      await mira(page, t, malos);
    }
    expect(malos).toEqual([]);
    expect(err).toEqual([]);
  });
}

test('Inicio: ningún texto aplastado en el móvil', async ({ page }) => {
  await page.setViewportSize({ width: ANCHO, height: 800 });
  const err = await vigila(page); await page.goto(montar('inicio.html', 'inicio.html')); await page.waitForTimeout(900);
  const malos = []; await mira(page, 'Inicio', malos);
  expect(malos).toEqual([]);
  expect(err).toEqual([]);
});

test('el detector encuentra un texto aplastado (comprobación de la propia prueba)', async ({ page }) => {
  await page.setViewportSize({ width: ANCHO, height: 800 });
  await page.goto(montar('inicio.html', 'inicio.html')); await page.waitForTimeout(700);
  await page.evaluate(() => { const d = document.createElement('div'); d.style.cssText = 'width:7px;font-size:15px'; d.textContent = 'IDRA 950 L-820'; document.querySelector('main').appendChild(d); });
  const d = await desbordes(page);
  expect(d.join(' ')).toContain('texto aplastado');
});
