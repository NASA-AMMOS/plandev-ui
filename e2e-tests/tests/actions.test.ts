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

let setup: BrowserSetupResult;
let action: Action;
let api: AerieApi;
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

  // Files for the file revision tests (the file lists are read when the run form opens)
  api = await createAuthenticatedApi();
  for (const file of ['revisions-a.seq', 'revisions-b.seq']) {
    await api.createWorkspaceItem(Number(workspaceId), file, '// original');
  }

  workspace.updatePage(setup.page);
  await workspace.goto();
});

test.afterAll(async () => {
  await teardownTest(setup);
});

const requiredParameters = { required: 'test-required-value', requiredNoDefault: 'test-no-default-value' };

function parameterRow(modal: Locator, name: string) {
  return modal.locator('.parameter').filter({ has: modal.page().getByLabel(name, { exact: true }) });
}

function revisionPicker(scope: Locator, path: string) {
  return scope.getByRole('group', { name: `Revision of ${path}` }).getByRole('combobox');
}

// Filters the menu down to one option first so it stays on screen however low in the modal the menu opens
async function pickRevision(scope: Locator, path: string, revision: string) {
  await revisionPicker(scope, path).click();
  await scope.page().getByRole('textbox', { name: 'Search revisions' }).fill(revision);
  await scope
    .page()
    .getByRole('menuitem', { name: new RegExp(`^${revision}`) })
    .click();
}

async function selectFile(modal: Locator, parameter: string, path: string) {
  await parameterRow(modal, parameter).getByRole('combobox', { exact: true, name: 'Select file' }).click();
  await modal.page().getByRole('menuitem', { name: path }).click();
}

test.describe.serial('Actions', () => {
  test('Navigate to workspace actions tab', async () => {
    await action.switchToActionsTab();
  });

  test('Create an action', async () => {
    await action.createAction();
  });

  test('Inspect an action', async () => {
    await action.inspectAction();
  });

  test('Required setting disables Save button until filled', async () => {
    await action.testRequiredSettingValidation();
  });

  test('Configure an action', async () => {
    await action.configureAction();
  });

  test('Required parameter disables Run button until filled', async () => {
    await action.testRequiredParamValidation();
  });

  test('Run an action', async () => {
    await action.runAction({
      stringParameters: { required: 'test-required-value', requiredNoDefault: 'test-no-default-value' },
    });
  });

  test('Run an action with an unset optional variant parameter', async () => {
    await action.selectActionInSidebar();
    await action.runAction({
      expectedStatus: 'Complete',
      stringParameters: {
        required: 'test-required-value',
        requiredNoDefault: 'test-no-default-value',
      },
    });
  });

  test('Run API integration tests', async () => {
    await action.selectActionInSidebar();
    await action.runAction({
      expectedStatus: 'Complete',
      mode: 'api-test',
      stringParameters: { required: 'test-required-value', requiredNoDefault: 'test-no-default-value' },
    });
  });

  test('Action writes a file visible in workspace file browser', async () => {
    await action.selectActionInSidebar();
    await action.runAction({
      expectedStatus: 'Complete',
      mode: 'write',
      stringParameters: { required: 'test-required-value', requiredNoDefault: 'test-no-default-value' },
    });

    // Switch to the file browser and verify the written file appears WITHOUT a manual refresh:
    // the workspace listing auto-refreshes when an action run completes.
    await workspace.workspaceFileBrowserButton.click();
    await workspace.workspaceFileGrid.waitFor({ state: 'visible' });
    await workspace.searchForFileAndWait('action_output.txt');

    // Go back to the actions tab
    await action.switchToActionsTab();
  });

  test('Action report renders sanitized Markdown with an openable link', async () => {
    await action.selectActionInSidebar();
    await action.runAction({
      expectedStatus: 'Complete',
      mode: 'report',
      stringParameters: { required: 'test-required-value', requiredNoDefault: 'test-no-default-value' },
    });
    await action.verifyReport();
  });

  test('File parameters read a working copy or a pinned revision', async () => {
    const { page } = setup;
    const results = page.getByTestId('action-run-results');
    const path = 'revisions-a.seq';

    // Revision A keeps the original contents while the working copy moves on
    await api.createFileRevision(Number(workspaceId), path, 'baseline');
    await api.createWorkspaceItem(Number(workspaceId), path, '// edited', true);

    await action.selectActionInSidebar();
    await action.runAction({
      beforeRun: async modal => {
        await selectFile(modal, 'fileAtRevision', path);
        await expect(revisionPicker(modal, path)).toHaveText('Working copy');
        await pickRevision(parameterRow(modal, 'fileAtRevision'), path, 'Revision A');
        await parameterRow(modal, 'sequencesAtRevision').getByRole('combobox', { name: 'Select files' }).click();
        await page.getByRole('menuitem', { name: path }).click();
        await page.keyboard.press('Escape');
      },
      expectedStatus: 'Complete',
      mode: 'file-refs',
      stringParameters: requiredParameters,
    });

    // Each reference read what it named, and the action received a bare path for the working copy
    await expect(results).toContainText('// original');
    await expect(results).toContainText('// edited');
    await expect(page.getByText(`"fileAtRevision":{"path":"${path}","revision":"a"}`)).toBeVisible();
    await expect(page.getByText(`"sequencesAtRevision":[{"path":"${path}"}]`)).toBeVisible();
    await page.getByRole('tab', { name: 'Parameters' }).click();
    await expect(page.getByRole('textbox', { exact: true, name: 'fileAtRevision' })).toHaveValue(
      `${path} · Revision A`,
    );

    // Re-running restores both selections
    await page.getByRole('button', { name: 'Re-run' }).click();
    const modal = page.locator('#modal-container');
    await expect(revisionPicker(parameterRow(modal, 'fileAtRevision'), path)).toHaveText('Revision A');
    await expect(revisionPicker(parameterRow(modal, 'sequencesAtRevision'), path)).toHaveText('Working copy');
    await modal.getByRole('button', { name: 'Cancel' }).click();
  });

  test('A file that must not use the working copy defaults to the latest revision, read when the action runs', async () => {
    const { page } = setup;
    const results = page.getByTestId('action-run-results');
    const path = 'revisions-b.seq';

    await api.createFileRevision(Number(workspaceId), path, 'first');

    await action.selectActionInSidebar();
    await action.runAction({
      beforeRun: async modal => {
        await selectFile(modal, 'pinnedFile', path);
        await expect(revisionPicker(modal, path)).toHaveText('Latest revision');
      },
      expectedStatus: 'Complete',
      mode: 'file-refs',
      stringParameters: requiredParameters,
    });
    await expect(results).toContainText('// original');
    await expect(page.getByText(`"pinnedFile":{"path":"${path}","revision":"latest"}`)).toBeVisible();

    // A newer revision is picked up by a re-run, since "latest" was stored rather than a revision name
    await api.createWorkspaceItem(Number(workspaceId), path, '// newest', true);
    await api.createFileRevision(Number(workspaceId), path, 'second');
    await page.getByRole('button', { name: 'Re-run' }).click();
    await page.locator('#modal-container').getByRole('button', { exact: true, name: 'Run' }).click();
    await expect(results).toContainText('// newest', { timeout: 30000 });
  });

  test('Archive an action prevents running', async () => {
    // Go back to the action detail view by clicking action name in sidebar
    await action.selectActionInSidebar();
    await action.archiveAction();
  });

  test('Unarchive an action allows running again', async () => {
    await action.unarchiveAction();
  });
});
