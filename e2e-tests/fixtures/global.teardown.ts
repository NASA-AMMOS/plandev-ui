import { test as setup } from '@playwright/test';
import { existsSync, unlinkSync } from 'fs';
import { STORAGE_STATE } from '../../playwright.config';

/**
 * Global teardown
 *
 * @see https://playwright.dev/docs/test-global-setup-teardown
 * @see https://dev.to/playwright/a-better-global-setup-in-playwright-reusing-login-with-project-dependencies-14
 */

setup('teardown', async () => {
  if (existsSync(STORAGE_STATE)) {
    unlinkSync(STORAGE_STATE);
  }
});
