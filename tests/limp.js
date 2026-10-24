// Abre la app de Limpieza con un usuario y las respuestas de prueba (tests/mocks/limpieza.js).
const { original, vigila } = require('./util');
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
module.exports = { abre, ADMIN, OPER };
