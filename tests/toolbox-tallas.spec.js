// Toolbox: tallas de ropa y botas. El trabajador propone tallas («Mis tallas»); el admin las acepta
// desde la pestaña «Tallas y EPI» de la ficha. Todo simulado (sin internet).
const { test, expect } = require('@playwright/test');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const UUID = '11111111-1111-4111-8111-111111111111';

async function montar(page, { yo, ruta, pend, tallas, fichas }) {
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
        case 'prl_fichas': d = fichas || []; break;
        case 'prl_ficha': if (fichas) { d = { trabajador: fichas.find(x => x.id === a.p_trab), docs: [], formaciones: [], toolbox: [], certs: [] }; break; } d = {
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

test('admin: pedido de ropa solo para los que marca y con las prendas que elige', async ({ page }) => {
  const fichas = [
    { id: 'w1', nombre: 'Abdoul kader Maiga', activo: true, tallas: { camiseta_corta: 'L', pantalon: '44', bota_seguridad: '43' } },
    { id: 'w2', nombre: 'Ahmed El Hait', activo: true, tallas: { camiseta_corta: 'M', pantalon: '42', chaqueta: 'L', bota_seguridad: '42' } },
    { id: 'w3', nombre: 'Josefa Ruiz', activo: true, tallas: {} }];
  const st = await montar(page, { yo: { id: 'a1', nombre: 'Cristian', rol: 'admin' }, ruta: '', fichas });
  await page.waitForTimeout(800);
  await page.evaluate(() => pantallaFichas()); await page.waitForTimeout(500);
  await page.locator('#pedido').click();
  const h = page.locator('.hoja-pedido');
  await expect(h).toBeVisible();
  // al abrir, nadie marcado y el botón de descargar apagado
  await expect(h.locator('.ped-p input[type=checkbox]:checked')).toHaveCount(0);
  await expect(h.locator('[data-ok]')).toBeDisabled();
  await expect(h.locator('.ped-p').nth(2)).toContainText('sin tallas');
  // marca solo a Ahmed
  await h.locator('.ped-p', { hasText: 'Ahmed El Hait' }).locator('input[type=checkbox]').check();
  await expect(h.locator('.ped-res')).toContainText('1 persona');
  // la chaqueta no; botas, 2
  await h.locator('input[data-i="1"][data-k="chaqueta"]').fill('0');
  await h.locator('input[data-i="1"][data-k="bota_seguridad"]').fill('2');
  await expect(h.locator('.ped-res')).toContainText('2 × camiseta manga corta');
  await expect(h.locator('.ped-res')).toContainText('2 × botas de seguridad');
  await expect(h.locator('.ped-res')).not.toContainText('chaqueta');
  // «No» a todos los marcados en pantalón
  await h.locator('[data-pk="pantalon"][data-pv="0"]').click();
  await expect(h.locator('.ped-res')).not.toContainText('pantalón');
  await page.addScriptTag({ content: 'window.XLSX=window.XLSX||{utils:{book_new:()=>({S:[]}),json_to_sheet:r=>({r}),book_append_sheet:(w,s,n)=>w.S.push([n,s.r])},writeFile:(w,n)=>{window.__xl={n,S:w.S};}};' });
  await h.locator('[data-ok]').click(); await page.waitForTimeout(500);
  const xl = await page.evaluate(() => window.__xl);
  const ped = xl.S.find(x => x[0] === 'Pedido')[1];
  expect(ped).toEqual([
    { Prenda: 'Camiseta manga corta', Talla: 'M', 'Uds. a pedir': 2, Personas: 'Ahmed El Hait (2)' },
    { Prenda: 'Botas de seguridad con puntera reforzada', Talla: '42', 'Uds. a pedir': 2, Personas: 'Ahmed El Hait (2)' }]);
  expect(st.llamadas.filter(x => x.error)).toEqual([]);
});
