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

  test('Archive an action prevents running', async () => {
    // Go back to the action detail view by clicking action name in sidebar
    await action.selectActionInSidebar();
    await action.archiveAction();
  });

  test('Unarchive an action allows running again', async () => {
    await action.unarchiveAction();
  });
});
