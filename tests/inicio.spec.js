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
