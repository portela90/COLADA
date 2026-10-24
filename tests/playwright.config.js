// Pruebas de las apps con Chromium. En local usa el Chromium del sistema si existe.
const fs = require('fs');
const local = '/opt/pw-browsers/chromium';
module.exports = {
  testDir: __dirname,
  testMatch: /.*\.spec\.js$/,
  timeout: 45000,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    launchOptions: fs.existsSync(local) && !process.env.CI ? { executablePath: local } : {},
  },
};
