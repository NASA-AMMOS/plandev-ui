import type { PlaywrightTestConfig } from '@playwright/test';
import path from 'path';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const STORAGE_STATE = path.join(__dirname, 'e2e-test-results/.auth/user.json');

const MAIN_TEST_SUITE_BASE_URL = 'http://localhost:3000';
const SEQUENCE_TEMPLATE_TEST_SUITE_BASE_URL = 'http://localhost:3001';

const config: PlaywrightTestConfig = {
  forbidOnly: !!process.env.CI,
  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
      use: {
        baseURL: MAIN_TEST_SUITE_BASE_URL,
      },
    },
    {
      dependencies: ['setup'],
      name: 'e2e tests',
      teardown: 'teardown',
      testDir: './e2e-tests',
      testIgnore: /.*\/sequence-templates\.test\.ts/,
      use: {
        baseURL: MAIN_TEST_SUITE_BASE_URL,
        storageState: STORAGE_STATE,
      },
    },
    {
      dependencies: ['setup'],
      name: 'e2e sequence template tests',
      teardown: 'teardown',
      testDir: './e2e-tests',
      testMatch: /.*\/sequence-templates\.test\.ts/,
      use: {
        baseURL: SEQUENCE_TEMPLATE_TEST_SUITE_BASE_URL,
        storageState: STORAGE_STATE,
      },
    },
    {
      name: 'teardown',
      testMatch: /global\.teardown\.ts/,
      use: {
        storageState: STORAGE_STATE,
      },
    },
  ],
  reportSlowTests: {
    max: 0,
    threshold: 60000,
  },
  reporter: [
    [process.env.CI ? 'github' : 'list'],
    ['html', { open: 'never', outputFile: 'index.html', outputFolder: 'e2e-test-results' }],
    ['json', { outputFile: 'e2e-test-results/json-results.json' }],
    ['junit', { outputFile: 'e2e-test-results/junit-results.xml' }],
  ],
  retries: 2,
  testDir: './e2e-tests',
  use: {
    browserName: 'chromium',
    trace: process.env.CI ? 'retain-on-failure' : 'off',
    video: process.env.CI ? 'retain-on-failure' : 'off',
  },
  webServer: [
    {
      command: 'npm run preview',
      port: 3000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'PUBLIC_COMMAND_EXPANSION_MODE=templating npm run preview',
      port: 3001,
    },
  ],
};

export default config;
