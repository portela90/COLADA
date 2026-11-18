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

test('Investigar: huecos cortos cuentan como desplazamiento y los tiempos que no cuadran se ajustan', async ({ page }) => {
  const r = (f, t, q, ini, fin, extra) => Object.assign(ot(f, t, 'Nave 1', q, (Date.parse(f + 'T' + fin + ':00Z') - Date.parse(f + 'T' + ini + ':00Z')) / 60000,
    { inicio: f + 'T' + ini + ':00Z', fin: f + 'T' + fin + ':00Z', origen: 'fija' }), extra || {});
  R.ots_rango = [
    // miércoles 14/10, Ahmed: 1 h, hueco de 20 min (cuenta), 40 min, hueco de 1 h (no cuenta), 30 min
    r('2026-10-14', 'Basuras Nave 1', 'Ahmed El Hait', '06:00', '07:00'), r('2026-10-14', 'Fregar pasillo', 'Ahmed El Hait', '07:20', '08:00'),
    r('2026-10-14', 'Vaciar viruta', 'Ahmed El Hait', '09:00', '09:30'),
    // jueves 15/10, Ahmed: se quedó abierto 10 h (previsto 30 min)
    r('2026-10-15', 'Fregar comedor', 'Ahmed El Hait', '06:00', '16:00', { minutos_est: 30 }),
    // viernes 16/10, Abdoul: dos bloques de 8 h del Excel del fin de semana
    r('2026-10-16', 'Suelo taller', 'Abdoul kader Maiga', '06:00', '14:00', { origen: 'excel' }), r('2026-10-16', 'Cámaras de inyección', 'Abdoul kader Maiga', '06:00', '14:00', { origen: 'excel' }),
    // domingo 18/10, Josefa: no tiene jornada
    r('2026-10-18', 'Limpieza F19', 'Josefa Ruiz', '06:00', '07:00')];
  R.horas_rango = []; R.sust_rango = [];
  const { err } = await abre(page, ADMIN, '?ir=investigar');
  const ah = page.locator('#invSat tr', { hasText: 'Ahmed El Hait' });
  await expect(ah).toContainText('2 h 40 min'); // 1 h + 40 min + 30 min + 30 min (el abierto cuenta lo previsto)
  await expect(ah).toContainText('20 min');     // desplazamiento y preparación
  const ab = page.locator('#invSat tr', { hasText: 'Abdoul kader Maiga' });
  await expect(ab).toContainText('16 h'); // apuntado
  await page.locator('#invRaros summary').click();
  const raros = page.locator('#invRaros');
  await expect(raros.locator('tr', { hasText: 'Fregar comedor' })).toContainText('más de 8 h abierto: se cuenta lo previsto');
  await expect(raros.locator('tr', { hasText: 'Abdoul kader Maiga' })).toContainText('del Excel del fin de semana');
  await expect(raros.locator('tr', { hasText: 'Josefa Ruiz' })).toContainText('día sin horas de jornada');
  // Abdoul: el viernes cuenta su jornada (8 h), no 16 h
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Excel', exact: true }).click()]);
  const wb = XLSX.read(fs.readFileSync(await dl.path()));
  const S = XLSX.utils.sheet_to_json(wb.Sheets['Saturación']);
  const fa = S.find(x => x['Persona'] === 'Abdoul kader Maiga'), fh = S.find(x => x['Persona'] === 'Ahmed El Hait');
  expect(fa['Saturación (%)']).toBe(Math.round(480 * 100 / (176 * 60)));
  expect(fh['Desplazamiento y preparación (h)']).toBe(0.3);
  expect(XLSX.utils.sheet_to_json(wb.Sheets['No cuadran']).length).toBe(3);
  expect(await desbordes(page)).toEqual([]);
  expect(err.filter(e => !/jspdf|autoTable/i.test(e))).toEqual([]);
});

test('Investigar: avisa de quien no tiene ningún trabajo a su nombre y da la saturación de quien apunta', async ({ page }) => {
  R.ots_rango = [ot('2026-10-05', 'Derrame de aceite', 'F19', 'Ahmed El Hait', 240)]; R.horas_rango = []; R.sust_rango = [];
  const { err } = await abre(page, ADMIN, '?ir=investigar');
  const av = page.locator('#invSat .aviso');
  await expect(av).toContainText('2 personas no tienen ningún trabajo apuntado a su nombre: Abdoul kader Maiga, Josefa Ruiz');
  await expect(av).toContainText('la de quien sí apunta es 2 %'); // 4 h de 176 h
  await expect(page.locator('.kpis')).toContainText('De quien apunta sus trabajos');
  expect(err).toEqual([]);
});

test('Investigar: el operario no la tiene', async ({ page }) => {
  const { err } = await abre(page, OPER, '?ir=investigar');
  await expect(page.locator('#invSat')).toHaveCount(0);
  expect(err).toEqual([]);
});

test('Pregúntale: entiende la pregunta y contesta con la cifra, la tabla y los trabajos', async ({ page }) => {
  R.ots_rango = datos(); R.horas_rango = []; R.sust_rango = [];
  const { err } = await abre(page, ADMIN, '?ir=investigar');
  const pregunta = async q => { await page.fill('#invQ', q); await page.locator('#invPreg').getByRole('button', { name: 'Preguntar' }).click(); await page.waitForTimeout(400); return page.locator('#invResp'); };
  let r = await pregunta('¿Cuántas veces ha perdido aceite la F19 este mes?');
  await expect(r).toContainText('Dónde: F19'); await expect(r).toContainText('Problema: Fugas y derrames de aceite');
  await expect(r).toContainText('en la F19 este mes: 4 veces, 2 h');
  await expect(r).toContainText('Ver los 4 trabajos');
  r = await pregunta('¿Quién tarda más en los derrames de taladrina?');
  await expect(r).toContainText('El que más: Josefa Ruiz (30 min)');
  r = await pregunta('¿Qué máquinas pierden más aceite?');
  await expect(r.locator('tbody tr').first()).toContainText('F19');
  r = await pregunta('Saturación de Ahmed este mes');
  await expect(r).toContainText('Persona: Ahmed El Hait'); await expect(r).toContainText('Saturación de Ahmed El Hait este mes: 1 %');
  r = await pregunta('derrames de aceite en septiembre');
  await expect(r).toContainText('Periodo: septiembre'); await expect(r).toContainText('septiembre: 1 vez');
  r = await pregunta('¿En qué se va el tiempo los lunes?');
  await expect(r).toContainText('Día: Lunes'); await expect(r.locator('tbody tr').first()).toContainText('Derrame de aceite');
  r = await pregunta('¿Cuántas veces se ha limpiado el xilofono?');
  await expect(r).toContainText('No encuentro trabajos con «xilofono»');
  r = await pregunta('¿Quién no pulsa Empezar?');
  await expect(r).toContainText('Quien menos pulsa «Empezar»');
  expect(await desbordes(page)).toEqual([]);
  // Excel de la respuesta
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Excel de esta respuesta' }).click()]);
  const wb = XLSX.read(fs.readFileSync(await dl.path()));
  expect(XLSX.utils.sheet_to_json(wb.Sheets['Respuesta'], { header: 1 })[0]).toEqual(['Pregunta', '¿Quién no pulsa Empezar?']);
  expect(err.filter(e => !/jspdf|autoTable/i.test(e))).toEqual([]);
});

test('Enséñale: el diccionario cambia cómo entiende las preguntas, favoritas y «No es lo que quería»', async ({ page }) => {
  R.ots_rango = datos().concat([ot('2026-10-09', 'Derrame de taladrina', 'PUNTO DE CONSUMO JUNTO A M3', 'Josefa Ruiz', 20), ot('2026-10-16', 'Derrame de taladrina', 'Punto de consumo junto a M3', 'Josefa Ruiz', 20),
    ot('2026-10-23', 'Derrame de taladrina', 'M3', 'Josefa Ruiz', 20)]);
  R.horas_rango = []; R.sust_rango = [];
  const g = R.inv_dic_listar;
  R.inv_dic_listar = [{ id: 'd1', tipo: 'persona', palabra: 'jose', valor: 'Josefa Ruiz' }, { id: 'd2', tipo: 'lugar', palabra: 'punto de consumo junto a m3', valor: 'Punto de consumo M3' },
    { id: 'd3', tipo: 'problema', palabra: 'pringue', valor: 'aceite' }, { id: 'd4', tipo: 'favorita', palabra: 'saturación de cada uno este mes' }];
  try {
    const { err, llamadas } = await abre(page, ADMIN, '?ir=investigar');
    const pregunta = async q => { await page.fill('#invQ', q); await page.locator('#invPreg').getByRole('button', { name: 'Preguntar' }).click(); await page.waitForTimeout(400); return page.locator('#invResp'); };
    let r = await pregunta('derrames en el punto de consumo de la m3');
    await expect(r).toContainText('Dónde: Punto de consumo M3'); await expect(r).toContainText('2 veces');
    r = await pregunta('derrames de taladrina en la m3');
    await expect(r).toContainText('Dónde: M3'); await expect(r).toContainText('1 vez');
    r = await pregunta('cuánto pringue en la F19');
    await expect(r).toContainText('Problema: Fugas y derrames de aceite'); await expect(r).toContainText('4 veces');
    r = await pregunta('cuántos derrames ha limpiado jose');
    await expect(r).toContainText('Persona: Josefa Ruiz');
    // el sitio sale con su nombre enseñado
    await expect(page.locator('#invRep')).toContainText('Punto de consumo M3 · Fugas y derrames de taladrina');
    // favorita como botón
    await expect(page.locator('#invPreg .chip', { hasText: '☆ saturación de cada uno este mes' })).toBeVisible();
    // no es lo que quería
    await r.getByRole('button', { name: 'No es lo que quería' }).click(); await page.waitForTimeout(200);
    await page.locator('.ov').last().locator('textarea').fill('Quería solo los de aceite'); await page.locator('.ov').last().getByRole('button', { name: 'Enviar' }).click(); await page.waitForTimeout(300);
    const pg = llamadas.filter(x => x[0] === 'inv_preg_guardar');
    expect(pg.map(x => x[1].p.q)).toContain('cuántos derrames ha limpiado jose'); expect(pg.some(x => x[1].p.ok === false && x[1].p.queria === 'Quería solo los de aceite')).toBe(true);
    // el diccionario se ve y se puede ampliar
    await page.locator('#invPreg').getByRole('button', { name: 'Enséñale' }).click(); await page.waitForTimeout(300);
    await expect(page.locator('.ov').last()).toContainText('«pringue» → Fugas y derrames de aceite');
    expect(await desbordes(page)).toEqual([]);
    expect(err.filter(e => !/jspdf|autoTable/i.test(e))).toEqual([]);
  } finally { R.inv_dic_listar = g; }
});

test('Ronda 2: «el finde» son sábado y domingo, y la Nave 1 no incluye el horno de fusión', async ({ page }) => {
  R.ots_rango = [ot('2026-10-10', 'Derrame de aceite', 'Nave 1', 'Ahmed El Hait', 30), ot('2026-10-11', 'Derrame de aceite', 'Nave 1', 'Ahmed El Hait', 30),
    ot('2026-10-12', 'Derrame de aceite', 'Nave 1', 'Ahmed El Hait', 30), ot('2026-10-13', 'Derrame de aceite', 'Horno fusión Nave 1', 'Ahmed El Hait', 30),
    ot('2026-10-14', 'Derrame de aceite', 'Horno fusión Nave 2', 'Ahmed El Hait', 30)];
  R.horas_rango = []; R.sust_rango = [];
  const { err } = await abre(page, ADMIN, '?ir=investigar');
  const pregunta = async q => { await page.fill('#invQ', q); await page.locator('#invPreg').getByRole('button', { name: 'Preguntar' }).click(); await page.waitForTimeout(400); return page.locator('#invResp'); };
  let r = await pregunta('derrames de aceite el finde');
  await expect(r).toContainText('Día: Sábado y Domingo'); await expect(r).toContainText('2 veces');
  r = await pregunta('derrames de aceite en la nave 1');
  await expect(r).toContainText('3 veces');
  r = await pregunta('derrames en el horno de fusión de la nave 1');
  await expect(r).toContainText('Dónde: Horno fusión Nave 1'); await expect(r).toContainText('1 vez');
  expect(err.filter(e => !/jspdf|autoTable/i.test(e))).toEqual([]);
});

test('Ronda 3: Brother y Moriz es una zona, los hornos AlSi12 suman a la Nave 1 y el grupo «hornos»', async ({ page }) => {
  const g = R.inv_dic_listar;
  R.inv_dic_listar = [
    { id: 'r1', tipo: 'lugar', palabra: 'brother y moriz', valor: 'Brother y Moriz' }, { id: 'r2', tipo: 'lugar', palabra: 'moriz', valor: 'Brother y Moriz' },
    { id: 'r3', tipo: 'lugar', palabra: 'morriz', valor: 'Brother y Moriz' }, { id: 'r4', tipo: 'lugar', palabra: 'brother', valor: 'Brother y Moriz' },
    { id: 'r5', tipo: 'lugar', palabra: 'horno fusion alsi12', valor: 'Horno fusión AlSi12 (Nave 1)' },
    { id: 'r6', tipo: 'lugar', palabra: 'horno fusion nave 1', valor: 'Horno fusión Nave 1' },
    { id: 'r7', tipo: 'grupo', palabra: 'hornos', valor: 'horno, escoria, bolon, desgasificadora, barredura' }];
  try {
    R.ots_rango = [ot('2026-10-05', 'Suelo Brother y Moriz', '', 'Ahmed El Hait', 30), ot('2026-10-06', 'Limpieza de canaleta', 'MORIZ', 'Ahmed El Hait', 20),
      ot('2026-10-07', 'Fuga de agua', 'Brother 2', 'Ahmed El Hait', 15), ot('2026-10-08', 'Limpieza de suelo de brother y morriz', 'Nave 1', 'Ahmed El Hait', 25),
      ot('2026-10-09', 'Limpieza horno fusión AlSi12', '', 'Ahmed El Hait', 60), ot('2026-10-12', 'Vaciar bandejas escoria', '', 'Ahmed El Hait', 20),
      ot('2026-10-13', 'Bolones', 'HORNO FUSIÓN Nave 1', 'Ahmed El Hait', 15), ot('2026-10-14', 'Limpieza horno fusión Nave 1', '', 'Ahmed El Hait', 40),
      ot('2026-10-15', 'Limpieza pasillo nave 1', 'Nave 1', 'Ahmed El Hait', 30)];
    R.horas_rango = []; R.sust_rango = [];
    const { err } = await abre(page, ADMIN, '?ir=investigar');
    const pregunta = async q => { await page.fill('#invQ', q); await page.locator('#invPreg').getByRole('button', { name: 'Preguntar' }).click(); await page.waitForTimeout(400); return page.locator('#invResp'); };
    let r = await pregunta('trabajos en brother y moriz');
    await expect(r).toContainText('Dónde: Brother y Moriz'); await expect(r).toContainText('4 veces');
    r = await pregunta('hornos');
    await expect(r).toContainText('Grupo: Hornos'); await expect(r).toContainText('4 veces');
    // Nave 1: el AlSi12 y el pasillo (no el horno de fusión de la Nave 1, ni su limpieza, ni Brother y Moriz)
    r = await pregunta('trabajos en la nave 1');
    await expect(r).toContainText('2 veces');
    r = await pregunta('trabajos en el horno de fusión de la nave 1');
    await expect(r).toContainText('Dónde: Horno fusión Nave 1'); await expect(r).toContainText('2 veces');
    expect(err.filter(e => !/jspdf|autoTable/i.test(e))).toEqual([]);
  } finally { R.inv_dic_listar = g; }
});

test('Ronda 4: la nave del título, «las 2 naves» cuentan en las dos y el grupo «basuras» (saca sí, sacar no)', async ({ page }) => {
  const g = R.inv_dic_listar;
  R.inv_dic_listar = [{ id: 'q1', tipo: 'lugar', palabra: 'horno mantenedor nave 1', valor: 'Horno mantenedor Nave 1' },
    { id: 'q2', tipo: 'grupo', palabra: 'basuras', valor: 'basura, saca, tacho, contenedor, carton, plastico, madera, papel' }];
  try {
    R.ots_rango = [ot('2026-10-05', 'Limpieza pasillo Nave 2', '', 'Ahmed El Hait', 30), ot('2026-10-06', 'Basuras Nave 2', '', 'Ahmed El Hait', 20),
      ot('2026-10-07', 'Retirar basura de las 2 naves( cartón, plásticos y madera)', '', 'Ahmed El Hait', 40),
      ot('2026-10-08', 'Vaciar retenedores de aceites y taladrinas.', 'NAVE 1 y 2', 'Ahmed El Hait', 25),
      ot('2026-10-09', 'Limpieza horno mantenedor Nave 1', '', 'Ahmed El Hait', 35), ot('2026-10-12', 'Cambiar saca blanca', 'Nave 1', 'Ahmed El Hait', 10),
      ot('2026-10-13', 'Sacar la escoria', 'Nave 1', 'Ahmed El Hait', 15)];
    R.horas_rango = []; R.sust_rango = [];
    const { err } = await abre(page, ADMIN, '?ir=investigar');
    const pregunta = async q => { await page.fill('#invQ', q); await page.locator('#invPreg').getByRole('button', { name: 'Preguntar' }).click(); await page.waitForTimeout(400); return page.locator('#invResp'); };
    // Nave 2: pasillo, basuras y los dos de «las 2 naves»
    let r = await pregunta('trabajos en la nave 2');
    await expect(r).toContainText('4 veces');
    // Nave 1: los dos de «las 2 naves», el mantenedor de la Nave 1, la saca y sacar escoria
    r = await pregunta('trabajos en la nave 1');
    await expect(r).toContainText('5 veces');
    r = await pregunta('basuras');
    await expect(r).toContainText('Grupo: Basuras'); await expect(r).toContainText('3 veces');
    expect(err.filter(e => !/jspdf|autoTable/i.test(e))).toEqual([]);
  } finally { R.inv_dic_listar = g; }
});

test('Ronda 5: bandejas de escoria al horno de fusión, Rebabax aparte, «Nave II» / «N-1B» y el grupo «zonas comunes»', async ({ page }) => {
  const g = R.inv_dic_listar;
  R.inv_dic_listar = [{ id: 'p1', tipo: 'lugar', palabra: 'bandejas escoria', valor: 'Horno fusión Nave 1' },
    { id: 'p2', tipo: 'lugar', palabra: 'rebabax', valor: 'Rebabax (empresa externa)' },
    { id: 'p3', tipo: 'grupo', palabra: 'zonas comunes', valor: 'cafe, taller, almacen, moldes' }];
  try {
    R.ots_rango = [ot('2026-10-05', 'Vaciar bandejas escoria ', '', 'Ahmed El Hait', 20), ot('2026-10-06', 'Pasar la fregadora en Rebabax ', '', 'Ahmed El Hait', 60),
      ot('2026-10-07', 'Limpieza carros de viruta de nave II y N-1B', '', 'Ahmed El Hait', 30), ot('2026-10-08', 'Suelo Taller mecánico, zona SW nueva  y cinta Bebederos N2', '', 'Ahmed El Hait', 40),
      ot('2026-10-09', 'Limpiar zona de café', '', 'Ahmed El Hait', 15), ot('2026-10-12', 'Limpiar almacén', '', 'Ahmed El Hait', 25)];
    R.horas_rango = []; R.sust_rango = [];
    const { err } = await abre(page, ADMIN, '?ir=investigar');
    const pregunta = async q => { await page.fill('#invQ', q); await page.locator('#invPreg').getByRole('button', { name: 'Preguntar' }).click(); await page.waitForTimeout(400); return page.locator('#invResp'); };
    // Nave 2: carros de viruta (nave II y N-1B → las dos) y el taller (N2); ni escoria ni Rebabax
    let r = await pregunta('trabajos en la nave 2');
    await expect(r).toContainText('2 veces');
    r = await pregunta('trabajos en la nave 1');
    await expect(r).toContainText('1 vez');
    r = await pregunta('trabajos en el horno de fusión de la nave 1');
    await expect(r).toContainText('1 vez');
    r = await pregunta('zonas comunes');
    await expect(r).toContainText('Grupo: Zonas comunes'); await expect(r).toContainText('3 veces');
    expect(err.filter(e => !/jspdf|autoTable/i.test(e))).toEqual([]);
  } finally { R.inv_dic_listar = g; }
});

test('«¿Dónde se pierde más tiempo?» es el tiempo en problemas que se repiten (no lo que más tiempo lleva)', async ({ page }) => {
  // la F19 pierde aceite 3 veces (1 h 30 en total); en la F5 2 derrames largos (2 h); un trabajo normal larguísimo no cuenta
  R.ots_rango = [ot('2026-10-05', 'Derrame de aceite', 'F19', 'Ahmed El Hait', 30), ot('2026-10-12', 'Derrame de aceite', 'F19', 'Ahmed El Hait', 30),
    ot('2026-10-20', 'Derrame de aceite', 'F19', 'Ahmed El Hait', 30), ot('2026-10-06', 'Derrame de taladrina', 'F5', 'Ahmed El Hait', 60),
    ot('2026-10-22', 'Derrame de taladrina', 'F5', 'Ahmed El Hait', 60), ot('2026-10-07', 'Fuga de agua', 'F30', 'Ahmed El Hait', 90),
    ot('2026-10-08', 'Limpieza pasillo Nave 1', 'Nave 1', 'Ahmed El Hait', 400)];
  R.horas_rango = []; R.sust_rango = [];
  const { err } = await abre(page, ADMIN, '?ir=investigar');
  const pregunta = async q => { await page.fill('#invQ', q); await page.locator('#invPreg').getByRole('button', { name: 'Preguntar' }).click(); await page.waitForTimeout(400); return page.locator('#invResp'); };
  let r = await pregunta('¿dónde se pierde más tiempo?');
  await expect(r).toContainText('Donde más tiempo se pierde repitiendo el mismo trabajo');
  await expect(r).toContainText('F5 (fugas y derrames de taladrina), 2 veces y 2 h');
  await expect(r).toContainText('En total se han ido 3 h 30 min en 5 trabajos por 2 problemas que se repiten');
  await expect(r).not.toContainText('Limpieza pasillo');
  r = await pregunta('qué problemas no se arreglan en la F19');
  await expect(r).toContainText('F19 (fugas y derrames de aceite), 3 veces');
  expect(err.filter(e => !/jspdf|autoTable/i.test(e))).toEqual([]);
});

test('«¿Qué trabajador tiene menos carga de trabajo?» ordena por saturación y avisa de quien no apunta', async ({ page }) => {
  R.ots_rango = [ot('2026-10-05', 'Derrame de aceite', 'F19', 'Ahmed El Hait', 240), ot('2026-10-06', 'Derrame de aceite', 'F19', 'Josefa Ruiz', 60)];
  R.horas_rango = []; R.sust_rango = [];
  const { err } = await abre(page, ADMIN, '?ir=investigar');
  const pregunta = async q => { await page.fill('#invQ', q); await page.locator('#invPreg').getByRole('button', { name: 'Preguntar' }).click(); await page.waitForTimeout(400); return page.locator('#invResp'); };
  let r = await pregunta('¿qué trabajador tiene menos carga de trabajo?');
  await expect(r).toContainText('Quien menos carga de trabajo tiene este mes: Abdoul kader Maiga, 0 %');
  await expect(r).toContainText('Quien más: Ahmed El Hait');
  await expect(r).toContainText('Ojo: Abdoul kader Maiga no tiene ningún trabajo apuntado');
  await expect(r.locator('tbody tr').nth(1)).toContainText('Josefa Ruiz');
  r = await pregunta('¿quién está más cargado?');
  await expect(r).toContainText('Quien más carga de trabajo tiene este mes: Ahmed El Hait');
  await expect(r).not.toContainText('Ojo:');
  expect(err.filter(e => !/jspdf|autoTable/i.test(e))).toEqual([]);
});

test('Preguntas nuevas: naves, ahorro, ¿ha vuelto?, sin hacer, empeorado, resumen, hora, semana del mes, turno y media', async ({ page }) => {
  const e0 = R.elementos; R.elementos = [];
  const c = (f, h) => ({ creado: f + 'T' + h + ':00Z' });
  try {
    R.ots_rango = [
      ot('2026-09-05', 'Derrame de aceite', 'Nave 2', 'Ahmed El Hait', 30), ot('2026-09-12', 'Derrame de aceite', 'Nave 2', 'Ahmed El Hait', 30),
      ot('2026-09-19', 'Derrame de aceite', 'Nave 2', 'Ahmed El Hait', 30),
      ot('2026-10-02', 'Derrame de aceite', 'Nave 1', 'Ahmed El Hait', 30, c('2026-10-02', '06:10')), ot('2026-10-03', 'Derrame de aceite', 'Nave 1', 'Ahmed El Hait', 30, c('2026-10-03', '06:40')),
      ot('2026-10-20', 'Derrame de aceite', 'Nave 2', 'Ahmed El Hait', 60, c('2026-10-20', '13:00')),
      ot('2026-10-21', 'Limpieza pasillo Nave 2', '', 'Ahmed El Hait', 40, { origen: 'fija', turno: 'Tarde' }),
      ot('2026-10-22', 'Limpieza pasillo Nave 1', '', null, 20, { origen: 'fija', estado: 'pendiente' }),
      ot('2026-10-23', 'Limpieza pasillo Nave 1', '', null, 20, { origen: 'fija', estado: 'no_hecha' }),
      ot('2026-10-05', 'Fuga de taladrina', 'F19', 'Ahmed El Hait', 45), ot('2026-10-25', 'Fuga de taladrina', 'F19', 'Ahmed El Hait', 45)];
    R.horas_rango = []; R.sust_rango = [];
    const { err } = await abre(page, ADMIN, '?ir=investigar');
    const pregunta = async q => { await page.fill('#invQ', q); await page.locator('#invPreg').getByRole('button', { name: 'Preguntar' }).click(); await page.waitForTimeout(400); return page.locator('#invResp'); };
    let r = await pregunta('compara la nave 1 con la nave 2');
    await expect(r).toContainText('Compara: Nave 1 y Nave 2'); await expect(r).toContainText('la Nave 1 4 veces'); await expect(r).toContainText('En la Nave 2 se va 40 min más');
    r = await pregunta('¿cuánto ahorraríamos si arreglan la F19?');
    await expect(r).toContainText('Periodo: los últimos 3 meses'); await expect(r).toContainText('Si se arregla la F19, se ahorrarían unas'); await expect(r).toContainText('2 problemas');
    r = await pregunta('¿ha vuelto a perder taladrina la F19 desde el 10/10?');
    await expect(r).toContainText('Sí, ha vuelto a pasar'); await expect(r).toContainText('La última, el 25/10');
    r = await pregunta('¿ha vuelto a perder taladrina la F19 desde el 26/10?');
    await expect(r).toContainText('No ha vuelto a pasar'); await expect(r).toContainText('Lo último fue el 25/10');
    r = await pregunta('¿qué se ha quedado sin hacer este mes?');
    await expect(r).toContainText('Sin hacer este mes: 2 trabajos (1 pendientes, 1 marcados como no hechos');
    await expect(r).toContainText('«Limpieza pasillo Nave 1» (2 veces)');
    r = await pregunta('¿qué ha empeorado este mes?');
    await expect(r).toContainText('Lo que más ha empeorado este mes respecto al periodo anterior: F19 (fugas y derrames de taladrina), de 0 a 2 veces');
    r = await pregunta('¿qué ha mejorado este mes?');
    await expect(r).toContainText('Lo que más ha mejorado este mes respecto al periodo anterior: Nave 2 (fugas y derrames de aceite), de 3 a 1 vez');
    r = await pregunta('resumen del mes');
    await expect(r).toContainText('Resumen este mes: se han hecho 6 trabajos'); await expect(r).toContainText('Ha habido 5 problemas');
    r = await pregunta('¿a qué hora hay más derrames?');
    await expect(r).toContainText('El que más: 08–10 h (3');
    r = await pregunta('¿qué semana del mes hay más derrames?');
    await expect(r).toContainText('El que más: 1.ª semana (días 1–7) (3');
    r = await pregunta('trabajos del turno de tarde');
    await expect(r).toContainText('Turno: tarde'); await expect(r).toContainText('1 vez');
    r = await pregunta('¿cuánto tardamos de media en limpiar el pasillo?');
    await expect(r.locator('tbody').first()).toContainText('Limpieza pasillo Nave 2');
    // lo de antes sigue igual
    r = await pregunta('Derrames de aceite en la Nave 2 comparado con el mes anterior');
    await expect(r).not.toContainText('Compara: Nave 1 y Nave 2');
    expect(err.filter(e => !/jspdf|autoTable/i.test(e))).toEqual([]);
  } finally { R.elementos = e0; }
});

test('«¿Cómo podemos ahorrar tiempo?» junta lo previsto, las personas, el tiempo entre trabajos y lo que se repite; y una fecha suelta', async ({ page }) => {
  const t = (f, a, b) => ({ inicio: f + 'T' + a + ':00Z', fin: f + 'T' + b + ':00Z' });
  R.ots_rango = [
    ot('2026-10-05', 'Derrame de aceite', 'F19', 'Ahmed El Hait', 50, Object.assign({ minutos_est: 20 }, t('2026-10-05', '06:00', '06:50'))),
    ot('2026-10-05', 'Limpieza pasillo Nave 1', 'Nave 1', 'Ahmed El Hait', 30, t('2026-10-05', '07:00', '07:30')),
    ot('2026-10-05', 'Vaciar barreduras', 'Nave 1', 'Ahmed El Hait', 10, t('2026-10-05', '08:30', '08:40')),
    ot('2026-10-12', 'Derrame de aceite', 'F19', 'Ahmed El Hait', 50, Object.assign({ minutos_est: 20 }, t('2026-10-12', '06:00', '06:50'))),
    ot('2026-10-06', 'Derrame de aceite', 'F5', 'Josefa Ruiz', 20, { minutos_est: 20 }), ot('2026-10-07', 'Derrame de aceite', 'F6', 'Josefa Ruiz', 20, { minutos_est: 20 })];
  R.horas_rango = []; R.sust_rango = [];
  const { err } = await abre(page, ADMIN, '?ir=investigar');
  const pregunta = async q => { await page.fill('#invQ', q); await page.locator('#invPreg').getByRole('button', { name: 'Preguntar' }).click(); await page.waitForTimeout(400); return page.locator('#invResp'); };
  let r = await pregunta('¿cómo podemos ahorrar tiempo en realizar los trabajos?');
  await expect(r).toContainText('Quiero saber: cómo ahorrar tiempo'); await expect(r).not.toContainText('No encuentro trabajos');
  await expect(r).toContainText('Para ahorrar tiempo los últimos 3 meses, por orden: 1) arreglar las máquinas y sitios que repiten problemas');
  await expect(r).toContainText('2) tiempo entre un trabajo y otro');
  await expect(r).toContainText('Derrame de aceite: Ahmed El Hait 50 min de media, Josefa Ruiz 20 min');
  await expect(r).toContainText('Derrame de aceite: 50 min de media y se prevén 20 min (2 veces)');
  await expect(r).toContainText('Solo cuenta lo que tiene tiempo real');
  r = await pregunta('¿qué trabajos hizo Ahmed el día 5/10/26?');
  await expect(r).toContainText('Periodo: el 05/10/2026'); await expect(r).not.toContainText('No encuentro trabajos'); await expect(r).toContainText('3 en total');
  r = await pregunta('quien tarda mas en realizar un trabajo en concreto');
  await expect(r).not.toContainText('No encuentro trabajos');
  await expect(r).toContainText('donde más diferencia hay es «Derrame de aceite»: Ahmed El Hait tarda 50 min de media y Josefa Ruiz 20 min');
  r = await pregunta('¿qué trabajos hizo Ahmed el día 12/6/26?');
  await expect(r).toContainText('En la app no hay ningún trabajo apuntado el 12/06/2026');
  expect(err.filter(e => !/jspdf|autoTable/i.test(e))).toEqual([]);
});
