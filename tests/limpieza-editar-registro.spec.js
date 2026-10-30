// Limpieza (horno): desde «Último registro» se abre el detalle del registro y el admin ve «Editar registro».
const { test, expect } = require('@playwright/test');
const { R, H29 } = require('./mocks/limpieza');
const { abre, ADMIN } = require('./limp');

test('último registro de un horno: abre el detalle y el admin ve «Editar registro»', async ({ page }) => {
  H29.historial = [{ id: 'ot1', fin: '2026-10-27T10:00:00Z', quien: 'Juan José Guerrero', accion: 'cambio_cono', motivo: 'Cambio preventivo', min: 20, nota: null, nfotos: 0, resultado: null }];
  H29.ult = { cambio_cono: { fin: '2026-10-27T10:00:00Z', quien: 'Juan José Guerrero', motivo: 'Cambio preventivo', nota: null } };
  R.limpieza_detalle = { id: 'ot1', fin: '2026-10-27T10:00:00Z', inicio: null, accion: 'cambio_cono', hecho_por: 'x', quien: 'Juan José Guerrero', resultado: null, nota: null, checklist: {}, puede_corregir: true, puede_editar: true, cambios: [] };
  R.horno_piezas_ot = [{ art: 'hr-ccs040', nombre: 'Cono', cant: 1, envio: 'enviado' }];
  const { err } = await abre(page, ADMIN, '?el=H-F29');
  await page.locator('.it', { hasText: 'Cambio de cono' }).click();
  await expect(page.getByText('Editar registro (quién, qué se hizo, piezas)')).toBeVisible();
  expect(err).toEqual([]);
});
