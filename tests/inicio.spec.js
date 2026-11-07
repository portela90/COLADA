// Inicio: salen los mosaicos con los números de Almacén y Coladas.
const { test, expect } = require('@playwright/test');
const { montar, vigila, desbordes } = require('./util');
test('mosaicos con datos, en móvil y en ordenador', async ({ page }) => {
  const url = montar('inicio.html', 'inicio.html');
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(700);
  expect(await page.locator('.ini-t').count()).toBeGreaterThanOrEqual(12);
  await expect(page.locator('.ini-t', { hasText: 'Bajar a planta' })).toContainText('10');
  expect(await desbordes(page)).toEqual([]);
  await page.setViewportSize({ width: 1280, height: 860 }); await page.waitForTimeout(200);
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});
test('mosaicos con comparativa frente al mes pasado y gráfica de 6 meses', async ({ page }) => {
  const url = montar('inicio.html', 'inicio.html');
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(700);
  const pist = page.locator('.ini-t', { hasText: 'Cambios este mes' });
  await expect(pist.locator('.tcmp')).toContainText('▲ 40 %'); await expect(pist.locator('.tcmp')).toHaveClass(/mal/);
  await expect(pist.locator('.tcmp')).toContainText('vs. mes pasado'); await expect(pist.locator('.tcmp')).toHaveAttribute('title', /1–31 de sep/);
  await expect(pist.locator('.tspark rect')).toHaveCount(6);
  const g = page.locator('.ini-t', { hasText: 'Gasto del mes' });
  await expect(g).toContainText('1840'); await expect(g.locator('.tcmp')).toContainText('▼ 20 %'); await expect(g.locator('.tcmp')).toHaveClass(/bien/);
  const c = page.locator('.ini-t', { hasText: 'Consumo del mes' });
  await expect(c.locator('.tcmp')).toContainText('▲ 20 %'); await expect(c.locator('.tcmp')).not.toHaveClass(/mal|bien/);
  await expect(page.locator('.ini-t', { hasText: 'Entradas del mes' }).locator('.tcmp')).toContainText('no había nada');
  expect(await desbordes(page)).toEqual([]);
  await page.setViewportSize({ width: 1280, height: 860 }); await page.waitForTimeout(200);
  expect(await desbordes(page)).toEqual([]);
  await page.screenshot({ path: process.env.CAPDIR ? process.env.CAPDIR + '/inicio-cmp.png' : 'test-results/inicio-cmp.png', fullPage: true });
  expect(err).toEqual([]);
});
test('Inicio a tu gusto: ocultar un mosaico y cambiar el orden se guarda', async ({ page }) => {
  const url = montar('inicio.html', 'inicio.html');
  const err = await vigila(page); await page.goto(url); await page.waitForTimeout(700);
  await page.locator('button', { hasText: 'Personalizar' }).click(); await page.waitForTimeout(200);
  const d = page.locator('.dlg', { hasText: 'Personalizar Inicio' });
  await d.locator('.ini-pf', { hasText: 'Cuarentena' }).locator('input[type=checkbox]').uncheck();
  await d.locator('.ini-pf', { hasText: 'Pistones usados' }).locator('button[aria-label^="Subir"]').click();
  await d.locator('button', { hasText: 'Guardar' }).click(); await page.waitForTimeout(300);
  await expect(page.locator('.ini-t', { hasText: 'Ejes rotos o agarrotados' })).toHaveCount(0);
  const orden = await page.locator('.ini-grp').first().locator('.ini-t .tt').allInnerTexts();
  expect(orden.indexOf('Pistones usados')).toBeLessThan(orden.indexOf('Gasto del mes'));
  await page.reload(); await page.waitForTimeout(700);
  await expect(page.locator('.ini-t', { hasText: 'Ejes rotos o agarrotados' })).toHaveCount(0);
  expect(await desbordes(page)).toEqual([]); expect(err).toEqual([]);
});
test('Actividad reciente: lo último de Coladas y Almacén en palabras, juntando lo hecho de golpe', async ({ page }) => {
  const url = montar('inicio.html', 'inicio.html');
  await page.addInitScript(() => {
    const ahora = Date.now(), at = m => new Date(ahora - m * 60000).toISOString();
    const filas = [
      { id: 1, at: at(5), quien: 'Beatriz', col: 'alm_mov', op: 'alta', d: { tipo: 'salida', cant: 2, art: 'a1' }, art_nom: 'Pistonwax dúo 15', maq_cod: 'F28' },
      { id: 2, at: at(30), quien: 'Cristian', col: 'alm_mov', op: 'alta', d: { tipo: 'ajuste', cant: 1, contado: 30 }, art_nom: 'Cotón' },
      { id: 3, at: at(30), quien: 'Cristian', col: 'alm_mov', op: 'alta', d: { tipo: 'ajuste', cant: 4, contado: 3 }, art_nom: 'Insural 800' },
      { id: 4, at: at(30), quien: 'Cristian', col: 'alm_mov', op: 'alta', d: { tipo: 'ajuste', cant: -1, contado: 9 }, art_nom: 'Granalla S110' },
      { id: 5, at: at(90), quien: 'Cristian', col: 'alm_pist', op: 'alta', d: { diam: 'Ø 80', motivo: 'DESGASTE' }, maq_cod: 'F67' },
      { id: 6, at: at(200), quien: null, col: 'mov', op: 'alta', d: { t: 'C', fa: 2, u: 'Mañana', f: '2026-11-05', por: 'Abdoul' }, lote_nom: 'C24952' },
      { id: 7, at: at(60 * 30), quien: 'Cristian', col: 'alm_aver', op: 'cambio', d: { estado: 'cerrada', t: 'Pistón agarrotado' }, antes: { estado: 'abierta' }, maq_cod: 'F15' }];
    window.__actRpc = 0;
    Object.defineProperty(window, 'sbColada', { configurable: true, get: () => ({ rpc: async (f) => { if (f === 'actividad_reciente') { window.__actRpc++; return { data: filas }; } return { data: [] }; }, from: () => ({}) }), set: () => {} });
  });
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  const c = page.locator('.card.act');
  await expect(c.locator('h2')).toHaveText('Actividad reciente');
  const it = c.locator('.act-it');
  await expect(it).toHaveCount(5);
  await expect(it.nth(0)).toContainText('Salida de 2 · Pistonwax dúo 15 para la F28');
  await expect(it.nth(0)).toContainText('Beatriz · '); await expect(it.nth(0)).toContainText(' · Almacén');
  await expect(it.nth(1)).toContainText('Ajuste de stock · Cotón (contado 30) y 2 ajustes de stock más');
  await expect(it.nth(2)).toContainText('Cambio de pistón Ø 80 en la F67 · desgaste');
  await expect(it.nth(3)).toContainText('Consumo de 2 fardos · colada C24952 · relevo Mañana · 05/11');
  await expect(it.nth(3)).toContainText('Abdoul · '); await expect(it.nth(3)).toContainText(' · Coladas');
  await expect(it.nth(4)).toContainText('Avería cerrada en la F15: Pistón agarrotado');

  await expect(it.nth(0)).toHaveAttribute('href', 'almacen.html?t=mov');
  /* al repintar Inicio no se vuelve a pedir */
  await page.waitForTimeout(300); expect(await page.evaluate(() => window.__actRpc)).toBe(1);
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});
test('Mis trabajos: tablero privado (solo el administrador), añadir, mover de columna y cambiar', async ({ page }) => {
  const url = montar('inicio.html', 'inicio.html');
  await page.addInitScript(() => {
    window.yoAdmin = () => true; window.yoId = () => 'u-cris';
    const T = window.__mt = [{ id: 't1', titulo: 'Probar las aprobaciones con Bea', col: 'pend', prio: 1, orden: 1, limite: '2026-10-30', app: 'Almacén' },
      { id: 't2', titulo: 'Kanban de averías', col: 'marcha', prio: 0, orden: 2 }, { id: 't3', titulo: 'Campana', col: 'hecho', prio: 0, orden: 3, hecho_en: '2026-10-29T10:00:00Z' }];
    let n = 10;
    const tabla = () => { const st = { op: 'select' }; const o = {
      select: () => { if (st.op === 'insert') st.ret = true; return o; }, order: () => o,
      eq: (k, v) => { st.eq = v; return o; },
      update: p => { st.op = 'update'; st.p = p; return o; }, insert: p => { st.op = 'insert'; st.p = p; return o; }, delete: () => { st.op = 'delete'; return o; },
      then: (ok, ko) => { let data = null;
        if (st.op === 'select') data = T.slice();
        if (st.op === 'update') { Object.assign(T.find(x => x.id === st.eq), st.p); }
        if (st.op === 'insert') { const x = Object.assign({ id: 'n' + (n++), prio: 0, nota: null, app: null, limite: null }, st.p); T.push(x); data = [x]; }
        if (st.op === 'delete') { const i = T.findIndex(x => x.id === st.eq); T.splice(i, 1); }
        return Promise.resolve({ data, error: null }).then(ok, ko); } }; return o; };
    Object.defineProperty(window, 'sbColada', { configurable: true, get: () => ({ from: t => t === 'mis_tareas' ? tabla() : tabla(), rpc: async () => ({ data: [] }) }), set: () => {} });
  });
  const err = await vigila(page);
  await page.goto(url); await page.waitForTimeout(900);
  const r = page.locator('.card.mt-res');
  await expect(r).toContainText('solo lo ves tú');
  await expect(r.locator('.mt-cif').first()).toContainText('1Pendiente');
  await expect(r.locator('.mt-cif.mal')).toContainText('1para hoy o vencidos');
  await r.locator('button', { hasText: 'Abrir el tablero' }).click(); await page.waitForTimeout(300);
  const tb = page.locator('.mt-ov');
  await expect(tb.locator('.mt-col')).toHaveCount(4);
  await expect(tb.locator('.mt-col[data-c="pend"] .mt-c')).toContainText('Probar las aprobaciones con Bea');
  await expect(tb.locator('.mt-col[data-c="pend"] .mt-c')).toContainText('Vencido 30/10');
  /* añadir en Pendiente */
  await tb.locator('.mt-col[data-c="pend"] .mt-in').fill('Enlace para compartir informes'); await tb.locator('.mt-col[data-c="pend"] .mt-in').press('Enter'); await page.waitForTimeout(300);
  await expect(tb.locator('.mt-col[data-c="pend"] .mt-c')).toHaveCount(2);
  /* pasar a En marcha con › */
  await tb.locator('.mt-c', { hasText: 'Enlace para compartir' }).locator('button[aria-label="Pasar a En marcha"]').click(); await page.waitForTimeout(300);
  await expect(tb.locator('.mt-col[data-c="marcha"] .mt-c')).toHaveCount(2);
  expect(await page.evaluate(() => window.__mt.find(x => x.titulo === 'Enlace para compartir informes').col)).toBe('marcha');
  /* arrastrar Kanban de averías a Hecho (en el ordenador) */
  await page.setViewportSize({ width: 1280, height: 800 }); await page.waitForTimeout(200);
  await tb.locator('.mt-c', { hasText: 'Kanban de averías' }).dragTo(tb.locator('.mt-col[data-c="hecho"]')); await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__mt.find(x => x.id === 't2').col)).toBe('hecho');
  /* cambiar uno */
  await tb.locator('.mt-c', { hasText: 'Probar las aprobaciones' }).locator('.mt-t').click(); await page.waitForTimeout(200);
  await page.locator('#mtN').fill('Con una salida de 400 €'); await page.locator('#mtP').selectOption('2'); await page.locator('#mtL').fill('2026-11-15');
  await page.locator('.rgx-pieb button', { hasText: 'Guardar' }).click(); await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__mt.find(x => x.id === 't1'))).toMatchObject({ nota: 'Con una salida de 400 €', prio: 2, limite: '2026-11-15' });
  await expect(tb.locator('.mt-c.urg')).toContainText('Urgente');
  expect(await desbordes(page)).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(200); expect(await desbordes(page)).toEqual([]);
  if (process.env.CAPT) { await page.emulateMedia({ colorScheme: 'dark' }); await page.waitForTimeout(200); await page.screenshot({ path: process.env.CAPT + '/mt.png' }); }
  await page.locator('.mt-top button', { hasText: 'Cerrar' }).click();
  if (process.env.CAPT) { await page.waitForTimeout(300); await page.screenshot({ path: process.env.CAPT + '/ini.png' }); }
  await expect(page.locator('.card.mt-res .mt-cif').nth(1)).toContainText('1En marcha');
  expect(err).toEqual([]);
});
test('Mis trabajos: no sale a quien no es el administrador', async ({ page }) => {
  const url = montar('inicio.html', 'inicio.html');
  await page.addInitScript(() => { window.yoAdmin = () => false; });
  await page.goto(url); await page.waitForTimeout(700);
  await expect(page.locator('.card.mt-res')).toHaveCount(0);
});
