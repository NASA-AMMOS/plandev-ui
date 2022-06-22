import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  forbidOnly: !!process***REMOVED***.CI,
  reporter: [
    [process***REMOVED***.CI ? 'github' : 'list'],
    ['html', { open: 'never', outputFile: 'index.html', outputFolder: 'e2e-test-results' }],
    ['json', { outputFile: 'e2e-test-results/json-results.json' }],
    ['junit', { outputFile: 'e2e-test-results/junit-results.xml' }],
  ],
  retries: 0,
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    browserName: 'chromium',
    trace: process***REMOVED***.CI ? 'retain-on-failure' : 'off',
    video: process***REMOVED***.CI ? 'retain-on-failure' : 'off',
  },
  webServer: {
    command: 'node build',
    env: {
      AUTH_TYPE: 'none',
      ORIGIN: 'http://localhost:3000',
    },
    port: 3000,
  },
};

export default config;
