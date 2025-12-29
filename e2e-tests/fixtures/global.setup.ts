import fs from 'fs';
import path from 'path';
import { test as setup } from '@playwright/test';
import {
  SHARED_TEST_DATA,
  STORAGE_STATE,
  STORAGE_STATE_USER_A,
  STORAGE_STATE_USER_B,
} from '../../playwright.config.js';
import { AerieApi, type SharedTestData } from '../utilities/api.js';
import { User } from './User.js';

/**
 * Global setup
 *
 * @see https://playwright.dev/docs/test-global-setup-teardown
 * @see https://dev.to/playwright/a-better-global-setup-in-playwright-reusing-login-with-project-dependencies-14
 */

setup('create test users and save auth state', async ({ page, browser }, testInfo) => {
  const baseURL = testInfo.project.use.baseURL ?? '';

  // Ensure the auth directory exists
  const authDir = path.dirname(STORAGE_STATE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Create and save auth state for userA
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  const userA = new User(pageA, 'userA');
  await userA.login(baseURL);
  await contextA.storageState({ path: STORAGE_STATE_USER_A });
  await pageA.close();
  await contextA.close();

  // Create and save auth state for userB
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  const userB = new User(pageB, 'userB');
  await userB.login(baseURL);
  await contextB.storageState({ path: STORAGE_STATE_USER_B });
  await pageB.close();
  await contextB.close();

  // Log in as the main test user and save auth state (default for most tests)
  const testUser = new User(page, 'test');
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
