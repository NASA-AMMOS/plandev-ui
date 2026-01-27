import type { PlaywrightTestConfig } from '@playwright/test';
import path from 'path';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage state paths for different test users
// These are stored outside e2e-test-results to avoid being wiped by the HTML reporter
export const STORAGE_STATE = path.join(__dirname, '.playwright/.auth/test.json');
export const STORAGE_STATE_USER_A = path.join(__dirname, '.playwright/.auth/userA.json');
export const STORAGE_STATE_USER_B = path.join(__dirname, '.playwright/.auth/userB.json');
export const SHARED_TEST_DATA = path.join(__dirname, '.playwright/.shared/test-data.json');

// Map of user names to their storage state paths
export const USER_STORAGE_STATES: Record<string, string> = {
  test: STORAGE_STATE,
  userA: STORAGE_STATE_USER_A,
  userB: STORAGE_STATE_USER_B,
};

const MAIN_TEST_SUITE_BASE_URL = 'http://localhost:3000';
const SEQUENCE_TEMPLATE_TEST_SUITE_BASE_URL = 'http://localhost:3001';

const config: PlaywrightTestConfig = {
  forbidOnly: !!process.env.CI,
  projects: [
    {
      name: 'setup-auth',
      testMatch: /global\.setup\.auth\.ts/,
      use: {
        baseURL: MAIN_TEST_SUITE_BASE_URL,
      },
    },
    {
      name: 'setup-jar',
      testMatch: /global\.setup\.jar\.ts/,
    },
    {
      dependencies: ['setup-auth', 'setup-jar'],
      name: 'e2e tests',
      teardown: 'teardown',
      testDir: './e2e-tests',
      testIgnore: [/.*\/sequence-templates\.test\.ts/],
      use: {
        baseURL: MAIN_TEST_SUITE_BASE_URL,
        storageState: STORAGE_STATE,
      },
    },
    {
      dependencies: ['setup-auth', 'setup-jar'],
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
    },
  ],
  reportSlowTests: {
    max: 0,
    threshold: 60000,
  },
  reporter: [
    ['list'],
    ...(process.env.CI ? [['github'] as const] : []),
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
