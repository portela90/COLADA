// Informe compartido: la página pública enseña la copia del informe (sin usuario) o dice por qué no se puede ver.
const { test, expect } = require('@playwright/test');
const { original, vigila, desbordes } = require('./util');
const R = { titulo: 'Informe de stock', periodo: '01/10/2026 a 31/10/2026', app: 'Colada', creado: '2026-10-31T10:00:00Z', caduca: '2026-11-07T10:00:00Z',
  contenido: { texto: 'INFORME DE STOCK · Colada\n\nNave 1 · AlSi9: 34200 kg <b>no es html</b>', hojas: [{ nombre: 'Stock', cols: ['Nave', 'Kg'], filas: [['Nave 1', 34200], ['Nave 2', 8450]] }] } };
async function abre(page, resp, hash) {
  await page.addInitScript(r => { window.__llam = []; window.__fetchInforme = async (u, o) => { window.__llam.push([u, JSON.parse(o.body)]); return { ok: true, json: async () => r }; }; }, resp);
  const err = await vigila(page); await page.goto(original('informe.html') + (hash || '#k=abcdef0123456789abcdef0123')); await page.waitForTimeout(600); return err;
}
test('se ve el informe, sus tablas (con botón de Excel) y se puede imprimir', async ({ page }) => {
  const err = await abre(page, R);
  await expect(page.locator('.ver-cab h2')).toHaveText('Informe de stock');
  await expect(page.locator('.ver-cab')).toContainText('Coladas · 01/10/2026 a 31/10/2026');
  await expect(page.locator('.ver-cab')).toContainText('caduca el 07/11/2026');
  await expect(page.locator('.ver-txt')).toContainText('<b>no es html</b>');
  await expect(page.locator('table.tbl td.num').first()).toHaveText('34.200');
  await expect(page.locator('#bImp')).toBeVisible();
  expect(await page.evaluate(() => window.__llam[0][1])).toEqual({ p_token: 'abcdef0123456789abcdef0123' });
  expect(await desbordes(page)).toEqual([]); expect(err).toEqual([]);
});
test('enlace caducado, anulado o mal copiado', async ({ page }) => {
  let err = await abre(page, { error: 'caducado', caduca: '2026-10-20T10:00:00Z' });
  await expect(page.locator('.ver-err')).toContainText('Este enlace ha caducado'); await expect(page.locator('.ver-err')).toContainText('Caducó el 20/10/2026');
  expect(err).toEqual([]);
});
test('enlace anulado y enlace incompleto', async ({ page }) => {
  await abre(page, { error: 'anulado' });
  await expect(page.locator('.ver-err')).toContainText('Este enlace se ha anulado');
  await page.evaluate(() => { location.hash = '#k=123'; }); await page.waitForTimeout(300);
  await expect(page.locator('.ver-err')).toContainText('Enlace no válido');
});
