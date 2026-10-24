// Utilidades: montar cada app con datos de prueba (sin internet ni Supabase) y vigilar errores.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const TMP = path.join(__dirname, '.tmp');

/* Copia la página cambiando el bloque que habla con Supabase por un simulador con datos de prueba. */
function montar(nombre, mock) {
  const L = fs.readFileSync(path.join(ROOT, nombre), 'utf8').split('\n');
  let i = L.findIndex(l => l.includes('supabase-js@'));
  if (i < 0) throw new Error('No encuentro el bloque de Supabase en ' + nombre);
  if (i > 0 && L[i - 1].startsWith('<script>window.DB_PREFIX')) i--;
  let j = L.findIndex((l, k) => k > i + 1 && l.trim() === '</script>');
  if (j < 0) throw new Error('No encuentro el final del bloque de Supabase en ' + nombre);
  const m = fs.readFileSync(path.join(__dirname, 'mocks', mock), 'utf8');
  const pre = L[i].startsWith('<script>window.DB_PREFIX') ? [L[i]] : [];
  const out = L.slice(0, i).concat(pre, [m], L.slice(j + 1)).join('\n');
  fs.mkdirSync(TMP, { recursive: true });
  const dest = path.join(TMP, nombre);
  fs.writeFileSync(dest, out);
  return 'file://' + dest;
}
/* Página tal cual (para Limpieza, que se simula interceptando las llamadas). */
function original(nombre) { return 'file://' + path.join(ROOT, nombre); }

/* Recoge errores de la página y corta todo acceso a internet. */
async function vigila(page, alInternet) {
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  await page.route(/^https?:/, r => (alInternet ? alInternet(r) : null) || r.abort());
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
