import test, { expect, type BrowserContext, type Page } from '@playwright/test';
import { decode } from 'jsonwebtoken';
import nodePath from 'path';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import url from 'url';
import type { HasuraToken } from '../../src/lib/types/oidc';
import { getIntervalFromDoyRange } from '../../src/utilities/time.js';
import { Action } from '../fixtures/Action.js';
import { Dictionaries } from '../fixtures/Dictionaries.js';
import { OIDC } from '../fixtures/OIDC';
import { Parcels } from '../fixtures/Parcels.js';
import { Workspace } from '../fixtures/Workspace.js';
import { Workspaces } from '../fixtures/Workspaces.js';
import { AerieApi } from '../utilities/api.js';

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

      // Wait for the refresh timer to fire. Test realm sets access.token.lifespan=20s
      // and the UI's refresh fires at exp-10s, so the new cookie should land ~10s
      // after login. Polling rather than sleeping keeps the test resilient if the
      // realm TTL is tuned later.
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
  // graphql-ws client should close the active socket with the intentional
  // restart code 4999 (see INTENTIONAL_RESTART_CODE in src/stores/gqlClient.ts),
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

test.describe.serial('Backend Service Smoke Tests', () => {
  // Exercises the OIDC/JWKS-verified path to each backend service, logged in as a real Keycloak
  // user — the integration coverage the JWKS work needed (the rest of this suite is auth-only and
  // never touched these endpoints):
  //   1. Hasura action   (simulate)           — API call, token verified by Hasura via JWKS
  //   2. Hasura function (take snapshot)       — API call, token verified by Hasura via JWKS
  //   3. Workspace server (create/file/delete) — UI → workspace-server, verified via JWKS
  //   4. Action server   (upload + run)        — UI → action-server, verified via JWKS
  //
  // setupTest()/AerieApi.login() can't be used here: the gateway's password login is disabled
  // under OIDC. Instead we seed AerieApi with the access-token cookie the Keycloak login minted —
  // Hasura/the gateway verify it via JWKS exactly as for a browser request. The two Hasura smokes
  // run as API calls (no need to render the heavy /plans route, which Vite cold-compiles under the
  // OIDC project's `npm run dev`); workspace/action stay UI since those endpoints are browser-only.

  const { password, username } = users[0]; // AerieAdmin — has all roles.

  let api: AerieApi;
  let baseUrl: string | undefined;
  let dictionaries: Dictionaries;
  let modelId: number;
  let parcels: Parcels;
  let planId: number;

  // The workspace/action tests drive real UI in dev mode (cold route compile + an action run),
  // which can exceed Playwright's 30s default — give each test headroom.
  test.beforeEach(() => {
    test.setTimeout(120000);
  });

  test.beforeAll(async ({ baseURL, browser }) => {
    // Generous budget: under the OIDC project's `npm run dev` server, Vite cold-compiles the
    // /dictionaries and /parcels routes on first navigation here, plus the model JAR is processed.
    test.setTimeout(180000);
    baseUrl = baseURL;

    context = await browser.newContext();
    page = await context.newPage();

    // Real OIDC login, then seed an AerieApi with the access token Keycloak just minted.
    const oidc = new OIDC(page, username, password);
    await oidc.login();
    await page.waitForURL('**/plans');
    const { accessToken } = await oidc.extractTokens();
    const claims = (decode(accessToken as string) as HasuraToken)['https://hasura.io/jwt/claims'];
    api = new AerieApi();
    api.setUser({ id: claims['x-hasura-user-id'], token: accessToken as string });

    // Model + plan for the Hasura smokes (simulate/snapshot call the API directly in their tests).
    const jarPath = nodePath.join(
      nodePath.dirname(url.fileURLToPath(import.meta.url)),
      '../data/banananation-develop.jar',
    );
    const jarId = await api.uploadFile(jarPath);
    const modelName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
    const model = await api.createModel({ jar_id: jarId, mission: 'test', name: modelName, version: '1.0.0' });
    modelId = model.id;

    const planName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
    const planStartTime = '2022-001T00:00:00';
    const planEndTime = '2022-002T00:00:00';
    const planResult = await api.createPlan({
      duration: getIntervalFromDoyRange(planStartTime, planEndTime),
      model_id: modelId,
      name: planName,
      start_time: planStartTime,
    });
    planId = planResult.id;

    // Command dictionary + parcel are prerequisites for creating a workspace (both via UI).
    dictionaries = new Dictionaries(page);
    parcels = new Parcels(page);
    await dictionaries.goto();
    await dictionaries.createCommandDictionary();
    await parcels.goto();
    await parcels.createParcel(dictionaries.commandDictionaryName, baseURL);
  });

  test.afterAll(async () => {
    // Plan/model were created via API, so clean them up the same way. Workspaces created by the
    // tests below are deleted in-test (test 3) or intentionally left (test 4, like actions.test.ts).
    try {
      await api.deletePlan(planId);
    } catch {
      // ignore cleanup errors
    }
    try {
      await api.deleteModel(modelId);
    } catch {
      // ignore cleanup errors
    }
    await page.close();
    await context.close();
  });

  test('Hasura action: a simulation runs to completion', async () => {
    // simulate is a Hasura action; calling it with the OIDC token exercises Hasura's JWKS
    // verification (and the merlin round-trip) without rendering the heavy /plans route.
    const { simulationDatasetId } = await api.simulate(planId);
    await api.waitForSimulation(simulationDatasetId);
    const dataset = await api.getSimulationDataset(simulationDatasetId);
    expect(dataset.status).toBe('success');
  });

  test('Hasura function: taking a plan snapshot succeeds', async () => {
    // create_snapshot is a Hasura function; calling it with the OIDC token exercises Hasura's
    // JWKS verification. A returned snapshot id means the function ran end to end.
    const { snapshotId } = await api.createSnapshot(planId, `oidc-smoke-${username}`);
    expect(snapshotId).toBeGreaterThanOrEqual(0);
  });

  test('Workspace server: create a workspace, add a file, then delete it', async () => {
    const workspaces = new Workspaces(page, parcels, baseUrl);
    await workspaces.goto();
    const workspaceId = await workspaces.createWorkspace(); // POST /ws/create

    const workspace = new Workspace(page, workspaceId, workspaces.workspaceName, baseUrl);
    workspace.updatePage(page);
    await workspace.goto();
    // createSequence waits for the "Workspace File Created Successfully" toast, which only
    // fires once the workspace server accepts the file write.
    await workspace.createSequence(undefined, 'oidc-smoke.seq'); // PUT file

    await workspaces.goto();
    await workspaces.deleteWorkspace(workspaces.workspaceName); // DELETE /ws/:id
  });

  test('Action server: upload and run an action', async () => {
    const workspaces = new Workspaces(page, parcels, baseUrl);
    await workspaces.goto();
    const workspaceId = await workspaces.createWorkspace();

    const workspace = new Workspace(page, workspaceId, workspaces.workspaceName, baseUrl);
    workspace.updatePage(page);
    await workspace.goto();

    const action = new Action(page, workspaceId);
    await action.switchToActionsTab();
    await action.createAction(); // uploads e2e-tests/data/aerie-action-demo.js
    await action.inspectAction(); // open the action's detail view (Runs/Configure/Code tabs)
    await action.configureAction(); // the demo action has a required *setting*; save it

    // A "latest" run reads settings from the saved action definition via a live (graphql-ws)
    // subscription — RunActionModal doesn't surface a settings form for latest runs — and that
    // store lags the save with no DOM signal to await. Reload to re-initialize the subscription so
    // the store is guaranteed to hold the just-saved setting on reconnect. After reload the
    // workspace auto-opens the single action's detail, so just confirm it's showing rather than
    // re-clicking the sidebar entry (which the detail pane now overlaps).
    await page.reload();
    await action.switchToActionsTab();
    await expect(page.getByRole('heading', { name: action.actionName })).toBeVisible();
    await action.runAction({
      actionTimeout: 60000, // first cold action run (worker spin-up) can exceed the 30s default
      expectedStatus: 'Complete',
      stringParameters: { required: 'test-required-value', requiredNoDefault: 'test-no-default-value' },
    });
  });
});
