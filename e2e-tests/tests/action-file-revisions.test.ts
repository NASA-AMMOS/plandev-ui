import test, { expect, type Locator } from '@playwright/test';
import { Action } from '../fixtures/Action.js';
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

// File reference action inputs: pick files and per-file revisions, run, see them in the run details, and re-run
// with the same choices. The demo action's "file-refs" mode reads each reference it received.

let setup: BrowserSetupResult;
let api: AerieApi;
let action: Action;
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

  api = await createAuthenticatedApi();
  for (const file of ['approach.seq', 'descent.seq', 'parameters.json']) {
    await api.createWorkspaceItem(Number(workspaceId), file, `// ${file}`);
  }
  // Revision "a" holds the original contents; the working copies move on afterwards.
  for (const file of ['descent.seq', 'parameters.json']) {
    await api.createFileRevision(Number(workspaceId), file, 'baseline');
    await api.createWorkspaceItem(Number(workspaceId), file, `// ${file} edited`, true);
  }

  workspace = new Workspace(setup.page, workspaceId, workspaceName, baseURL);
  await workspace.goto();
  action = new Action(setup.page, workspaceId);
  await action.switchToActionsTab();
  await action.createAction();
  await setup.page.getByRole('button', { name: action.actionName }).click();
  await action.configureAction(); // the demo action has a required setting
  // Reload so the page has the saved settings; runs started from a stale definition would not carry them.
  await setup.page.reload();
  await expect(setup.page.getByRole('button', { name: 'Run Action' })).toBeEnabled();
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

// The row of one parameter in the run form; the form's order is not the schema's, so inputs are found by name.
function parameterRow(scope: Locator, name: string) {
  return scope.locator('.parameter').filter({ has: setup.page.getByLabel(name, { exact: true }) });
}

function revisionPicker(scope: Locator, path: string) {
  return scope.getByRole('group', { name: `Revision of ${path}` }).getByRole('combobox');
}

async function pickRevision(scope: Locator, path: string, revision: RegExp) {
  await revisionPicker(scope, path).click();
  await setup.page.getByRole('menuitem', { name: revision }).click();
}

test('a parameter that does not allow the working copy needs a named revision per file before running', async () => {
  const { page } = setup;
  const modal = page.locator('#modal-container');
  const runButton = modal.getByRole('button', { exact: true, name: 'Run' });

  await page.getByRole('button', { name: 'Run Action' }).click();
  await modal.getByRole('combobox', { name: 'mode' }).selectOption('file-refs');
  const requiredInput = modal.getByRole('textbox', { exact: true, name: 'requiredNoDefault' });
  await requiredInput.fill('x');
  await requiredInput.dispatchEvent('change');
  await expect(runButton).toBeEnabled();

  // Single file: no revision is chosen for the user, and nothing but named revisions is offered
  await parameterRow(modal, 'pinnedFile').getByRole('combobox', { exact: true, name: 'Select file' }).click();
  await page.getByRole('menuitem', { name: 'descent.seq' }).click();
  await expect(revisionPicker(modal, 'descent.seq')).toHaveText('Select revision');
  await expect(runButton).toBeDisabled();
  await revisionPicker(modal, 'descent.seq').click();
  await expect(page.getByRole('menuitem', { name: /Working copy/ })).toHaveCount(0);
  // two lines per revision: label and message, then the author and the full ISO time without milliseconds
  await expect(
    page.getByRole('menuitem', { name: /^Revision A — baseline\s+test · \d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/ }),
  ).toBeVisible();
  await page.getByRole('menuitem', { name: /^Revision A/ }).click();
  await expect(revisionPicker(modal, 'descent.seq')).toHaveText('Revision A');
  await expect(runButton).toBeEnabled();

  // Switching files starts over, and a file without revisions cannot be used
  await modal.getByRole('combobox', { exact: true, name: 'descent.seq' }).click();
  await page.getByRole('menuitem', { name: 'approach.seq' }).click();
  await expect(revisionPicker(modal, 'approach.seq')).toHaveText('Select revision');
  await expect(runButton).toBeDisabled();
  await revisionPicker(modal, 'approach.seq').click();
  await expect(page.getByText('This file has no revisions yet, so it can’t be used')).toBeVisible();
  await page.keyboard.press('Escape');
  await modal.getByRole('combobox', { exact: true, name: 'approach.seq' }).click();
  await page.getByRole('menuitem', { name: 'descent.seq' }).click();
  await pickRevision(modal, 'descent.seq', /^Revision A/);
  await expect(runButton).toBeEnabled();

  // Several files: each one needs its own revision
  await parameterRow(modal, 'pinnedSequences').getByRole('combobox', { name: 'Select files' }).click();
  await page.getByRole('menuitem', { name: 'descent.seq' }).click();
  await page.getByRole('menuitem', { name: 'approach.seq' }).click();
  await page.keyboard.press('Escape');
  await expect(revisionPicker(modal, 'descent.seq')).toHaveCount(2);
  await expect(runButton).toBeDisabled();
  await pickRevision(modal.getByRole('list', { name: 'Revisions of pinnedSequences' }), 'descent.seq', /^Revision A/);
  await expect(runButton).toBeDisabled(); // approach.seq still has none
  await modal.getByRole('combobox', { name: '2 files selected' }).click();
  await page.getByRole('menuitem', { name: 'approach.seq' }).click(); // deselect it
  await page.keyboard.press('Escape');
  await expect(runButton).toBeEnabled();
  await modal.getByRole('button', { name: 'Cancel' }).click();
});

test('pin revisions per file, run, inspect, and re-run with the same choices', async () => {
  const { page } = setup;
  const modal = page.locator('#modal-container');

  await page.getByRole('button', { name: 'Run Action' }).click();
  await expect(modal).toBeVisible();

  await modal.getByRole('combobox', { name: 'mode' }).selectOption('file-refs');
  const requiredInput = modal.getByRole('textbox', { exact: true, name: 'requiredNoDefault' });
  await requiredInput.fill('x');
  await requiredInput.dispatchEvent('change');

  // Single file: newly selected files start on the working copy. Switching files must not reuse the revisions loaded
  // for the previous file, so look at a file with none first.
  await parameterRow(modal, 'fileAtRevision').getByRole('combobox', { exact: true, name: 'Select file' }).click();
  await page.getByRole('menuitem', { name: 'approach.seq' }).click();
  await revisionPicker(modal, 'approach.seq').click();
  await expect(page.getByText('This file has no revisions yet')).toBeVisible();
  await page.keyboard.press('Escape');
  await modal.getByRole('combobox', { exact: true, name: 'approach.seq' }).click();
  await page.getByRole('menuitem', { name: 'parameters.json' }).click();
  const configRevision = revisionPicker(modal, 'parameters.json');
  await expect(configRevision).toHaveText('Working copy');
  await pickRevision(modal, 'parameters.json', /^Revision A/);
  await expect(configRevision).toHaveText('Revision A');

  // Multiple files, each with its own revision; adding a file keeps the earlier choices.
  await parameterRow(modal, 'sequencesAtRevision').getByRole('combobox', { name: 'Select files' }).click();
  await page.getByRole('menuitem', { name: 'descent.seq' }).click();
  await page.keyboard.press('Escape');
  await pickRevision(modal, 'descent.seq', /^Revision A/);
  await modal.getByRole('combobox', { name: '1 file selected' }).click();
  await page.getByRole('menuitem', { name: 'approach.seq' }).click();
  await page.keyboard.press('Escape');
  await expect(revisionPicker(modal, 'descent.seq')).toHaveText('Revision A');
  await expect(revisionPicker(modal, 'approach.seq')).toHaveText('Working copy');

  // A file with no revisions says so instead of showing an empty list.
  await revisionPicker(modal, 'approach.seq').click();
  await expect(page.getByText('This file has no revisions yet')).toBeVisible();
  await page.keyboard.press('Escape');

  await modal.getByRole('button', { exact: true, name: 'Run' }).click();
  const runHeading = page.getByRole('heading', { name: /Run #\d+/ });
  await expect(runHeading).toBeVisible({ timeout: 15000 });
  await expect(runHeading.locator('..').getByLabel('Complete')).toBeVisible({ timeout: 30000 });

  // The action read exactly what was selected: the pinned files' original contents and the unpinned working copy.
  const results = page.getByTestId('action-run-results');
  await expect(results).toContainText('// parameters.json');
  await expect(results).toContainText('// descent.seq');
  await expect(results).toContainText('// approach.seq');
  await expect(results).not.toContainText('edited');

  // Run details show each file and its revision.
  await page.getByRole('tab', { name: 'Parameters' }).click();
  await expect(page.getByRole('textbox', { exact: true, name: 'fileAtRevision' })).toHaveValue(
    'parameters.json · Revision A',
  );
  await expect(page.getByRole('textbox', { exact: true, name: 'sequencesAtRevision' })).toHaveValue(
    'descent.seq · Revision A, approach.seq · Working copy',
  );

  // Re-run keeps pinned revisions pinned and working copies dynamic.
  await page.getByRole('button', { name: 'Re-run' }).click();
  await expect(modal).toBeVisible();
  await expect(revisionPicker(modal, 'parameters.json')).toHaveText('Revision A');
  await expect(revisionPicker(modal, 'descent.seq')).toHaveText('Revision A');
  await expect(revisionPicker(modal, 'approach.seq')).toHaveText('Working copy');
  await modal.getByRole('button', { name: 'Cancel' }).click();
});
