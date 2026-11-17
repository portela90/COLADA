// Limpieza › Investigar (solo el jefe): saturación, tiempo perdido en problemas y sitios donde se repiten.
// Datos inventados. En las pruebas «hoy» es el 31/10/2026, así que «este mes» es octubre.
const fs = require('fs');
const XLSX = require('xlsx');
const { expect, test } = require('@playwright/test');
const { abre, ADMIN, OPER } = require('./limp');
const { R } = require('./mocks/limpieza');
const { desbordes } = require('./util');

const guarda = {};
test.beforeEach(() => { ['ots_rango', 'horas_rango', 'sust_rango'].forEach(k => { guarda[k] = R[k]; }); });
test.afterEach(() => { Object.assign(R, guarda); });

let n = 0;
const ot = (f, titulo, lugar, quien, min, extra) => Object.assign({ id: 'i' + (++n), fecha: f, titulo, lugar, estado: 'hecha', origen: 'rapida', hecho_por_n: quien, minutos: min, minutos_est: null,
  tiempo_auto: false, creado: f + 'T08:30:00Z', nfotos: 1, descripcion: null, borrado: false }, extra || {});
const datos = () => [
  // F19 pierde aceite: 4 veces en octubre (y 1 en septiembre)
  ot('2026-10-05', 'Derrame de aceite', 'F19', 'Ahmed El Hait', 30), ot('2026-10-12', 'Derrame de aceite', 'F19', 'Ahmed El Hait', 30),
  ot('2026-10-19', 'Derrame de aceite', 'F19', 'Abdoul kader Maiga', 30), ot('2026-10-28', 'Derrame de aceite', 'F19', 'Ahmed El Hait', 30),
  ot('2026-09-20', 'Derrame de aceite', 'F19', 'Ahmed El Hait', 25),
  // la misma taladrina escrita de dos formas, en la F33
  ot('2026-10-07', 'Derrame taladrina', 'F33', 'Josefa Ruiz', 20), ot('2026-10-21', 'Derrame de taladrina', 'f 33', 'Josefa Ruiz', 40),
  // trabajo normal (no es problema)
  ot('2026-10-06', 'Basuras Nave 2', 'Nave 2', 'Abdoul kader Maiga', 60, { origen: 'fija' }),
  ot('2026-10-08', 'Cambiar bidón de taladrina Ecocool', 'Nave 1', 'Ahmed El Hait', 20)];

test('Investigar: tipos de problema, sitios que se repiten, ficha y Excel', async ({ page }) => {
  R.ots_rango = datos(); R.horas_rango = []; R.sust_rango = [];
  const { err } = await abre(page, ADMIN, '?ir=investigar');
  const tipos = page.locator('#invTipos');
  await expect(tipos.locator('tr', { hasText: 'Fugas y derrames de aceite' })).toContainText('4');
  await expect(tipos.locator('tr', { hasText: 'Fugas y derrames de aceite' })).toContainText('2 h');
  await expect(tipos.locator('tr', { hasText: 'Fugas y derrames de taladrina' })).toContainText('2');
  await expect(tipos).not.toContainText('Cambiar bidón');
  const rep = page.locator('#invRep');
  await expect(rep).toContainText('F19 · Fugas y derrames de aceite');
  await expect(rep).toContainText('4 veces · 2 h de limpieza · una cada 7,7 días');
  await expect(rep).toContainText('F33 · Fugas y derrames de taladrina'); // «F33» y «f 33» son el mismo sitio
  await expect(page.locator('#invSat')).toContainText('Ahmed El Hait');
  expect(await desbordes(page)).toEqual([]);
  // ficha de la F19
  await rep.locator('button', { hasText: 'F19' }).click(); await page.waitForTimeout(300);
  const d = page.locator('.ov').last();
  await expect(d).toContainText('F19 ha tenido 4 fugas o derrames de aceite entre el 05/10/2026 y el 28/10/2026: una cada 7,7 días de media. Se han empleado 2 h en limpiarlas.');
  await expect(d.locator('tbody tr')).toHaveCount(4);
  const [dl] = await Promise.all([page.waitForEvent('download'), d.getByRole('button', { name: 'Excel' }).click()]);
  const wb = XLSX.read(fs.readFileSync(await dl.path()));
  expect(XLSX.utils.sheet_to_json(wb.Sheets['Repeticiones']).map(r => r['Fecha'])).toEqual(['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-28']);
  expect(err.filter(e => !/jspdf|autoTable/i.test(e))).toEqual([]);
});

test('Investigar: saturación = tiempo en trabajos / horas de jornada', async ({ page }) => {
  R.ots_rango = datos(); R.horas_rango = []; R.sust_rango = [];
  const { err } = await abre(page, ADMIN, '?ir=investigar');
  // octubre hasta el 31: 22 días laborables × 8 h = 176 h de jornada (horario de prueba de lunes a viernes, 6:00–14:00)
  const fila = page.locator('#invSat tr', { hasText: 'Ahmed El Hait' });
  await expect(fila).toContainText('176 h'); await expect(fila).toContainText('1 h 50 min'); await expect(fila).toContainText('1 %');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Excel', exact: true }).click()]);
  const wb = XLSX.read(fs.readFileSync(await dl.path()));
  const ah = XLSX.utils.sheet_to_json(wb.Sheets['Saturación']).find(r => r['Persona'] === 'Ahmed El Hait');
  expect(ah['Jornada (h)']).toBe(176); expect(ah['En trabajos (h)']).toBe(1.8); expect(ah['En problemas (h)']).toBe(1.5);
  expect(err.filter(e => !/jspdf|autoTable/i.test(e))).toEqual([]);
});

test('Investigar: el operario no la tiene', async ({ page }) => {
  const { err } = await abre(page, OPER, '?ir=investigar');
  await expect(page.locator('#invSat')).toHaveCount(0);
  expect(err).toEqual([]);
});
