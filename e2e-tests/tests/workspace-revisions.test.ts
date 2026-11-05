import test, { expect, Locator, Page } from '@playwright/test';
import { Dictionaries } from '../fixtures/Dictionaries.js';
import { Parcels } from '../fixtures/Parcels.js';
import { Workspace } from '../fixtures/Workspace.js';
import { Workspaces } from '../fixtures/Workspaces.js';
import {
  AerieApi,
  createAuthenticatedApi,
  setupTest,
  teardownTest,
  type BrowserSetupResult,
} from '../utilities/api.js';
import { generateRandomName } from '../utilities/helpers.js';

// Prototype happy path for explicit per-file revisions: create a, edit/save, create b,
// preview a, restore a, and check the editor shows a while a and b both remain.

let setup: BrowserSetupResult;
let api: AerieApi;
let dictionaries: Dictionaries;
let parcels: Parcels;
let workspaces: Workspaces;
let workspace: Workspace;
let workspaceName: string;

async function createFileIfNeeded(
  fileName: string,
  content: string,
  api: AerieApi,
  workspace: Workspace,
): Promise<void> {
  if (await workspace.workspaceFileGrid.isHidden()) {
    await workspace.workspaceFileBrowserButton.click();
  }

  const fileRow = workspace.getFileRow(fileName);
  const isVisible = await fileRow.isVisible();
  if (!isVisible) {
    await api.createWorkspaceItem(parseInt(workspace.workspaceId), fileName, content);
  }
  await workspace.workspaceRefreshButton.click();

  await workspace.searchForFileAndWait(fileName);
  await workspace.clickFile(fileName);
}

test.beforeAll(async ({ baseURL, browser }) => {
  test.setTimeout(120000);

  setup = await setupTest(browser, { model: false });
  api = await createAuthenticatedApi();
  dictionaries = new Dictionaries(setup.page);
  parcels = new Parcels(setup.page);
  workspaces = new Workspaces(setup.page, parcels, baseURL);

  await dictionaries.goto();
  await dictionaries.createCommandDictionary();
  await parcels.goto();
  await parcels.createParcel(dictionaries.commandDictionaryName, baseURL);

  await workspaces.goto();
  const workspaceId = await workspaces.createWorkspace();
  workspaceName = workspaces.workspaceName;
  workspace = new Workspace(setup.page, workspaceId, workspaceName, baseURL);
  await workspace.goto();
});

test.afterAll(async () => {
  await workspaces.goto();
  await workspaces.deleteWorkspace(workspaceName);
  await parcels.goto();
  await parcels.deleteParcel();
  await dictionaries.goto();
  await dictionaries.deleteCommandDictionary();
  await teardownTest(setup);
});

test.describe('Workspace Revisions', () => {
  let page: Page;
  let createRevisionPanel: Locator;
  let revisionHistoryPanel: Locator;
  let createRevisionButton: Locator;

  const previewRevisionButton = (name: string) => page.getByLabel(`Preview revision ${name.toUpperCase()}`);

  test.beforeAll(() => {
    ({ page } = setup);
    createRevisionPanel = page.getByRole('region', { name: 'Create revision' });
    revisionHistoryPanel = page.getByRole('region', { name: 'Revision History' });
    createRevisionButton = createRevisionPanel.getByRole('button', { name: 'Create revision' });
  });

  test('Create a revision of a sequence', async () => {
    const sequenceName = `${generateRandomName()}.seq`;
    await api.createWorkspaceItem(parseInt(workspace.workspaceId), sequenceName, '# version 1');

    if (await workspace.workspaceFileGrid.isHidden()) {
      await workspace.workspaceFileBrowserButton.click();
    }
    await workspace.workspaceRefreshButton.click();

    await workspace.searchForFileAndWait(sequenceName);
    await workspace.clickFile(sequenceName);

    await workspace.openRevisionPanel();

    await expect(page.getByText('No revisions yet.')).toBeVisible();
    await createRevisionButton.click();
    await workspace.waitForToast('Created revision 1');
    await expect(previewRevisionButton('1')).toBeVisible();
    await expect(createRevisionPanel).toContainText('The saved copy matches the latest revision.');
    await expect(createRevisionButton).toBeDisabled();
  });

  test('Preview the file revision diff against the current content, and restore file revisions', async () => {
    const modal = page.locator('#modal-container');
    const sequenceName = `${generateRandomName()}.seq`;

    await createFileIfNeeded(sequenceName, '# version 1', api, workspace);

    await workspace.openRevisionPanel();

    await createRevisionButton.click();
    await workspace.waitForToast('Created revision 1');

    await workspace.fillSequenceContent('# version 2');
    await expect(createRevisionPanel).toContainText('Save your changes before creating a revision.');
    await expect(createRevisionButton).toBeDisabled();
    await workspace.saveSequence();
    await expect(createRevisionPanel).not.toContainText('The saved copy matches');
    await expect(createRevisionButton).toBeEnabled();
    await createRevisionButton.click();
    await workspace.waitForToast('Created revision 2');
    await expect(previewRevisionButton('2')).toBeVisible();
    await expect(createRevisionPanel).toContainText('The saved copy matches the latest revision.');
    await expect(createRevisionButton).toBeDisabled();

    await previewRevisionButton('1').click();
    await expect(modal).toContainText('Compare to Revision 1');
    await expect(modal).toContainText('Content contains: 1 changed line');
    await modal.getByRole('button', { exact: true, name: 'Close' }).click();
    await expect(modal).toBeHidden();

    const revisionButton = await revisionHistoryPanel.getByRole('region', { name: 'Revision 1' });
    await revisionButton.getByRole('button', { name: 'More options' }).click();
    await page.getByRole('menuitem', { name: 'Restore file to revision 1' }).first().click();
    await expect(modal).toContainText('Restore to 1?');
    await modal.getByRole('button', { exact: true, name: 'Restore Revision 1' }).click();
    await workspace.waitForToast('Restored revision 1');

    await expect(workspace.sequenceEditorContent).toHaveText('# version 1');
    await expect(workspace.saveSequenceButton).toBeDisabled();
    await expect(previewRevisionButton('1')).toBeVisible();
    await expect(previewRevisionButton('2')).toBeVisible();
    await expect(createRevisionPanel).toContainText('The saved copy matches revision 1');
    await expect(createRevisionButton).toBeEnabled();
  });

  test('Create a revision with a specific starting revision name', async () => {
    const sequenceName = `${generateRandomName()}.seq`;
    await api.createWorkspaceItem(parseInt(workspace.workspaceId), sequenceName, '# version 1');

    if (await workspace.workspaceFileGrid.isHidden()) {
      await workspace.workspaceFileBrowserButton.click();
    }
    await workspace.workspaceRefreshButton.click();

    await workspace.searchForFileAndWait(sequenceName);
    await workspace.clickFile(sequenceName);

    await workspace.openRevisionPanel();

    await createRevisionPanel.getByRole('textbox', { name: 'Starting revision name' }).fill('3');
    await createRevisionButton.click();
    await workspace.waitForToast('Created revision 3');
    await expect(previewRevisionButton('3')).toBeVisible();
  });
});
