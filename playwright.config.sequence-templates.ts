import type { PlaywrightTestConfig } from '@playwright/test';
import path from 'path';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resultsPath = path.join('e2e-test-results/sequence-templates');

export const STORAGE_STATE = path.join(__dirname, `e2e-test-results/.auth/user.json`);

const config: PlaywrightTestConfig = {
  forbidOnly: !!process.env.CI,
  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },
    {
      dependencies: ['setup'],
      name: 'e2e sequence template tests',
      testDir: './e2e-tests',
      testMatch: /.*\/sequence-templates\.test\.ts/,
      use: {
        storageState: STORAGE_STATE,
      },
    },
    {
      dependencies: ['e2e sequence template tests'],
      name: 'teardown',
      testMatch: /global\.teardown\.ts/,
    },
  ],
  reportSlowTests: {
    max: 0,
    threshold: 60000,
  },
  reporter: [
    [process.env.CI ? 'github' : 'list'],
    ['html', { open: 'never', outputFile: 'index.html', outputFolder: resultsPath }],
    ['json', { outputFile: `${resultsPath}/json-results.json` }],
    ['junit', { outputFile: `${resultsPath}/junit-results.xml` }],
  ],
  retries: 2,
  testDir: './e2e-tests',
  use: {
    baseURL: 'http://localhost:3000',
    browserName: 'chromium',
    trace: process.env.CI ? 'retain-on-failure' : 'off',
    video: process.env.CI ? 'retain-on-failure' : 'off',
  },
  webServer: {
    command: 'PUBLIC_COMMAND_EXPANSION_MODE=templating npm run preview',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
};

export default config;
