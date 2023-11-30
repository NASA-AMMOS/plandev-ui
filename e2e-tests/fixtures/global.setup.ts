import { test as setup } from '@playwright/test';
import { STORAGE_STATE } from '../../playwright.config';
import playwrightConfig from '../../playwright.config.js';

/**
 * Global setup
 *
 * @see https://playwright.dev/docs/test-global-setup-teardown
 * @see https://dev.to/playwright/a-better-global-setup-in-playwright-reusing-login-with-project-dependencies-14
 */

setup('login', async ({ page }) => {
  const baseURL = playwrightConfig.use?.baseURL ?? '';

  await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.locator('input[name="username"]').fill('test');
  await page.locator('input[name="password"]').fill('test');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL(`${baseURL}/plans`);

  await page.context().storageState({ path: STORAGE_STATE });
});
