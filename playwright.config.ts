import type { PlaywrightTestConfig } from '@playwright/test';
import path from 'path';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const STORAGE_STATE = path.join(__dirname, 'e2e-test-results/.auth/user.json');

const config: PlaywrightTestConfig = {
  forbidOnly: !!process***REMOVED***.CI,
  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },
    {
      dependencies: ['setup'],
      name: 'e2e tests',
      testMatch: '**/*.test.ts',
      use: {
        storageState: STORAGE_STATE,
      },
    },
    {
      dependencies: ['e2e tests'],
      name: 'teardown',
      testMatch: /global\.teardown\.ts/,
    },
  ],
  reportSlowTests: {
    max: 0,
    threshold: 60000,
  },
  reporter: [
    [process***REMOVED***.CI ? 'github' : 'list'],
    ['html', { open: 'never', outputFile: 'index.html', outputFolder: 'e2e-test-results' }],
    ['json', { outputFile: 'e2e-test-results/json-results.json' }],
    ['junit', { outputFile: 'e2e-test-results/junit-results.xml' }],
  ],
  retries: 2,
  testDir: './e2e-tests',
  use: {
    baseURL: 'http://localhost:3000',
    browserName: 'chromium',
    trace: process***REMOVED***.CI ? 'retain-on-failure' : 'off',
    video: process***REMOVED***.CI ? 'retain-on-failure' : 'off',
  },
  webServer: {
    command: 'npm run preview',
    port: 3000,
  },
};

export default config;
