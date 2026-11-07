// Cada app se adapta a la pantalla: móvil (barra abajo), iPad y ordenador (menú a la izquierda), sin salirse.
const { test, expect } = require('@playwright/test');
const { montar, vigila, desbordes } = require('./util');
const { abre, ADMIN } = require('./limp');
for (const [pag, mock, sel] of [['index.html', 'coladas.html', 'nav button'], ['almacen.html', 'almacen.html', '#tabs button']]) {
  for (const w of [390, 820, 1440]) {
    test(pag + ' a ' + w + ' px', async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 });
      const err = await vigila(page); await page.goto(montar(pag, mock)); await page.waitForTimeout(1000);
      const r = await page.evaluate(s => { const n = document.querySelector('#tabs').getBoundingClientRect(), m = document.querySelector('main').getBoundingClientRect(); return { lateral: n.height > n.width, mainIzq: m.left, n: document.querySelectorAll(s).length }; }, sel);
      expect(r.lateral).toBe(w >= 800);
      if (w >= 800) expect(r.mainIzq).toBeGreaterThan(190);
      for (let i = 0; i < r.n; i++) {
        await page.evaluate(([s, i]) => document.querySelectorAll(s)[i].click(), [sel, i]); await page.waitForTimeout(350);
        expect(await desbordes(page), pag + ' ' + w + 'px pestaña ' + i).toEqual([]);
      }
      expect(err).toEqual([]);
    });
  }
}
test('limpieza en el ordenador: menú a la izquierda', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { err } = await abre(page, ADMIN);
  const r = await page.evaluate(() => { const n = document.querySelector('#nav').getBoundingClientRect(), m = document.querySelector('main').getBoundingClientRect(); return { lateral: n.height > n.width, mainIzq: m.left }; });
  expect(r.lateral).toBe(true); expect(r.mainIzq).toBeGreaterThan(200);
  expect(await desbordes(page)).toEqual([]);
  expect(err).toEqual([]);
});
test('limpieza en el iPad con menú lateral: la barra de botones de abajo no queda debajo del menú', async ({ page }) => {
  const { OPER } = require('./limp');
  await page.setViewportSize({ width: 1000, height: 700 });
  const { err } = await abre(page, Object.assign({}, OPER, { encargado: true }));
  const r = await page.evaluate(() => { const p = document.querySelector('.pie'), n = document.querySelector('#nav'); return { pie: p.getBoundingClientRect().left, nav: n.getBoundingClientRect().right, lateral: n.getBoundingClientRect().height > n.getBoundingClientRect().width }; });
  expect(r.lateral).toBe(true); expect(r.pie).toBeGreaterThanOrEqual(r.nav - 1);
  expect(err).toEqual([]);
});
test('móvil en horizontal: pestañas abajo, sin menú lateral', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  const err = await vigila(page); await page.goto(montar('index.html', 'coladas.html')); await page.waitForTimeout(1000);
  const r = await page.evaluate(() => { const n = document.querySelector('#tabs').getBoundingClientRect(); return n.height > n.width; });
  expect(r).toBe(false); expect(await desbordes(page)).toEqual([]); expect(err).toEqual([]);
});
