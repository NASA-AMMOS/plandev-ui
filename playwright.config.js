/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  reporter: [
    [process***REMOVED***.CI ? 'github' : 'list'],
    ['html', { open: 'never', outputFolder: 'test-report' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    browserName: 'chromium',
  },
  webServer: {
    command: 'ORIGIN=http://localhost:3000 node build',
    env: {
      AUTH_TYPE: 'none',
    },
    port: 3000,
  },
};

export default config;
