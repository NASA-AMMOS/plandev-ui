import test, { expect, type BrowserContext, type Page } from '@playwright/test';
import { getWorkspacesUrl } from '../../src/utilities/routes.js';
import { Dictionaries } from '../fixtures/Dictionaries.js';
import { Parcels } from '../fixtures/Parcels.js';
import { Workspace } from '../fixtures/Workspace.js';
import { Workspaces } from '../fixtures/Workspaces.js';

let context: BrowserContext;
let dictionaries: Dictionaries;
let parcels: Parcels;
let page: Page;
let workspace: Workspace;
let workspaces: Workspaces;
let workspaceId: string;
let workspaceName: string;
let sequence: { sequenceName: string; sequencePath: string };

test.beforeAll(async ({ baseURL, browser }) => {
  // Increase global timeout to prevent early test termination
  test.setTimeout(90000); // 90 seconds

  context = await browser.newContext();
  page = await context.newPage();

  dictionaries = new Dictionaries(page);
  parcels = new Parcels(page);
  workspaces = new Workspaces(page, parcels, baseURL);

  // Setup dependencies: dictionary and parcel
  await dictionaries.goto();
  await dictionaries.createCommandDictionary();
  await parcels.goto();
  await parcels.createParcel(dictionaries.commandDictionaryName, baseURL);

  // Create a workspace for testing
  await workspaces.goto();
  workspaceId = await workspaces.createWorkspace();
  workspaceName = workspaces.workspaceName;

  // Initialize workspace fixture
  workspace = new Workspace(page, workspaceId, workspaceName, baseURL);
  workspace.updatePage(page);

  await workspace.goto();
});

test.afterAll(async () => {
  // Cleanup: delete workspace, parcel, and dictionary
  await workspaces.goto();
  await workspaces.deleteWorkspace(workspaceName);
  await parcels.goto();
  await parcels.deleteParcel();
  await dictionaries.goto();
  await dictionaries.deleteCommandDictionary();

  await page.close();
  await context.close();
});

test.describe.serial('Workspace', () => {
  test('Navigate to workspace should display workspace correctly', async () => {
    await expect(page.locator('.workspace-title')).toBeVisible();
    await expect(page).toHaveURL(getWorkspacesUrl(workspace.baseURL, parseInt(workspace.workspaceId)));
    await workspace.pageLoadingLocatorWithData.waitFor({ state: 'detached' });
  });

  test('Workspace context menu should be accessible', async () => {
    await expect(workspace.workspaceContextMenuButton).toBeVisible();
    await workspace.openWorkspaceContextMenu();
    await expect(workspace.workspaceContextMenu).toBeVisible();

    // Check for expected menu items
    await expect(workspace.workspaceContextMenu.getByRole('menuitem', { name: 'New File' })).toBeVisible();

    // Close menu by pressing Escape
    await page.keyboard.press('Escape');
    await expect(workspace.workspaceContextMenu).not.toBeVisible();
  });

  test('Create workspace folder', async () => {
    const folderPath = await workspace.createFolder();

    expect(folderPath).toBeTruthy();
  });

  test('Create workspace sequence', async () => {
    sequence = await workspace.createSequence();

    expect(sequence.sequenceName).toBeTruthy();
    expect(sequence.sequenceName).toBeTruthy();
  });

  test('Navigate to sequence', async () => {
    await page.getByRole('menuitem', { name: sequence.sequenceName }).click();

    await expect(page).toHaveURL(
      getWorkspacesUrl(
        workspace.baseURL,
        parseInt(workspace.workspaceId),
        `${sequence.sequencePath}/${sequence.sequenceName}`,
      ),
    );
  });

  test('Update the selected sequence content', async () => {
    expect(workspace.saveSequenceButton).toBeDisabled();
    const newContent = '// Updated content\ncommand3();';
    await workspace.fillSequenceContent(newContent);
    expect(workspace.saveSequenceButton).toBeEnabled();

    await workspace.saveSequence();
  });

  test('Import sequence from file', async () => {
    await workspace.importSeqJson();
  });

  test('Delete sequence', async () => {
    await workspace.deleteSequence(sequence.sequenceName);
  });
});
