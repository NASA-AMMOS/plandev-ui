import fs from 'fs';
import path from 'path';
import { test as setup } from '@playwright/test';
import { SHARED_TEST_DATA, STORAGE_STATE } from '../../playwright.config.js';
import { AerieApi, type SharedTestData } from '../utilities/api.js';
import { User } from './User.js';

/**
 * Global setup
 *
 * @see https://playwright.dev/docs/test-global-setup-teardown
 * @see https://dev.to/playwright/a-better-global-setup-in-playwright-reusing-login-with-project-dependencies-14
 */

setup('create test users and save auth state', async ({ page }, testInfo) => {
  const baseURL = testInfo.project.use.baseURL ?? '';

  const testUser = new User(page, 'test');
  const userA = new User(page, 'userA');
  const userB = new User(page, 'userB');

  // Add a couple of other test users to the database by logging in as them for use in certain tests
  await userA.login(baseURL);
  await userA.logout(baseURL);

  await userB.login(baseURL);
  await userB.logout(baseURL);

  // Log in as the main test user for most of the tests
  await testUser.login(baseURL);

  await page.context().storageState({ path: STORAGE_STATE });
});

setup('upload test JAR and save shared test data', async () => {
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
