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

  // Helper to create and save auth state for a user
  async function createUserAuthState(
    username: string,
    storagePath: string,
    existingPage?: typeof page,
  ): Promise<void> {
    if (existingPage) {
      // Use existing page/context (for the main test user)
      const user = new User(existingPage, username);
      await user.login(baseURL);
      await existingPage.context().storageState({ path: storagePath });
    } else {
      // Create new context for this user
      const context = await browser.newContext();
      const newPage = await context.newPage();
      const user = new User(newPage, username);
      await user.login(baseURL);
      await context.storageState({ path: storagePath });
      await newPage.close();
      await context.close();
    }
  }

  // Run all user authentications in parallel for faster setup
  await Promise.all([
    createUserAuthState('test', STORAGE_STATE, page),
    createUserAuthState('userA', STORAGE_STATE_USER_A),
    createUserAuthState('userB', STORAGE_STATE_USER_B),
  ]);
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
