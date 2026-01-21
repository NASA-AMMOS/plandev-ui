import { test as setup } from '@playwright/test';

/**
 * Global teardown
 *
 * Auth state files are preserved between runs for faster debug iterations.
 * Use `npm run test:e2e:clear-cache` to force fresh login.
 *
 * @see https://playwright.dev/docs/test-global-setup-teardown
 * @see https://dev.to/playwright/a-better-global-setup-in-playwright-reusing-login-with-project-dependencies-14
 */

setup('teardown', async () => {
  // Auth state is intentionally preserved for debug workflow
  // Clean up with: npm run test:e2e:clear-cache
});
