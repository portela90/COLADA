// Utilidades: montar cada app con datos de prueba (sin internet ni Supabase) y vigilar errores.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const TMP = path.join(__dirname, '.tmp');

/* Copia la página cambiando el bloque que habla con Supabase por un simulador con datos de prueba. */
function montar(nombre, mock) {
  const html = fs.readFileSync(path.join(ROOT, nombre), 'utf8');
  const i = html.indexOf('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js');
  const fin = html.match(/<script src="js\/supabase-web\.[0-9a-f]+\.js"><\/script>/);
  if (i < 0 || !fin) throw new Error('No encuentro el bloque de Supabase en ' + nombre + ' (¿has ejecutado node build.mjs?)');
  const m = fs.readFileSync(path.join(__dirname, 'mocks', mock), 'utf8');
  const out = html.slice(0, i) + m + html.slice(fin.index + fin[0].length);
  fs.mkdirSync(path.join(TMP, 'js'), { recursive: true });
  for (const f of fs.readdirSync(ROOT).filter(f => f.endsWith('.js'))) fs.copyFileSync(path.join(ROOT, f), path.join(TMP, f));
  for (const f of fs.readdirSync(path.join(ROOT, 'js'))) fs.copyFileSync(path.join(ROOT, 'js', f), path.join(TMP, 'js', f));
  const dest = path.join(TMP, nombre);
  fs.writeFileSync(dest, out);
  return 'file://' + dest;
}
/* Página tal cual (para Limpieza, que se simula interceptando las llamadas). */
function original(nombre) { return 'file://' + path.join(ROOT, nombre); }

/* Recoge errores de la página y corta todo acceso a internet. */
const ECHARTS = path.join(__dirname, 'node_modules/echarts/dist/echarts.min.js');
async function vigila(page, alInternet) {
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  await page.route(/^https?:/, r => {
    if (r.request().url().includes('/echarts')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(ECHARTS, 'utf8') });
    if (r.request().url().includes('/jsqr@')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(path.join(__dirname, 'node_modules/jsqr/dist/jsQR.js'), 'utf8') });
    if (r.request().url().includes('/@zxing/browser')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(path.join(__dirname, 'node_modules/@zxing/browser/umd/zxing-browser.min.js'), 'utf8') });
    return (alInternet ? alInternet(r) : null) || r.abort();
  });
  return errores;
}
async function pulsa(page, texto) {
  await page.evaluate(t => {
    const tx = x => { const tt = x.querySelector && x.querySelector('.tt'); return (tt ? tt.textContent : x.textContent).trim(); };
    const b = [...document.querySelectorAll('button,.tile,a.ini-t')].filter(x => tx(x) === t && x.offsetParent !== null).pop()
      || [...document.querySelectorAll('button,.tile')].filter(x => tx(x) === t).pop();
    if (!b) throw new Error('No encuentro el botón «' + t + '»');
    b.click();
  }, texto);
  await page.waitForTimeout(250);
}
/* Nada se sale de la pantalla por la derecha (salvo dentro de zonas con scroll propio). */
async function desbordes(page) {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth, out = [];
    if (document.documentElement.scrollWidth > W + 1) out.push('la página entera es más ancha que la pantalla');
    document.querySelectorAll('main *, .dlg *').forEach(e => {
      if (!e.offsetParent) return;
      for (let a = e.parentElement; a; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return; }
      const r = e.getBoundingClientRect();
      if (r.width && r.right > W + 1) out.push(e.tagName + '.' + e.className + ' «' + (e.textContent || '').trim().slice(0, 30) + '»');
    });
    return out.slice(0, 5);
  });
}
module.exports = { ROOT, montar, original, vigila, pulsa, desbordes };
