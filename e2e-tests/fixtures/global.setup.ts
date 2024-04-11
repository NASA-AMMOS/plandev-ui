import { test as setup } from '@playwright/test';
import { STORAGE_STATE } from '../../playwright.config';
import playwrightConfig from '../../playwright.config.js';
import { performLogin } from './User.js';

/**
 * Global setup
 *
 * @see https://playwright.dev/docs/test-global-setup-teardown
 * @see https://dev.to/playwright/a-better-global-setup-in-playwright-reusing-login-with-project-dependencies-14
 */

setup('login', async ({ page }) => {
  const baseURL = playwrightConfig.use?.baseURL ?? '';
  await performLogin(page, baseURL);
  await page.context().storageState({ path: STORAGE_STATE });
});
