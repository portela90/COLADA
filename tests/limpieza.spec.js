// Limpieza: el día abre para admin y operario, y los cambios de horno mandan la tolva y las juntas.
const { test, expect } = require('@playwright/test');
const { original, vigila, pulsa, desbordes } = require('./util');
const { R, H29, H10 } = require('./mocks/limpieza');

async function abre(page, yo, ruta) {
  const llamadas = [];
  await page.addInitScript(([yo]) => { localStorage.setItem('limp.tok', 't'); localStorage.setItem('limp.yo', JSON.stringify(yo)); }, [yo]);
  const err = await vigila(page, r => {
    const u = r.request().url();
    if (!u.includes('/rpc/')) return null;
    const fn = u.split('/rpc/')[1].split('?')[0]; let body = {};
    try { body = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
    llamadas.push([fn, body]);
    let out = R[fn];
    if (fn === 'elemento_ficha') out = body.p_cod === 'H-F10' ? H10 : H29;
    if (fn === 'horno_gasto') out = body.p_el ? R.horno_gasto_el : R.horno_gasto_all;
    if (fn === 'horno_registrar') out = { id: 'n1' };
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(out !== undefined ? out : []) });
  });
  await page.goto(original('limpieza.html') + (ruta || '')); await page.waitForTimeout(1800);
  return { err, llamadas };
}
const ADMIN = { id: 'w1', nombre: 'Cristian Portela', rol: 'admin', equipos: ['Semana'], encargado: true };
const OPER = { id: 'w2', nombre: 'Abdoul kader Maiga', rol: 'operario', equipos: ['Semana'], encargado: false };

test('el día abre para admin y para operario', async ({ page, context }) => {
  const a = await abre(page, ADMIN);
  expect(await desbordes(page)).toEqual([]);
  expect(a.err).toEqual([]);
  const p2 = await context.newPage();
  const b = await abre(p2, OPER);
  expect(b.err).toEqual([]);
});

test('cambio de tolva y cono: pide el tipo de tolva y lo envía', async ({ page }) => {
  const { err, llamadas } = await abre(page, ADMIN, '?el=H-F29');
  await expect(page.getByText('Qué se descuenta del almacén en cada cambio')).toBeVisible();
  await pulsa(page, 'Registrar en el horno'); await pulsa(page, 'Cambio de tolva'); await pulsa(page, 'Cambio de cono'); await pulsa(page, 'Siguiente');
  await pulsa(page, 'Cambio preventivo');
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /^\d+\s*min/.test(x.textContent.trim())); b.click(); });
  await pulsa(page, 'Guardar');
  expect(llamadas.filter(c => c[0] === 'horno_registrar').length).toBe(0);
  await pulsa(page, 'De hierro'); await pulsa(page, 'Guardar'); await page.waitForTimeout(500);
  const r = llamadas.filter(c => c[0] === 'horno_registrar').map(c => [c[1].p_accion, c[1].p_tolva]);
  expect(r).toEqual([['cambio_tolva', 'hierro'], ['cambio_cono', null]]);
  expect(err).toEqual([]);
});

test('cambio solo de tolva: pregunta por las juntas', async ({ page }) => {
  const { err, llamadas } = await abre(page, ADMIN, '?el=H-F29');
  await pulsa(page, 'Registrar en el horno'); await pulsa(page, 'Cambio de tolva'); await pulsa(page, 'Siguiente');
  await pulsa(page, 'Cambio preventivo');
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /^\d+\s*min/.test(x.textContent.trim())); b.click(); });
  await pulsa(page, 'Refractaria'); await pulsa(page, 'Guardar');
  expect(llamadas.filter(c => c[0] === 'horno_registrar').length).toBe(0);
  await pulsa(page, 'Sí'); await pulsa(page, 'Guardar'); await page.waitForTimeout(500);
  const c = llamadas.find(c => c[0] === 'horno_registrar')[1];
  expect(c.p_tolva).toBe('refractario');
  expect(c.p_juntas).toEqual([{ art: 'hr-jpc375', cant: 2 }, { art: 'hr-jpf365', cant: 1 }]);
  expect(err).toEqual([]);
});

test('horno abierto no descuenta nada', async ({ page }) => {
  const { err } = await abre(page, ADMIN, '?el=H-F10');
  await expect(page.getByText('Horno abierto')).toBeVisible();
  expect(err).toEqual([]);
});

test('sin red: abre el día guardado, «Empezar» se guarda y se envía al volver', async ({ page, context }) => {
  let online = true; const llamadas = [];
  await page.addInitScript(([yo]) => { localStorage.setItem('limp.tok', 't'); localStorage.setItem('limp.yo', JSON.stringify(yo)); }, [OPER]);
  const err = await vigila(page, r => {
    const u = r.request().url();
    if (!u.includes('/rpc/')) return null;
    if (!online) return r.abort('internetdisconnected');
    const fn = u.split('/rpc/')[1].split('?')[0]; let body = {};
    try { body = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
    llamadas.push([fn, body]);
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(R[fn] !== undefined ? R[fn] : []) });
  });
  await page.goto(original('limpieza.html')); await page.waitForTimeout(1800);
  online = false; await context.setOffline(true);
  await page.reload(); await page.waitForTimeout(1800);
  await expect(page.locator('#off-barra')).toContainText('Sin conexión');
  await expect(page.getByText('Limpieza F25 y foso').first()).toBeVisible();
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Empezar' && x.offsetParent); b.click(); });
  await page.waitForTimeout(600);
  await expect(page.locator('#off-barra')).toContainText('1 cambio pendiente');
  expect(llamadas.filter(c => c[0] === 'estado_ot').length).toBe(0);
  online = true; await context.setOffline(false); await page.waitForTimeout(2500);
  const env = llamadas.filter(c => c[0] === 'estado_ot');
  expect(env.length).toBe(1);
  expect(env[0][1]).toMatchObject({ p_estado: 'en_curso', p_tok: 't' });
  expect(err).toEqual([]);
});
