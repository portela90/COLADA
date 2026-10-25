// Toolbox: al cerrar el mes se envían a prevención el PDF del Toolbox y el de las formaciones en el puesto del mes.
// Todo simulado: las llamadas a Supabase y a la función de envío se interceptan (sin internet).
const { test, expect } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LIB = { jspdf: path.join(__dirname, 'node_modules/jspdf/dist/jspdf.umd.min.js'), 'pdf-lib': path.join(__dirname, 'node_modules/pdf-lib/dist/pdf-lib.min.js') };
const FIRMA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

async function montar(page, cfg) {
  const st = { cfg, ses: { id: 's1', anio: 2026, mes: 10, estado: 'abierta', previstos: ['t1', 't2'], enviada_en: '2026-10-02T08:00:00Z', fecha: '2026-10-02' }, envios: [], errores: [] };
  page.on('pageerror', e => st.errores.push(e.message));
  await page.route(/^https?:/, async r => {
    const u = r.request().url();
    for (const k of Object.keys(LIB)) if (u.includes('cdnjs') && u.includes('/' + k + '/')) return r.fulfill({ path: LIB[k], contentType: 'text/javascript' });
    if (u.includes('/functions/v1/envio-prevencion')) {
      const b = JSON.parse(r.request().postData()); st.envios.push(b);
      st.ses = Object.assign({}, st.ses, { prev_enviado_en: '2026-10-25T09:00:00Z', prev_destino: st.cfg.correo_prl });
      return r.fulfill({ json: { ok: true, destino: st.cfg.correo_prl } });
    }
    const m = u.match(/\/rest\/v1\/rpc\/(\w+)/);
    if (m) {
      const a = JSON.parse(r.request().postData() || '{}'); let d = [];
      switch (m[1]) {
        case 'yo': d = { id: 'a1', nombre: 'Jefe', rol: 'admin' }; break;
        case 'prl_meses': d = [{ mes: 10, estado: st.ses.estado, firmas: 1, tema: 'Carretillas' }]; break;
        case 'prl_trabajadores': d = [{ id: 't1', nombre: 'Pepe', rol: 'operario' }, { id: 't2', nombre: 'Luisa', rol: 'operario' }]; break;
        case 'prl_config_leer': d = st.cfg; break;
        case 'prl_config_guardar': Object.assign(st.cfg, a.p); d = st.cfg; break;
        case 'prl_mes': d = { toolbox: { anio: 2026, mes: 10, tema: 'Carretillas', compromiso: 'Usaré el cinturón', cuerpo: 'Texto', puntos: ['Uno'] }, sesion: st.ses,
          firmas: [{ id: 'f1', trabajador: 't1', nombre: 'Pepe', puesto: 'Operario', firmado_en: '2026-10-03T08:00:00Z', firma: FIRMA }] }; break;
        case 'prl_cerrar': st.ses = Object.assign({}, st.ses, { estado: a.p_cerrar ? 'cerrada' : 'abierta', cerrada_en: a.p_cerrar ? '2026-10-25T09:00:00Z' : null }); d = st.ses; break;
        case 'prl_form_lista': d = [{ id: 'fo1', nombre: 'Pepe', fecha: '2026-10-05', tiene_firma: true, items: [1] }, { id: 'fo2', nombre: 'Luisa', fecha: '2026-10-06', tiene_firma: false, items: [1] },
          { id: 'fo3', nombre: 'Ana', fecha: '2026-09-06', tiene_firma: true, items: [1] }]; break;
        case 'prl_envio_manual': st.manual = a; st.ses = Object.assign({}, st.ses, { prev_enviado_en: '2026-10-25T09:30:00Z', prev_destino: a.p_destino }); d = st.ses; break;
        case 'prl_form_firmas': d = [{ id: 'fo1', nombre: 'Pepe', fecha: '2026-10-05', items: [1], firma: FIRMA, firmado_en: '2026-10-05T09:00:00Z', impartida: 'Jefe', duracion: '60' }]; break;
      }
      return r.fulfill({ json: d });
    }
    if (u.startsWith('https://app.test/')) {
      const f = path.join(ROOT, decodeURIComponent(new URL(u).pathname));
      if (fs.existsSync(f) && fs.statSync(f).isFile()) return r.fulfill({ path: f });
      return r.fulfill({ status: 404, body: '' });
    }
    return r.abort();
  });
  await page.addInitScript(() => { localStorage.setItem('limp.tok', '00000000-0000-0000-0000-000000000001'); localStorage.setItem('tb.sec', 'toolbox'); });
  await page.goto('https://app.test/toolbox.html');
  await expect(page.locator('#w')).toBeVisible();
  return st;
}

test('Toolbox: guardar el correo de prevención en Ajustes', async ({ page }) => {
  const st = await montar(page, { centro: 'CIE', formador: 'Jefe', duracion: '15', firma_formador: FIRMA });
  await page.evaluate(() => pantallaAjustes());
  await page.fill('#c_pnom', 'Ana');
  await page.fill('#c_pcor', 'prevencion@ejemplo.com');
  await page.click('#c_save3');
  await expect.poll(() => st.cfg.correo_prl).toBe('prevencion@ejemplo.com');
  expect(st.cfg.correo_prl_nombre).toBe('Ana');
  expect(st.errores).toEqual([]);
});

test('Toolbox: al cerrar el mes se envían los PDF del mes a prevención', async ({ page }) => {
  const st = await montar(page, { centro: 'CIE', formador: 'Jefe', duracion: '15', firma_formador: FIRMA, correo_prl: 'prevencion@ejemplo.com' });
  await page.evaluate(() => pantallaMes(10));
  let aviso = '';
  page.once('dialog', d => { aviso = d.message(); d.accept(); });
  await page.click('#cerrar');
  await expect.poll(() => st.envios.length, { timeout: 20000 }).toBe(1);
  expect(aviso).toContain('prevencion@ejemplo.com');
  expect(aviso).toContain('Faltan 1');
  const e = st.envios[0];
  expect(e.mes).toBe(10);
  expect(e.archivos.map(a => a.nombre)).toEqual(['SH-CORP-FO-IB-031 Toolbox Talk HSE_Octubre 26.pdf', 'F40R304 Formacion en el puesto Octubre 2026.pdf']);
  for (const a of e.archivos) expect(a.b64.startsWith('JVBER')).toBe(true);
  expect(e.resumen).toMatchObject({ firmados: 1, previstos: 2, faltan: ['Luisa'], formaciones: 1, formSinFirmar: 1 });
  await expect(page.getByText('Enviado a prevención')).toBeVisible();
  await expect(page.locator('#prevEnv')).toHaveText('Volver a enviar (automático)');
  expect(st.errores).toEqual([]);
});

test('Toolbox: sin correo de prevención, cerrar el mes no envía nada y avisa', async ({ page }) => {
  const st = await montar(page, { centro: 'CIE', formador: 'Jefe', duracion: '15', firma_formador: FIRMA });
  await page.evaluate(() => pantallaMes(10));
  page.once('dialog', d => d.accept());
  await page.click('#cerrar');
  await expect(page.locator('.toast')).toContainText('pon su correo en Ajustes');
  await expect(page.locator('#prevCfg')).toBeVisible();
  expect(st.envios.length).toBe(0);
  expect(st.errores).toEqual([]);
});

test('Toolbox: enviar yo desde mi Outlook (ordenador): descarga los PDF, abre el correo y se apunta como enviado', async ({ page }) => {
  const st = await montar(page, { centro: 'CIE', formador: 'Jefe', duracion: '15', firma_formador: FIRMA, correo_prl: 'prevencion@ejemplo.com', correo_prl_nombre: 'Ana' });
  // mes ya cerrado (sin envío automático): se envía a mano desde Outlook
  st.ses.estado = 'cerrada'; st.ses.cerrada_en = '2026-10-25T09:00:00Z';
  await page.evaluate(() => pantallaMes(10));
  await page.click('#prevOl');
  await expect(page.locator('#olAbrir')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#prevBox')).toContainText('Arrastra los PDF');
  const descargas = [];
  page.on('download', d => descargas.push(d.suggestedFilename()));
  await page.click('#olAbrir');
  await expect.poll(() => descargas.length, { timeout: 10000 }).toBe(2);
  await page.click('#olHecho');
  await expect.poll(() => st.manual && st.manual.p_destino).toBe('prevencion@ejemplo.com (desde mi correo)');
  await expect(page.getByText('Enviado a prevención')).toBeVisible();
  expect(st.envios.length).toBe(0);
  expect(st.errores).toEqual([]);
});
