import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { AppNav } from '../fixtures/AppNav.js';

let appNav: AppNav;
let context: BrowserContext;
let page: Page;

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext();
  page = await context.newPage();
  appNav = new AppNav(page);
});

test.afterAll(async () => {
  await page.close();
  await context.close();
});

test.describe.serial('App Nav', () => {
  test.beforeEach(async () => {
    await appNav.goto();
  });

  test('Initially the app menu should hidden', async () => {
    await expect(appNav.appMenuButton).toBeVisible();
    await expect(appNav.appMenu).not.toBeVisible();
  });

  test('Clicking on the app menu button should open the menu', async () => {
    await appNav.appMenuButton.click();
    await appNav.appMenu.waitFor({ state: 'attached' });
    await appNav.appMenu.waitFor({ state: 'visible' });
    await expect(appNav.appMenu).toBeVisible();
  });

  test('Clicking on the app menu button twice should open and close the menu', async () => {
    await expect(appNav.appMenu).not.toBeVisible();
    await appNav.appMenuButton.click();
    await appNav.appMenu.waitFor({ state: 'attached' });
    await appNav.appMenu.waitFor({ state: 'visible' });
    await expect(appNav.appMenu).toBeVisible();
    await appNav.appMenuButton.click();
    await appNav.appMenu.waitFor({ state: 'detached' });
    await appNav.appMenu.waitFor({ state: 'hidden' });
    await expect(appNav.appMenu).not.toBeVisible();
  });

  test(`Clicking on the app menu 'Plans' option should route to the plans page`, async ({ baseURL }) => {
    await page.goto('/models', { waitUntil: 'networkidle' });
    await appNav.appMenuButton.click();
    await appNav.appMenu.waitFor({ state: 'attached' });
    await appNav.appMenu.waitFor({ state: 'visible' });
    await appNav.appMenuItemPlans.click();
    await expect(page).toHaveURL(`${baseURL}/plans`);
  });

  test(`Clicking on the app menu 'Models' option should route to the models page`, async ({ baseURL }) => {
    await appNav.appMenuButton.click();
    await appNav.appMenu.waitFor({ state: 'attached' });
    await appNav.appMenu.waitFor({ state: 'visible' });
    await appNav.appMenuItemModels.click();
    await expect(page).toHaveURL(`${baseURL}/models`);
  });

  test(`Clicking on the app menu 'Dictionaries' option should route to the dictionaries page`, async ({ baseURL }) => {
    await appNav.appMenuButton.click();
    await appNav.appMenu.waitFor({ state: 'attached' });
    await appNav.appMenu.waitFor({ state: 'visible' });
    await appNav.appMenuItemDictionaries.click();
    await expect(page).toHaveURL(`${baseURL}/dictionaries`);
  });

  test(`Clicking on the app menu 'Expansion' option should route to the expansion/rules page`, async ({ baseURL }) => {
    await appNav.appMenuButton.click();
    await appNav.appMenu.waitFor({ state: 'attached' });
    await appNav.appMenu.waitFor({ state: 'visible' });
    await appNav.appMenuItemExpansion.click();
    await expect(page).toHaveURL(`${baseURL}/expansion/rules`);
  });

  test(`Clicking on the app menu 'Scheduling' option should route to the scheduling page`, async ({ baseURL }) => {
    await appNav.appMenuButton.click();
    await appNav.appMenu.waitFor({ state: 'attached' });
    await appNav.appMenu.waitFor({ state: 'visible' });
    await appNav.appMenuItemScheduling.click();
    await expect(page).toHaveURL(`${baseURL}/scheduling`);
  });

  test(`Clicking on the app menu 'Gateway' option should open a new tab to the gateway page`, async () => {
    await appNav.appMenuButton.click();
    await appNav.appMenu.waitFor({ state: 'attached' });
    await appNav.appMenu.waitFor({ state: 'visible' });
    const [gatewayPage] = await Promise.all([page.waitForEvent('popup'), appNav.appMenuItemGateway.click()]);
    expect(await gatewayPage.title()).toEqual('Aerie Gateway');
    await gatewayPage.close();
  });

  test(`Clicking on the app menu 'GraphQL Console' option should open a new tab to the console page`, async () => {
    await appNav.appMenuButton.click();
    await appNav.appMenu.waitFor({ state: 'attached' });
    await appNav.appMenu.waitFor({ state: 'visible' });
    const [consolePage] = await Promise.all([page.waitForEvent('popup'), appNav.appMenuItemGraphQLConsole.click()]);
    await consolePage.waitForLoadState('networkidle');
    expect(await consolePage.title()).toContain('API Explorer | Hasura');
    await consolePage.close();
  });

  test(`Clicking on the app menu 'Documentation' option should open a new tab to the Aerie documentation`, async () => {
    await appNav.appMenuButton.click();
    await appNav.appMenu.waitFor({ state: 'attached' });
    await appNav.appMenu.waitFor({ state: 'visible' });
    const [documentationPage] = await Promise.all([
      page.waitForEvent('popup'),
      appNav.appMenuItemDocumentation.click(),
    ]);
    expect(await documentationPage.title()).toContain('Aerie Documentation');
    await documentationPage.close();
  });

  test(`Clicking on the app menu 'Logout' option should route to the plans page (auth disabled)`, async ({
    baseURL,
  }) => {
    await appNav.appMenuButton.click();
    await appNav.appMenu.waitFor({ state: 'attached' });
    await appNav.appMenu.waitFor({ state: 'visible' });
    await appNav.appMenuItemLogout.click();
    await expect(page).toHaveURL(`${baseURL}/plans`);
  });

  test(`Clicking on the app menu 'About' option should open the about modal`, async () => {
    await expect(appNav.aboutModal).not.toBeVisible();
    await appNav.appMenuButton.click();
    await appNav.appMenu.waitFor({ state: 'attached' });
    await appNav.appMenu.waitFor({ state: 'visible' });
    await appNav.appMenuItemAbout.click();
    await appNav.aboutModal.waitFor({ state: 'attached' });
    await appNav.aboutModal.waitFor({ state: 'visible' });
    await expect(appNav.aboutModal).toBeVisible();
    await appNav.aboutModalCloseButton.click();
    await appNav.aboutModal.waitFor({ state: 'detached' });
    await appNav.aboutModal.waitFor({ state: 'hidden' });
    await expect(appNav.aboutModal).not.toBeVisible();
  });
});
