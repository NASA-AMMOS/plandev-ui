import test, { type BrowserContext, type Page } from '@playwright/test';
import { OIDC } from '../fixtures/OIDC';

let context: BrowserContext;
let page: Page;

const users = [
  {
    password: 'password',
    username: 'AerieAdmin',
  },
  {
    password: 'password',
    username: 'AerieUser',
  },
  {
    password: 'password',
    username: 'AerieViewer',
  },
];

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext();
  page = await context.newPage();
});

test.afterAll(async () => {
  await page.close();
  await context.close();
});

test.describe('Different Logins', () => {
  // need to destroy everything between test runs
  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await page.close();
    await context.close();
  });

  test('Login as admin', async () => {
    const { username, password } = users[0];

    const oidc = new OIDC(page, username, password);
    await oidc.login();
    await oidc.checkCookieRoles();
    await oidc.checkCurrentRole();
  });
  test('Login as user', async () => {
    const { username, password } = users[1];

    const oidc = new OIDC(page, username, password);
    await oidc.login();
    await oidc.checkCookieRoles();
    await oidc.checkCurrentRole();
  });
  test('Login as viewer', async () => {
    const { username, password } = users[2];

    const oidc = new OIDC(page, username, password);
    await oidc.login();
    await oidc.checkCookieRoles();

    // the current role box/option won't be visible
  });
});

test.describe('Refresh Functionality', () => {
  test('Refresh as any user', async () => {
    // user doesn't matter, so pick randomly
    const { username, password } = users[Math.floor(Math.random() * 3)];

    const oidc = new OIDC(page, username, password);

    // you might be thinking - why essentially re-test login? why not just inject an access token?
    //      the reason is that the logic required to get an access token that always works
    //      requires a fair bit of extra work and logic to make sure it always works, which would
    //      require forging a token from scratch to ensure time properties and all were correct (requiring
    //      experimentation here AS WELL AS some modification of the keycloak configuration itself to
    //      ensure there is a fixed, predictable JWT key...simply re-logging in seems like the easier
    //      option implementationwise but we can explore the other option if this is too cumbersome)
    await oidc.login();
    await oidc.refresh();
  });
});

test.describe('Logout Functionality', () => {
  test('Logout as any user', async () => {
    // user doesn't matter, so pick randomly
    const { username, password } = users[Math.floor(Math.random() * 3)];

    const oidc = new OIDC(page, username, password);
    await oidc.login();
    await page.waitForTimeout(2000); // wait for a sec
    await oidc.logout();
  });
});
