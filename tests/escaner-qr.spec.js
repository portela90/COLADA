// Escáner leyendo un QR de verdad con la cámara (simulada con un vídeo del QR del horno F29), sin el lector del móvil, como en iPhone.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const QR = require('qrcode');
const { pulsa } = require('./util');
const { abre, ADMIN } = require('./limp');

/* vídeo Y4M (escala de grises) con el QR en el centro */
const VID = path.join(__dirname, '.tmp', 'qr-hf29.y4m');
(function () {
  fs.mkdirSync(path.dirname(VID), { recursive: true });
  const W = 640, H = 480, m = QR.create('https://portela90.github.io/COLADA/limpieza.html?el=H-F29', { errorCorrectionLevel: 'M' }).modules;
  const n = m.size, celda = Math.floor(300 / (n + 8)), lado = celda * (n + 8), x0 = (W - lado) / 2 | 0, y0 = (H - lado) / 2 | 0;
  const Y = Buffer.alloc(W * H, 235);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m.get(y, x))
    for (let dy = 0; dy < celda; dy++) for (let dx = 0; dx < celda; dx++) Y[(y0 + (y + 4) * celda + dy) * W + x0 + (x + 4) * celda + dx] = 16;
  const UV = Buffer.alloc((W / 2) * (H / 2), 128), fr = Buffer.concat([Buffer.from('FRAME\n'), Y, UV, UV]);
  fs.writeFileSync(VID, Buffer.concat([Buffer.from(`YUV4MPEG2 W${W} H${H} F10:1 Ip A1:1 C420jpeg\n`)].concat(Array(5).fill(fr))));
})();
const base = require('./playwright.config').use.launchOptions || {};
test.use({ launchOptions: Object.assign({}, base, { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--use-file-for-fake-video-capture=' + VID] }), permissions: ['camera'] });

test('lee el QR del horno con la cámara y abre su ficha', async ({ page }) => {
  await page.addInitScript(() => { delete window.BarcodeDetector; });
  const { err } = await abre(page, ADMIN);
  await pulsa(page, 'Inyectoras y hornos'); await page.waitForTimeout(300);
  await pulsa(page, 'Escanear código QR');
  await expect(page.getByText('Horno mantenedor F29').first()).toBeVisible({ timeout: 10000 });
  expect(await page.locator('.esc-ov').count()).toBe(0);
  expect(err).toEqual([]);
});
