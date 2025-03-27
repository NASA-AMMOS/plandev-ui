import { test as setup } from '@playwright/test';
import { STORAGE_STATE } from '../../playwright.config.js';
import { performLogin } from './User.js';

/**
 * Global setup
 *
 * @see https://playwright.dev/docs/test-global-setup-teardown
 * @see https://dev.to/playwright/a-better-global-setup-in-playwright-reusing-login-with-project-dependencies-14
 */

setup('login', async ({ page }, testInfo) => {
  const baseURL = testInfo.project.use.baseURL ?? '';
  await performLogin(page, baseURL);
  await page.context().storageState({ path: STORAGE_STATE });
});
