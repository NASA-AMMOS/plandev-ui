import { test as setup } from '@playwright/test';
import { existsSync, PathLike, unlinkSync } from 'fs';

/**
 * Global teardown
 *
 * @see https://playwright.dev/docs/test-global-setup-teardown
 * @see https://dev.to/playwright/a-better-global-setup-in-playwright-reusing-login-with-project-dependencies-14
 */

setup('teardown', async ({ page: _page }, testInfo) => {
  if (existsSync(testInfo.project.use.storageState as PathLike)) {
    unlinkSync(testInfo.project.use.storageState as PathLike);
  }
});
