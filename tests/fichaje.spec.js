// Limpieza: fichaje (registro de jornada) y coste de cada trabajo. Todo simulado (las llamadas se interceptan).
const { test, expect } = require('@playwright/test');
const { abre, ADMIN, OPER } = require('./limp');
const { R } = require('./mocks/limpieza');
const { desbordes } = require('./util');
const F0 = { activo: true, estado: 'fuera', fichajes: [], minutos: 0 };
const F1 = { activo: true, estado: 'dentro', fichajes: [{ id: 'f1', tipo: 'entrada', cuando: '2026-10-31T06:02:00Z', origen: 'app', anulado: false }], minutos: 240 };
const MES = { activo: true, trabajadores: [{ trabajador: 'w2', nombre: 'Abdoul kader Maiga', horas_contrato: 40, dias: [
  { fecha: '2026-10-30', minutos: 470, fichajes: [{ id: 'a', tipo: 'entrada', cuando: '2026-10-30T05:00:00Z', origen: 'app', anulado: false }, { id: 'b', tipo: 'salida', cuando: '2026-10-30T13:10:00Z', origen: 'corregido', anulado: false }, { id: 'c', tipo: 'salida', cuando: '2026-10-30T15:00:00Z', origen: 'app', anulado: true, motivo: 'Se le olvidó' }] }] }] };
test('operario: ficha la entrada arriba del Día y ve sus fichajes', async ({ page }) => {
  R.fichaje_hoy = F0; R.fichar = F1; R.fichajes_mes = MES;
  await page.setViewportSize({ width: 390, height: 844 });
  const { err, llamadas } = await abre(page, OPER); await page.waitForTimeout(600);
  const c = page.locator('.fich'); await expect(c).toBeVisible(); await expect(c).toContainText('Sin fichar hoy');
  await c.locator('button', { hasText: 'Fichar entrada' }).click(); await page.waitForTimeout(400);
  expect(llamadas.find(x => x[0] === 'fichar')[1].p_tipo).toBe('entrada');
  await expect(page.locator('.fich')).toContainText('Estás trabajando'); await expect(page.locator('.fich')).toContainText('4 h 00 min');
  await page.locator('.fich button', { hasText: 'Mis fichajes' }).click(); await page.waitForTimeout(400);
  await expect(page.locator('.dlg')).toContainText('7 h 50 min');
  expect(await desbordes(page)).toEqual([]); expect(err).toEqual([]);
  delete R.fichaje_hoy; delete R.fichar; delete R.fichajes_mes;
});
test('jefe: registro de jornada en Equipo (con correcciones marcadas) y coste de cada trabajo en Resumen', async ({ page }) => {
  R.fichaje_hoy = Object.assign({}, F0, { activo: false }); R.fichajes_mes = MES;
  R.limp_costes = { coste_hora: 18, hay_productos: true, hay_hora: true, filas: [{ clave: 'F25', nombre: 'Inyectora F25', n: 12, min: 600, n_est: 1, n_receta: 4, eur_mo: 180, eur_prod: 42.5, total: 222.5 }] };
  R.limp_costes_opciones = { productos: [{ id: 'p1', nombre: 'Desengrasante', ud: 'l', precio: 3.2, activo: true }], receta: [], elementos: [{ id: 'e1', nombre: 'F25 · Inyectora F25' }], habituales: [], fijas: [], coste_hora: 18 };
  await page.setViewportSize({ width: 1280, height: 900 });
  const { err, llamadas } = await abre(page, ADMIN);
  await page.evaluate(() => [...document.querySelectorAll('#nav button')].find(b => b.textContent.includes('Equipo')).click()); await page.waitForTimeout(1200);
  const j = page.locator('.card', { hasText: 'Registro de jornada' }); await expect(j).toContainText('Abdoul kader Maiga'); await expect(j).toContainText('Apagar fichaje');
  await j.locator('summary').first().click(); await expect(j).toContainText('14:10*'); await expect(j).toContainText('1 anulado');
  await page.evaluate(() => [...document.querySelectorAll('#nav button')].find(b => b.textContent.includes('Resumen')).click()); await page.waitForTimeout(1500);
  const k = page.locator('.card', { hasText: 'Coste de cada trabajo' }); await expect(k).toContainText('Inyectora F25'); await expect(k).toContainText('222,5 €'); await expect(k).toContainText('18 €/hora'); await expect(k).toContainText('Productos de limpieza'); await expect(k).toContainText('4 con gasto propio');
  await k.locator('button', { hasText: 'Gasto de cada trabajo' }).click(); await page.waitForTimeout(400);
  const d = page.locator('.dlg', { hasText: 'Gasto de cada trabajo' }); await d.locator('button', { hasText: '＋ Producto' }).click();
  await d.locator('.prod-l input').fill('0,2'); await d.locator('button', { hasText: 'Guardar' }).click(); await page.waitForTimeout(400);
  const g = llamadas.find(x => x[0] === 'limp_receta_guardar')[1]; expect(g.p_ambito).toBe('hora'); expect(g.p_items).toEqual([{ producto: 'p1', cant: 0.2 }]);
  expect(err).toEqual([]);
  delete R.fichaje_hoy; delete R.fichajes_mes; delete R.limp_costes; delete R.limp_costes_opciones;
});
