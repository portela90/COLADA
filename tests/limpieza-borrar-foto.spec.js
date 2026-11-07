// Limpieza: borrar una foto subida por error. Solo admin y encargado ven «Borrar» bajo cada foto.
const { test, expect } = require('@playwright/test');
const { abre, ADMIN, OPER } = require('./limp');

test('admin: borra una foto del trabajo desde el detalle', async ({ page }) => {
  const a = await abre(page, ADMIN);
  await page.getByRole('button', { name: /Limpieza F25 y foso/ }).first().click();
  const borrar = page.getByRole('button', { name: 'Borrar esta foto' });
  await expect(borrar).toBeVisible();
  await borrar.click();
  await expect(page.getByText('¿Borrar esta foto?')).toBeVisible();
  await page.getByRole('button', { name: 'Borrar', exact: true }).last().click();
  await expect.poll(() => a.llamadas.some(([fn]) => fn === 'foto_borrar')).toBeTruthy();
  const [, body] = a.llamadas.find(([fn]) => fn === 'foto_borrar');
  expect(body.p_id).toBe('f1');
  await expect(page.getByRole('button', { name: 'Borrar esta foto' })).toHaveCount(0);
});

test('admin: borra la foto desde la foto en grande', async ({ page }) => {
  const a = await abre(page, ADMIN);
  await page.getByRole('button', { name: /Limpieza F25 y foso/ }).first().click();
  await page.getByRole('button', { name: 'Ver foto' }).first().click();
  await page.getByRole('button', { name: 'Borrar foto' }).click();
  await expect(page.getByText('¿Borrar esta foto?')).toBeVisible();
  await page.getByRole('button', { name: 'Borrar', exact: true }).last().click();
  await expect.poll(() => a.llamadas.some(([fn]) => fn === 'foto_borrar')).toBeTruthy();
  await expect(page.getByRole('button', { name: 'Borrar esta foto' })).toHaveCount(0);
});

test('operario: ve la foto pero no puede borrarla', async ({ page }) => {
  await abre(page, OPER);
  await page.getByRole('button', { name: /Limpieza F25 y foso/ }).first().click();
  await expect(page.getByRole('button', { name: 'Ver foto' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Borrar esta foto' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Ver foto' }).first().click();
  await expect(page.getByRole('link', { name: 'Guardar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Borrar foto' })).toHaveCount(0);
});
