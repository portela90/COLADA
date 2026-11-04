// Limpieza: informe por operario (solo admin). Eliges operarios con casillas, un periodo y descargas el PDF.
const { expect, test } = require('@playwright/test');
const { abre, ADMIN } = require('./limp');
const { R } = require('./mocks/limpieza');

test('admin: el informe por operario pide los trabajos de la semana de los operarios marcados', async ({ page }) => {
  R.ots_rango = [];
  const { err, llamadas } = await abre(page, ADMIN, '?ir=resumen');
  const card = page.locator('#informeop');
  await expect(card).toBeVisible();
  await expect(card.getByRole('button', { name: 'Descargar PDF' })).toBeVisible();
  // hay casillas de operarios (no del admin) y se pueden marcar varias
  const casillas = card.locator('input[type=checkbox]');
  expect(await casillas.count()).toBeGreaterThan(2);
  await casillas.nth(0).check();
  await casillas.nth(1).check();
  await card.getByRole('button', { name: 'Descargar PDF' }).click();
  await page.waitForTimeout(800);
  const pedido = llamadas.filter(([fn]) => fn === 'ots_rango').pop();
  expect(pedido, 'debe pedir ots_rango').toBeTruthy();
  const { p_desde, p_hasta } = pedido[1];
  expect(p_desde <= p_hasta).toBeTruthy();
  expect(new Date(p_desde + 'T12:00:00').getDay(), 'desde=' + p_desde + ' hasta=' + p_hasta).toBe(1); // lunes
  expect(err.filter(e => !/jspdf|autoTable|jsPDF/i.test(e))).toEqual([]);
});
