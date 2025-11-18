import { test as setup } from '@playwright/test';
import { STORAGE_STATE } from '../../playwright.config.js';
import { User } from './User.js';

/**
 * Global setup
 *
 * @see https://playwright.dev/docs/test-global-setup-teardown
 * @see https://dev.to/playwright/a-better-global-setup-in-playwright-reusing-login-with-project-dependencies-14
 */

setup('set up users and log in', async ({ page }, testInfo) => {
  const baseURL = testInfo.project.use.baseURL ?? '';

  const testUser = new User(page, 'test');
  const userA = new User(page, 'userA');
  const userB = new User(page, 'userB');

  // Add a couple of other test users to the database by logging in as them for use in certain tests
  // TODO: find a way to delete these test users. Cannot import the reqHasura into playwright due
  // to svelte runtime libraries that there is no solution or mock for as of 4/3/24.
  // see https://github.com/microsoft/playwright/issues/18825#issuecomment-1421523694
  await userA.login(baseURL);
  await userA.logout(baseURL);

  await userB.login(baseURL);
  await userB.logout(baseURL);

  // Log in as the main test user for most of the tests
  await testUser.login(baseURL);

  await page.context().storageState({ path: STORAGE_STATE });
});
