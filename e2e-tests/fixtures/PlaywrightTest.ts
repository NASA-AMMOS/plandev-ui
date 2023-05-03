import { test as baseTest } from '@playwright/test';
import { existsSync } from 'fs';
import path from 'path';
import playwrightConfig from '../../playwright.config.js';

export * from '@playwright/test';

/**
 * This function extends the Playwright test function with login capability.
 * Currently assumes auth is disabled in the Gateway. We can change this in the future as needed.
 *
 * @see https://playwright.dev/docs/auth#moderate-one-account-per-parallel-worker
 */
export const test = baseTest.extend<any, { workerStorageState: string }>({
  storageState: ({ workerStorageState }, use) => use(workerStorageState),
  workerStorageState: [
    async ({ browser }, use) => {
      const { parallelIndex: id, project } = test.info();
      const fileName = path.resolve(project.outputDir, `.auth/${id}.json`);

      if (existsSync(fileName)) {
        await use(fileName);
      } else {
        const page = await browser.newPage({ storageState: undefined });
        const baseURL = playwrightConfig.use?.baseURL ?? '';

        await page.goto(`${baseURL}/login`);
        await page.locator('input[name="username"]').fill('test');
        await page.locator('input[name="password"]').fill('test');
        await page.getByRole('button', { name: 'Login' }).click();
        await page.waitForURL(`${baseURL}/plans`);
        await page.context().storageState({ path: fileName });
        await page.close();

        await use(fileName);
      }
    },
    { scope: 'worker' },
  ],
});
