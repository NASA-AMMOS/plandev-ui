import { test as setup } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { STORAGE_STATE, STORAGE_STATE_USER_A, STORAGE_STATE_USER_B } from '../../playwright.config.js';
import { User } from './User.js';

/**
 * Auth Setup - Creates and caches authentication state for test users
 *
 * @see https://playwright.dev/docs/test-global-setup-teardown
 * @see https://dev.to/playwright/a-better-global-setup-in-playwright-reusing-login-with-project-dependencies-14
 */

// ANSI color codes to match Playwright's output style
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

// Check if all auth state files already exist BEFORE requesting browser fixtures
const allAuthFilesExist = () => {
  const exists = [STORAGE_STATE, STORAGE_STATE_USER_A, STORAGE_STATE_USER_B].every(filePath => fs.existsSync(filePath));
  if (exists) {
    console.log(
      `  ${cyan('ℹ')}    [setup-auth]   Using cached auth state ${dim('(run npm run test:e2e:clear-cache to force fresh login)')}\n`,
    );
  }
  return exists;
};

// Skip auth setup entirely if cache exists - prevents browser windows from opening in debug mode
setup.skip(allAuthFilesExist, 'cached auth state exists');

setup('create test users and save auth state', async ({ page, browser }, testInfo) => {
  const baseURL = testInfo.project.use.baseURL ?? '';

  // Ensure the auth directory exists
  const authDir = path.dirname(STORAGE_STATE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Helper to create and save auth state for a user
  async function createUserAuthState(username: string, storagePath: string, existingPage?: typeof page): Promise<void> {
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
