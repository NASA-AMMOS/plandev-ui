import test, { expect, type BrowserContext, type Page } from '@playwright/test';
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

test.describe('Different Logins', () => {
  // Fresh browser context per test — login tests need isolated session/cookie
  // state, otherwise the previous user's tokens or Keycloak SSO cookie bleed
  // through and the next test never sees the "Login Using OIDC" landing page.
  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterEach(async () => {
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

    // Viewer has only one allowed role, so the role-switch combobox is suppressed
    // (Nav.svelte gates it on userRoles.length > 1). Lock that in via the
    // role-switcher's aria-label, since /plans has other comboboxes (filters etc.)
    // that we don't want to assert against.
    await expect(page.getByLabel('Select Role')).not.toBeVisible();
  });
});

test.describe('Refresh Functionality', () => {
  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await page.close();
    await context.close();
  });

  // AerieAdmin exercises the most surface (most allowed roles) — pin it for reproducibility.
  test('Refresh as admin', async () => {
    const { username, password } = users[0];

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
  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await page.close();
    await context.close();
  });

  test('Logout as admin', async () => {
    const { username, password } = users[0];

    const oidc = new OIDC(page, username, password);
    await oidc.login();
    await page.waitForTimeout(2000); // wait for a sec
    await oidc.logout();
  });
});

test.describe('Tab Backgrounding', () => {
  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await page.close();
    await context.close();
  });

  // Chrome throttles background-tab setTimeout to 1s minimum after the tab
  // has been hidden for a few minutes. Playwright can't actually drive the
  // OS-level visibility throttling, but we can simulate the
  // visibilitychange event the way Chrome's throttling first manifests,
  // wait past the refresh window, and verify the next API call still works
  // (whether refresh actually fired in time or the fallback recovered).
  test('Refresh survives a visibilitychange to hidden', async () => {
    const { username, password } = users[0];
    const oidc = new OIDC(page, username, password);

    await oidc.login();
    await page.waitForURL('**/plans');

    const cookiesBefore = await context.cookies();
    const oldAccessToken = cookiesBefore.find(c => c.name === 'accessToken')?.value;
    expect(oldAccessToken).toBeTruthy();

    // Make the page report itself as hidden.
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Wait past the refresh window — accessToken should rotate even while
    // the tab is "hidden" (Playwright doesn't actually throttle timers,
    // but the test still proves the refresh path doesn't depend on
    // visibility state).
    await expect
      .poll(
        async () => {
          const cookies = await context.cookies();
          return cookies.find(c => c.name === 'accessToken')?.value;
        },
        { intervals: [500, 1000, 2000], timeout: 15000 },
      )
      .not.toBe(oldAccessToken);

    // Restore visibility and reload — page should remain authenticated
    // (still on /plans, no redirect to /login).
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.reload();
    expect(page.url()).toContain('/plans');
  });
});

test.describe('Multi-tab Refresh', () => {
  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await page.close();
    await context.close();
  });

  // Two tabs sharing the same context (= same cookies) both run their own
  // setTimeout-based refresh. If the IdP rotates refresh tokens, the second
  // tab's refresh attempt could fail. This test verifies that at least one
  // tab successfully rotated tokens and neither was kicked back to /login.
  test('Two tabs survive a refresh cycle', async () => {
    const { username, password } = users[0];
    const oidc = new OIDC(page, username, password);

    await oidc.login();
    await page.waitForURL('**/plans');

    const cookiesBefore = await context.cookies();
    const oldAccessToken = cookiesBefore.find(c => c.name === 'accessToken')?.value;
    expect(oldAccessToken).toBeTruthy();

    // Open a second tab in the same context. Cookies are shared, so it picks
    // up the existing session without going through OIDC login again.
    const secondPage = await context.newPage();
    try {
      await secondPage.goto('/plans');
      await secondPage.waitForURL('**/plans');

      // Wait for the refresh timer to fire. We don't know the exact TTL
      // configured at the IdP, so poll the accessToken cookie for any change.
      await expect
        .poll(
          async () => {
            const cookies = await context.cookies();
            return cookies.find(c => c.name === 'accessToken')?.value;
          },
          { intervals: [500, 1000, 2000], timeout: 15000 },
        )
        .not.toBe(oldAccessToken);

      // Neither tab should have been redirected to /login.
      expect(page.url()).toContain('/plans');
      expect(secondPage.url()).toContain('/plans');
    } finally {
      await secondPage.close();
    }
  });
});

test.describe('Role Switching', () => {
  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await page.close();
    await context.close();
  });

  // Exercises the WS-restart path triggered by /auth/changeRole. The shared
  // graphql-ws client should close the active socket with custom code 4205,
  // reconnect with the new x-hasura-role in connectionParams, and resume
  // subscriptions transparently. We can't read the close code from
  // Playwright's WebSocket API directly, so we verify the observable signals
  // instead: activeRole cookie flip, a new WS connection opening, and no
  // page-level JS errors during the transition.
  test('Switch role from admin to user without errors', async () => {
    const { username, password } = users[0];
    const oidc = new OIDC(page, username, password);

    await oidc.login();
    await page.waitForURL('**/plans');

    const pageErrors: Error[] = [];
    page.on('pageerror', err => pageErrors.push(err));

    const newWebSockets: string[] = [];
    page.on('websocket', ws => newWebSockets.push(ws.url()));
    const wsCountBefore = newWebSockets.length;

    await oidc.switchRole('user');

    // graphql-ws reconnects within a few hundred ms after the role change;
    // poll rather than rely on a fixed sleep.
    await expect.poll(() => newWebSockets.length, { timeout: 5000 }).toBeGreaterThan(wsCountBefore);

    expect(pageErrors).toEqual([]);
  });
});
