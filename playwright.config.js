/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  reporter: [
    [process***REMOVED***.CI ? 'github' : 'list'],
    ['html', { outputFile: 'index.html', outputFolder: 'test-results' }],
    ['json', { outputFile: 'test-results/json-results.json' }],
    ['junit', { outputFile: 'test-results/junit-results.xml' }],
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
