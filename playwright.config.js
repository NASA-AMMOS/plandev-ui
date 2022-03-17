/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  use: {
    baseURL: 'http://localhost:3000',
    browserName: 'chromium',
  },
  webServer: {
    command: 'ORIGIN=http://localhost:3000 node build',
    port: 3000,
  },
};

export default config;
