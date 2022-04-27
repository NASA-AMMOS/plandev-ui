import { expect, test as base } from '@playwright/test';
import { AppNav } from '../fixtures/AppNav.js';

const test = base.extend<{ appNav: AppNav }>({
  appNav: async ({ page }, use) => {
    const appNav = new AppNav(page);
    await page.goto('/plans');
    await use(appNav);
  },
});

test.describe('App Nav', () => {
  test('Initially the app menu should hidden', async ({ appNav }) => {
    await expect(appNav.appMenuButton).toBeVisible();
    await expect(appNav.appMenu).not.toBeVisible();
  });

  test('Clicking on the app menu button should open the menu', async ({ appNav }) => {
    await appNav.appMenuButton.click();
    await appNav.appMenu.waitFor({ state: 'visible' });
    await expect(appNav.appMenu).toBeVisible();
  });

  test('Clicking on the app menu button twice should open and close the menu', async ({ appNav }) => {
    await expect(appNav.appMenu).not.toBeVisible();
    await appNav.appMenuButton.click();
    await appNav.appMenu.waitFor({ state: 'visible' });
    await expect(appNav.appMenu).toBeVisible();
    await appNav.appMenuButton.click();
    await appNav.appMenu.waitFor({ state: 'hidden' });
    await expect(appNav.appMenu).not.toBeVisible();
  });

  test(`Clicking on the app menu 'Plans' option should route to the plans page`, async ({ appNav, baseURL, page }) => {
    await page.goto('/models');
    await appNav.appMenuButton.click();
    await appNav.appMenu.waitFor({ state: 'visible' });
    await appNav.appMenuItemPlans.click();
    await expect(page).toHaveURL(`${baseURL}/plans`);
  });

  test(`Clicking on the app menu 'Models' option should route to the models page`, async ({
    appNav,
    baseURL,
    page,
  }) => {
    await appNav.appMenuButton.click();
    await appNav.appMenu.waitFor({ state: 'visible' });
    await appNav.appMenuItemModels.click();
    await expect(page).toHaveURL(`${baseURL}/models`);
  });

  test(`Clicking on the app menu 'Gateway' option should open a new tab to the gateway page`, async ({
    appNav,
    page,
  }) => {
    await appNav.appMenuButton.click();
    await appNav.appMenu.waitFor({ state: 'visible' });
    const [gatewayPage] = await Promise.all([page.waitForEvent('popup'), appNav.appMenuItemGateway.click()]);
    expect(await gatewayPage.title()).toEqual('Aerie Gateway');
    await gatewayPage.close();
  });

  test(`Clicking on the app menu 'GraphQL Playground' option should open a new tab to the playground page`, async ({
    appNav,
    page,
  }) => {
    await appNav.appMenuButton.click();
    await appNav.appMenu.waitFor({ state: 'visible' });
    const [playgroundPage] = await Promise.all([page.waitForEvent('popup'), appNav.appMenuItemPlayground.click()]);
    expect(await playgroundPage.title()).toContain('Playground');
    await playgroundPage.close();
  });

  test(`Clicking on the app menu 'Logout' option should route to the login page`, async ({ appNav, baseURL, page }) => {
    await appNav.appMenuButton.click();
    await appNav.appMenu.waitFor({ state: 'visible' });
    await appNav.appMenuItemLogout.click();
    await expect(page).toHaveURL(`${baseURL}/login`);
  });

  test(`Clicking on the app menu 'About' option should open the about modal`, async ({ appNav }) => {
    await expect(appNav.aboutModal).not.toBeVisible();
    await appNav.appMenuButton.click();
    await appNav.appMenu.waitFor({ state: 'visible' });
    await appNav.appMenuItemAbout.click();
    await appNav.aboutModal.waitFor({ state: 'visible' });
    await expect(appNav.aboutModal).toBeVisible();
    await appNav.aboutModalCloseButton.click();
    await appNav.aboutModal.waitFor({ state: 'hidden' });
    await expect(appNav.aboutModal).not.toBeVisible();
  });
});
