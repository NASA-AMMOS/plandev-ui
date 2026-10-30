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
  let panel: Locator;
  let createRevisionButton: Locator;

  const sequenceName = `${generateRandomName()}.seq`;

  // Revision names are displayed uppercase; the server may return them in either case.
  const previewRevisionButton = (name: string) => page.getByTitle(`Preview revision ${name.toUpperCase()}`);
  const restoreRevisionButton = (name: string) =>
    page.getByRole('button', { name: `Restore file to revision ${name.toUpperCase()}` });

  test.beforeAll(() => {
    ({ page } = setup);
    panel = page.getByRole('region', { name: 'Working copy' });
    createRevisionButton = panel.getByRole('button', { name: 'Create revision' });
  });

  test('Create a revision of a sequence', async () => {
    await api.createWorkspaceItem(parseInt(workspace.workspaceId), sequenceName, '# version a');

    if (await workspace.workspaceFileGrid.isHidden()) {
      await workspace.workspaceFileBrowserButton.click();
    }
    await workspace.workspaceRefreshButton.click();

    await workspace.searchForFileAndWait(sequenceName);
    await workspace.clickFile(sequenceName);

    if (!(await panel.isVisible())) {
      await page.getByRole('button', { exact: true, name: 'Revisions' }).click();
    }

    await expect(page.getByText('No revisions yet.')).toBeVisible();
    await createRevisionButton.click();
    await workspace.waitForToast('Created revision A');
    await expect(previewRevisionButton('a')).toBeVisible();
    await expect(panel).toContainText('The saved copy matches the latest revision.');
    await expect(createRevisionButton).toBeDisabled();
  });

  test('Preview the file revision diff against the current content, and restore file revisions', async () => {
    const modal = page.locator('#modal-container');

    await createFileIfNeeded(sequenceName, '# version a', api, workspace);

    if (!(await panel.isVisible())) {
      await page.getByRole('button', { exact: true, name: 'Revisions' }).click();
    }
    await createRevisionButton.click();
    await workspace.waitForToast('Created revision A');

    await workspace.fillSequenceContent('# version b');
    await expect(panel).toContainText('Save your changes before creating a revision.');
    await expect(createRevisionButton).toBeDisabled();
    await workspace.saveSequence();
    await expect(panel).not.toContainText('The saved copy matches');
    await expect(createRevisionButton).toBeEnabled();
    await createRevisionButton.click();
    await workspace.waitForToast('Created revision B');
    await expect(previewRevisionButton('b')).toBeVisible();
    await expect(panel).toContainText('The saved copy matches the latest revision.');
    await expect(createRevisionButton).toBeDisabled();

    await previewRevisionButton('a').click();
    await expect(modal).toContainText(/Comparing .+ with .+/);
    await expect(modal).toContainText('Content contains: 1 changed line');
    await modal.getByRole('button', { exact: true, name: 'Close' }).click();
    await expect(modal).toBeHidden();

    await restoreRevisionButton('a').click();
    await expect(modal).toContainText(/Restore revision a\?/i);
    await modal.getByRole('button', { exact: true, name: 'Restore' }).click();
    await workspace.waitForToast('Restored revision A');

    await expect(workspace.sequenceEditorContent).toHaveText('# version a');
    await expect(workspace.saveSequenceButton).toBeDisabled();
    await expect(previewRevisionButton('a')).toBeVisible();
    await expect(previewRevisionButton('b')).toBeVisible();
    await expect(panel).toContainText('The saved copy matches revision A');
    await expect(createRevisionButton).toBeEnabled();
  });

  test('Create a revision with a specific starting revision name', async () => {
    await api.createWorkspaceItem(parseInt(workspace.workspaceId), sequenceName, '# version a');

    if (await workspace.workspaceFileGrid.isHidden()) {
      await workspace.workspaceFileBrowserButton.click();
    }
    await workspace.workspaceRefreshButton.click();

    await workspace.searchForFileAndWait(sequenceName);
    await workspace.clickFile(sequenceName);

    if (!(await panel.isVisible())) {
      await page.getByRole('button', { exact: true, name: 'Revisions' }).click();
    }

    await panel.getByRole('textbox', { name: 'Starting revision name' }).fill('C');
    await createRevisionButton.click();
    await workspace.waitForToast('Created revision C');
    await expect(previewRevisionButton('c')).toBeVisible();
  });
});
