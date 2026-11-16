// Limpieza: quien cubre a otro hace la jornada del que falta; sus propios trabajos no se hacen esos días.
// Las horas de más salen solas en «Horas del día», suman a la bolsa y salen justificadas en el Excel del mes.
const fs = require('fs');
const { expect, test } = require('@playwright/test');
const { abre, ADMIN } = require('./limp');
const { R } = require('./mocks/limpieza');

const guarda = {};
test.beforeEach(() => { ['trabajadores_admin', 'sust_rango', 'horas_dia_leer', 'horas_rango', 'ots_dia', 'ots_rango'].forEach(k => { guarda[k] = R[k]; }); });
test.afterEach(() => { Object.assign(R, guarda); });

// Ahmed (w3) cubre a Josefa (w4) del martes 20 al viernes 23/10/2026. Josefa hace 9 h; Ahmed 8 h y el martes libra.
const preparar = () => {
  const h8 = [['06:00', '14:00']], h9 = [['06:00', '15:00']];
  R.trabajadores_admin = guarda.trabajadores_admin.map(w => w.id === 'w3' ? Object.assign({}, w, { horario: { lunes: h8, martes: [], miercoles: h8, jueves: h8, viernes: h8, sabado: [], domingo: [] } })
    : w.id === 'w4' ? Object.assign({}, w, { horario: { lunes: h9, martes: h9, miercoles: h9, jueves: h9, viernes: h9, sabado: [], domingo: [] } }) : w);
  R.sust_rango = [{ id: 's1', ausente: 'w4', ausente_n: 'Josefa Ruiz', sustituto: 'w3', sustituto_n: 'Ahmed El Hait', desde: '2026-10-20', hasta: '2026-10-23', motivo: 'Baja' }];
  R.horas_rango = [];
};

test('Horas del día: a quien cubre le salen las horas del que falta y la diferencia, justificada', async ({ page }) => {
  preparar();
  R.horas_dia_leer = R.trabajadores_admin.filter(w => w.rol !== 'admin').map(w => ({ id: w.id, nombre: w.nombre, jornada: 'completa', horario: w.horario.miercoles, trabajadas: null, fuera: 0, falta: null }));
  R.sust_rango = [Object.assign({}, R.sust_rango[0], { hasta: '2026-10-31' })]; // en las pruebas «hoy» es el 31/10
  const { err } = await abre(page, ADMIN);
  await page.getByRole('button', { name: 'Horas del día' }).click(); await page.waitForTimeout(500);
  const d = page.locator('.ov').last();
  const fila = d.locator('.ot', { hasText: 'Ahmed El Hait' });
  await expect(fila).toContainText('Sustituye a Josefa Ruiz (baja): 1 h por sustitución, justificadas');
  await expect(fila.locator('input').first()).toHaveValue('9');
  await expect(d.locator('.ot', { hasText: 'Abdoul' }).locator('input').first()).toHaveValue('8');
  expect(err).toEqual([]);
});

test('Excel del mes y detalle: horas por sustitución justificadas y dentro de lo trabajado', async ({ page }) => {
  preparar(); R.ots_rango = [];
  const { err } = await abre(page, ADMIN, '?ir=resumen');
  const lee = async nombre => { const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: nombre }).click()]); return fs.readFileSync(await dl.path(), 'utf8').replace(/^\uFEFF/, '').split('\r\n').map(l => l.split(';')); };
  const X = await lee('Descargar horas del mes');
  const col = X[0].indexOf('Horas por sustitución (justificadas)'); expect(col).toBeGreaterThan(0);
  const ah = X.find(r => r[0] === 'Ahmed El Hait');
  // martes libra: 9 h; miércoles a viernes: 1 h cada día
  expect(ah[col]).toBe('12');
  const jo = X.find(r => r[0] === 'Josefa Ruiz'); expect(jo[col]).toBe('0');
  // lo trabajado de Ahmed lleva esas horas (octubre hasta el 31: 8 h × días de su horario + 12)
  const tr = X[0].indexOf('Horas trabajadas'); expect(+ah[tr].replace(',', '.')).toBeGreaterThan(12);
  const Dt = await lee('Detalle para justificar');
  const ls = Dt.filter(r => r[1] === 'Ahmed El Hait');
  expect(ls.map(r => r[0])).toEqual(['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23']);
  const cs = Dt[0].indexOf('Horas por sustitución (h)');
  expect(ls.map(r => r[cs])).toEqual(['9', '1', '1', '1']);
  expect(ls[0].join(' ')).toContain('Sustituye a Josefa Ruiz (baja)');
  expect(err).toEqual([]);
});

test('Día: el trabajo que no se hace por estar cubriendo sale marcado para el jefe', async ({ page }) => {
  R.ots_dia = Object.assign({}, guarda.ots_dia, { dia: guarda.ots_dia.dia.map((o, i) => i === 0 ? Object.assign({}, o, { no_se_hace: 'Abdoul sustituye a Josefa Ruiz' }) : o) });
  const { err } = await abre(page, ADMIN);
  await expect(page.locator('.ot', { hasText: guarda.ots_dia.dia[0].titulo }).first()).toContainText('No se hace: Abdoul sustituye a Josefa Ruiz');
  expect(err).toEqual([]);
});
