// Supabase simulado para probar la app real (con su conexión de verdad) sin internet:
// sirve la librería desde node_modules y contesta a /rest/v1/docs, /usuarios y a las funciones rpc.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const LIB = fs.readFileSync(path.join(__dirname, 'node_modules/@supabase/supabase-js/dist/umd/supabase.js'), 'utf8');

/* Datos de Almacén: los del simulador sencillo (tests/mocks/almacen.html) */
function datosAlmacen() {
  const src = fs.readFileSync(path.join(__dirname, 'mocks/almacen.html'), 'utf8').replace(/^<script>/, '').replace(/<\/script>\s*$/, '');
  const w = {}; vm.runInNewContext(src, { window: w, setTimeout });
  return JSON.parse(JSON.stringify(w.__D));
}
const USER = { id: '11111111-1111-1111-1111-111111111111', email: 'prueba@mapri.es', aud: 'authenticated', role: 'authenticated' };
function sesion() {
  const b = s => Buffer.from(JSON.stringify(s)).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 86400 * 30;
  const jwt = b({ alg: 'HS256', typ: 'JWT' }) + '.' + b({ sub: USER.id, exp, role: 'authenticated' }) + '.firma';
  return { access_token: jwt, refresh_token: 'r', token_type: 'bearer', expires_in: 86400 * 30, expires_at: exp, user: USER };
}
/* Monta el servidor simulado en la página. P = prefijo de colecciones ("alm_" en Almacén). */
async function servidor(page, P, D, yo) {
  const S = { D, online: true, llamadas: [] };
  const fila = Object.assign({ user_id: USER.id, activo: true, nombre: 'Prueba', email: USER.email }, yo || {});
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, ['sb-whemhkcrgwyjucpaswrm-auth-token', JSON.stringify(sesion())]);
  await page.route(/^https?:/, async r => {
    const u = new URL(r.request().url());
    if (u.href.includes('supabase-js')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: LIB });
    if (!/supabase\.co$/.test(u.hostname)) return r.abort();
    if (!S.online) return r.abort('internetdisconnected');
    const q = u.searchParams, obj = (r.request().headers()['accept'] || '').includes('vnd.pgrst.object');
    const json = (x, st) => r.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(x) });
    if (u.pathname === '/rest/v1/usuarios') return json(obj ? fila : [fila]);
    if (u.pathname === '/rest/v1/docs' && r.request().method() === 'GET') {
      const col = (q.get('col') || '').replace(/^eq\./, ''), id = (q.get('id') || '').replace(/^eq\./, '');
      const c = S.D[col.slice(P.length)] || {};
      const rows = Object.entries(c).filter(([k]) => !id || k === id).map(([k, v]) => ({ id: k, data: v }));
      if (id) return json(obj ? (rows[0] ? { data: rows[0].data } : null) : rows.map(x => ({ data: x.data })));
      return json(rows);
    }
    if (u.pathname.startsWith('/rest/v1/rpc/')) {
      const fn = u.pathname.split('/').pop(); let a = {}; try { a = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      S.llamadas.push([fn, a]);
      if (fn === 'docs_items_add') { const c = a.p_col.slice(P.length); S.D[c] = S.D[c] || {}; const d = S.D[c][a.p_id] = S.D[c][a.p_id] || { items: [] };
        a.p_items.forEach(n => { if (!d.items.some(x => (n.id != null && x.id === n.id) || (n.id == null && n.i != null && x.i === n.i))) d.items.push(n); }); return r.fulfill({ status: 204, body: '' }); }
      if (fn === 'log_error' || fn === 'errores_listar') return json([]);
      return r.fulfill({ status: 204, body: '' });
    }
    if (u.pathname.startsWith('/auth/v1/')) return json({ ...sesion() });
    return json([]);
  });
  return S;
}
module.exports = { servidor, datosAlmacen };
