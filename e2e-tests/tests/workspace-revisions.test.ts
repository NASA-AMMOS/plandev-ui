import test, { expect } from '@playwright/test';
import { Dictionaries } from '../fixtures/Dictionaries.js';
import { Parcels } from '../fixtures/Parcels.js';
import { Workspace } from '../fixtures/Workspace.js';
import { Workspaces } from '../fixtures/Workspaces.js';
import { setupTest, teardownTest, type BrowserSetupResult } from '../utilities/api.js';
import { generateRandomName } from '../utilities/helpers.js';

// Prototype happy path for explicit per-file revisions: create a, edit/save, create b,
// preview a, restore a, and check the editor shows a while a and b both remain.

let setup: BrowserSetupResult;
let dictionaries: Dictionaries;
let parcels: Parcels;
let workspaces: Workspaces;
let workspace: Workspace;
let workspaceName: string;

test.beforeAll(async ({ baseURL, browser }) => {
  test.setTimeout(120000);

  setup = await setupTest(browser, { model: false });
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

test('create, preview, and restore file revisions', async () => {
  const { page } = setup;
  const panel = page.getByRole('region', { name: 'Working copy' });
  const revision = (name: string) => page.getByRole('button', { name: new RegExp(`^${name} `) });

  const { sequenceName } = await workspace.createSequence(undefined, `${generateRandomName()}.seq`);
  await workspace.searchForFileAndWait(sequenceName);
  await workspace.clickFile(sequenceName);
  await expect(workspace.saveSequenceButton).toBeVisible({ timeout: 10000 });
  await workspace.fillSequenceContent('# version a');
  await workspace.saveSequence();

  await page.getByRole('button', { name: 'Revisions' }).click();
  await expect(panel).toContainText('No revisions yet.');
  await panel.getByRole('button', { name: 'Create revision' }).click();
  await expect(panel).toContainText('Matches revision a');

  await workspace.fillSequenceContent('# version b');
  await expect(panel.getByRole('button', { name: 'Create revision' })).toBeDisabled();
  await workspace.saveSequence();
  await expect(panel).toContainText('Changes since revision a');
  await panel.getByRole('button', { name: 'Create revision' }).click();
  await expect(panel).toContainText('Matches revision b');

  await revision('a').click();
  const modal = page.locator('#modal-container');
  await expect(modal.getByText('Revision a', { exact: true }).first()).toBeVisible();
  await modal.getByRole('button', { name: 'Restore…' }).click();
  await modal.getByRole('button', { exact: true, name: 'Restore' }).click();
  await workspace.waitForToast('Restored revision a');

  await expect(workspace.sequenceEditorContent).toHaveText('# version a');
  await expect(workspace.saveSequenceButton).toBeDisabled();
  await expect(revision('a')).toBeVisible();
  await expect(revision('b')).toBeVisible();
});
