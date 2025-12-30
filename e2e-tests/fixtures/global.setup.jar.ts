import { test as setup } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { SHARED_TEST_DATA } from '../../playwright.config.js';
import { AerieApi, type SharedTestData } from '../utilities/api.js';

/**
 * JAR Setup - Uploads test JAR and caches shared test data
 *
 * @see https://playwright.dev/docs/test-global-setup-teardown
 */

// ANSI color codes to match Playwright's output style
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

setup('upload test JAR and save shared test data', async () => {
  // Check if shared test data already exists (useful for debug mode to skip JAR upload)
  if (fs.existsSync(SHARED_TEST_DATA)) {
    console.log(
      `  ${cyan('ℹ')}    [setup-jar]   Using cached JAR data ${dim('(run npm run test:e2e:clear-cache to force fresh upload)\n')}`,
    );
    return;
  }

  const api = new AerieApi();
  await api.login('test', 'test');
  const jarId = await api.uploadFile('e2e-tests/data/banananation-develop.jar');

  const sharedData: SharedTestData = {
    jarId,
  };

  // Ensure the directory exists
  const sharedDir = path.dirname(SHARED_TEST_DATA);
  if (!fs.existsSync(sharedDir)) {
    fs.mkdirSync(sharedDir, { recursive: true });
  }

  fs.writeFileSync(SHARED_TEST_DATA, JSON.stringify(sharedData, null, 2));
});
