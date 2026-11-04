// Toolbox: tallas de ropa y botas. El trabajador propone tallas («Mis tallas»); el admin las acepta
// desde la pestaña «Tallas y EPI» de la ficha. Todo simulado (sin internet).
const { test, expect } = require('@playwright/test');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const UUID = '11111111-1111-4111-8111-111111111111';

async function montar(page, { yo, ruta, pend, tallas }) {
  const st = { llamadas: [] };
  page.on('pageerror', e => st.llamadas.push({ error: e.message }));
  await page.route(/^https?:/, async r => {
    const u = r.request().url();
    const m = u.match(/\/rest\/v1\/rpc\/(\w+)/);
    if (m) {
      const a = JSON.parse(r.request().postData() || '{}'); st.llamadas.push({ fn: m[1], a });
      let d = [];
      switch (m[1]) {
        case 'yo': d = yo; break;
        case 'prl_tallas_mias': d = { tallas: tallas || { camiseta_corta: 'M', pantalon: '42' }, pend: null, pend_en: null }; break;
        case 'prl_tallas_pedir': d = { ok: true }; break;
        case 'prl_ficha': d = {
          trabajador: { id: UUID, nombre: 'Pepe Ruiz', activo: true, dni: '12345678Z', puesto: 'Operario', tallas: { camiseta_corta: 'M' }, tallas_pend: pend, tallas_pend_en: '2026-11-03T08:00:00Z' },
          docs: [], formaciones: [], toolbox: [], certs: [] }; break;
        case 'prl_tallas_historial': d = []; break;
        case 'prl_tallas_resolver': d = { ok: true }; break;
      }
      return r.fulfill({ json: d });
    }
    if (u.startsWith('https://app.test/')) {
      const fs = require('fs');
      const f = path.join(ROOT, decodeURIComponent(new URL(u).pathname));
      if (fs.existsSync(f) && fs.statSync(f).isFile()) return r.fulfill({ path: f });
      return r.fulfill({ status: 404, body: '' });
    }
    return r.abort();
  });
  await page.addInitScript(() => { localStorage.setItem('limp.tok', '00000000-0000-0000-0000-000000000001'); });
  await page.goto('https://app.test/toolbox.html' + ruta);
  return st;
}

test('trabajador: envía sus tallas y el servidor recibe solo las que ha escrito', async ({ page }) => {
  const st = await montar(page, { yo: { id: 'w1', nombre: 'Pepe Ruiz', rol: 'operario' }, ruta: '?tallas=1' });
  await expect(page.getByText('Tu ropa y botas')).toBeVisible();
  await expect(page.locator('input.tm[data-k="pantalon"]')).toHaveValue('42');
  await page.locator('input.tm[data-k="bota_seguridad"]').fill('43');
  await page.getByRole('button', { name: 'Enviar cambios' }).click();
  await expect.poll(() => st.llamadas.some(c => c.fn === 'prl_tallas_pedir')).toBeTruthy();
  const pedir = st.llamadas.find(c => c.fn === 'prl_tallas_pedir');
  expect(pedir.a.p).toEqual({ bota_seguridad: '43' });
});

test('admin: acepta la propuesta de tallas desde la pestaña «Tallas y EPI»', async ({ page }) => {
  const st = await montar(page, {
    yo: { id: 'a1', nombre: 'Cristian', rol: 'admin' }, ruta: '?ficha=' + UUID,
    pend: { camiseta_corta: 'L', bota_seguridad: '44' },
  });
  await page.getByRole('button', { name: 'Tallas y EPI' }).click();
  await expect(page.getByText('Cambios pendientes de tu revisión')).toBeVisible();
  await expect(page.getByText('Propone: L')).toBeVisible();
  await page.getByRole('button', { name: 'Aceptar cambios' }).click();
  await expect.poll(() => st.llamadas.some(c => c.fn === 'prl_tallas_resolver')).toBeTruthy();
  const res = st.llamadas.find(c => c.fn === 'prl_tallas_resolver');
  expect(res.a).toMatchObject({ p_trab: UUID, p_aceptar: true });
});

test('trabajador sin tallas: ve el aviso en su pantalla de inicio', async ({ page }) => {
  await montar(page, { yo: { id: 'w1', nombre: 'Pepe Ruiz', rol: 'operario' }, ruta: '', tallas: {} });
  await expect(page.getByText('Pon tus tallas de ropa y botas')).toBeVisible();
  await page.getByRole('button', { name: 'Poner mis tallas' }).click();
  await expect(page.getByText('Tu ropa y botas')).toBeVisible();
});
