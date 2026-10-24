// Todo el JavaScript de las páginas tiene que estar bien escrito (un fallo aquí deja la app en blanco).
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { ROOT } = require('./util');
const paginas = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
for (const f of paginas) {
  test('sintaxis · ' + f, () => {
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const bloques = [...s.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
    bloques.forEach((b, i) => { expect(() => new vm.Script(b, { filename: f + ' #' + (i + 1) }), f + ' bloque ' + (i + 1)).not.toThrow(); });
  });
}
for (const f of fs.readdirSync(ROOT).filter(f => f.endsWith('.js'))) {
  test('sintaxis · ' + f, () => { expect(() => new vm.Script(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f })).not.toThrow(); });
}
