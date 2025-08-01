import test, { type BrowserContext, type Page } from '@playwright/test';
import { Action } from '../fixtures/Action.js';
import { Dictionaries } from '../fixtures/Dictionaries.js';
import { Parcels } from '../fixtures/Parcels.js';
import { Workspace } from '../fixtures/Workspace.js';
import { Workspaces } from '../fixtures/Workspaces.js';

let action: Action;
let dictionaries: Dictionaries;
let context: BrowserContext;
let page: Page;
let parcels: Parcels;
let workspace: Workspace;
let workspaces: Workspaces;
let workspaceId: string;
let workspaceName: string = '';

test.beforeAll(async ({ baseURL, browser }) => {
  // Increase global timeout to prevent early test termination
  test.setTimeout(90000); // 90 seconds

  context = await browser.newContext();
  page = await context.newPage();

  dictionaries = new Dictionaries(page);
  parcels = new Parcels(page);
  workspaces = new Workspaces(page, parcels, baseURL);

  await dictionaries.goto();
  await dictionaries.createCommandDictionary();
  await parcels.goto();
  await parcels.createParcel(dictionaries.commandDictionaryName, baseURL);

  await workspaces.goto();
  workspaceId = await workspaces.createWorkspace();
  workspaceName = workspaces.workspaceName;

  workspace = new Workspace(page, workspaceId, workspaceName, baseURL);
  action = new Action(page, workspaceId);

  workspace.updatePage(page);
  await workspace.goto();
});

test.afterAll(async () => {
  await page.close();
  await context.close();
});

test.describe.serial('Actions', () => {
  test('Navigate to workspace actions from sidebar', async () => {
    await page.getByRole('complementary').getByRole('button', { name: 'Actions' }).click();
    const newTab = await page.waitForEvent('popup');
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
