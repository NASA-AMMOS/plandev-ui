import test from '@playwright/test';
import { Action } from '../fixtures/Action.js';
import { Dictionaries } from '../fixtures/Dictionaries.js';
import { Parcels } from '../fixtures/Parcels.js';
import { Workspace } from '../fixtures/Workspace.js';
import { Workspaces } from '../fixtures/Workspaces.js';
import { setupTest, teardownTest, type BrowserSetupResult } from '../utilities/api.js';

let setup: BrowserSetupResult;
let action: Action;
let dictionaries: Dictionaries;
let parcels: Parcels;
let workspace: Workspace;
let workspaces: Workspaces;
let workspaceId: string;
let workspaceName: string = '';

test.beforeAll(async ({ baseURL, browser }) => {
  // Increase global timeout to prevent early test termination
  test.setTimeout(90000); // 90 seconds

  setup = await setupTest(browser, { model: false });

  dictionaries = new Dictionaries(setup.page);
  parcels = new Parcels(setup.page);
  workspaces = new Workspaces(setup.page, parcels, baseURL);

  await dictionaries.goto();
  await dictionaries.createCommandDictionary();
  await parcels.goto();
  await parcels.createParcel(dictionaries.commandDictionaryName, baseURL);

  await workspaces.goto();
  workspaceId = await workspaces.createWorkspace();
  workspaceName = workspaces.workspaceName;

  workspace = new Workspace(setup.page, workspaceId, workspaceName, baseURL);
  action = new Action(setup.page, workspaceId);

  workspace.updatePage(setup.page);
  await workspace.goto();
});

test.afterAll(async () => {
  await teardownTest(setup);
});

test.describe.serial('Actions', () => {
  test('Navigate to workspace actions from sidebar', async () => {
    const newPagePromise = setup.context.waitForEvent('page');
    await setup.page.getByRole('complementary').getByRole('button', { name: 'Actions' }).click();
    const newTab = await newPagePromise;
    await newTab.waitForLoadState();
    await newTab.getByText('Loading...').first().waitFor({ state: 'hidden' });
    await newTab.waitForURL(`/workspaces/${workspaceId}/actions`);
    await action.updatePage(newTab);
  });

  test('Create an action', async () => {
    await action.createAction();
  });

  test('Inspect an action', async () => {
    await action.inspectAction();
  });

  test('Configure an action', async () => {
    await action.configureAction();
  });

  test('Run an action', async () => {
    await action.runAction();
  });
});
