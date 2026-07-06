import test, { expect } from '@playwright/test';
import { getWorkspacesUrl } from '../../src/utilities/routes.js';
import { Dictionaries } from '../fixtures/Dictionaries.js';
import { Parcels } from '../fixtures/Parcels.js';
import { Workspace } from '../fixtures/Workspace.js';
import { Workspaces } from '../fixtures/Workspaces.js';
import { setupTest, teardownTest, type BrowserSetupResult } from '../utilities/api.js';
import { generateRandomName } from '../utilities/helpers.js';

// Load the CommonJS module dynamically
const adaptationModule = await import('../data/sequence-adaptation-multiple-output.cjs');
const adaptation = adaptationModule.default.adaptation;

// Main setup (uses default 'test' user)
let setup: BrowserSetupResult;
let dictionaries: Dictionaries;
let parcels: Parcels;
let sequence: { sequenceName: string; sequencePath: string };
let workspace: Workspace;
let workspaces: Workspaces;
let workspaceId: string;
let workspaceName: string;

test.beforeAll(async ({ baseURL, browser }) => {
  // Increase global timeout to prevent early test termination
  test.setTimeout(60000); // 60 seconds

  setup = await setupTest(browser, { model: false });

  dictionaries = new Dictionaries(setup.page);
  parcels = new Parcels(setup.page);
  workspaces = new Workspaces(setup.page, parcels, baseURL);

  // Setup dependencies: dictionary and parcel
  await dictionaries.goto();
  await dictionaries.createCommandDictionary();
  await dictionaries.createSequenceAdaptation(undefined, 'e2e-tests/data/sequence-adaptation-multiple-output.cjs');
  await parcels.goto();
  await parcels.createParcel(dictionaries.commandDictionaryName, baseURL);
  await parcels.updateDictionarySelections({
    sequenceAdaptationName: dictionaries.sequenceAdaptationName,
  });

  // Create a workspace for testing
  await workspaces.goto();
  workspaceId = await workspaces.createWorkspace();
  workspaceName = workspaces.workspaceName;

  // Initialize workspace fixture
  workspace = new Workspace(setup.page, workspaceId, workspaceName, baseURL);
  workspace.updatePage(setup.page);
  await workspace.goto();

  // Setup workspace
  sequence = await workspace.createSequence(undefined, `${generateRandomName()}${adaptation.input.fileExtension}`);
  await workspace.searchForFileAndWait(sequence.sequenceName);
  await workspace.clickFile(sequence.sequenceName);

  await expect(setup.page).toHaveURL(
    getWorkspacesUrl(
      workspace.baseURL,
      parseInt(workspace.workspaceId),
      `${sequence.sequencePath}/${sequence.sequenceName}`,
    ),
  );

  // Make changes
  await workspace.fillSequenceContent('// New content');

  // Verify save button is now enabled (unsaved changes detected)
  await expect(workspace.saveSequenceButton).toBeEnabled();

  // Save and verify button is disabled again
  await workspace.saveSequence();

  await workspace.openOutputPanel();
});

test.afterAll(async () => {
  // Cleanup: delete workspace, parcel, and dictionary
  await workspaces.goto();
  await workspaces.deleteWorkspace(workspaceName);
  await parcels.goto();
  await parcels.deleteParcel();

  await teardownTest(setup);
});

for (let i = 0; i < adaptation.outputs.length; i++) {
  const output = adaptation.outputs[i];
  const languageOutput = output.toOutputFormat();

  test.describe.serial('Workspace with sequence adaptation with multiple output languages', () => {
    test(`Convert input to ${output.name}`, async () => {
      const outputEditor = workspace.page.getByTestId('output-editor');

      await workspace.page.getByRole('combobox', { name: 'Output Format' }).selectOption({ index: i });

      // Validate that the output editor contains the correct output for the selected adaptation output language.
      // Allow extra time: selecting the format triggers an async adaptation conversion + CodeMirror
      // re-render, and the editor may still show the previous language's output momentarily.
      await expect(outputEditor).toContainText(languageOutput, { timeout: 15000 });
    });

    test(`Copy the output for ${output.name}`, async () => {
      // Grant clipboard permissions for this test
      await setup.context.grantPermissions(['clipboard-read', 'clipboard-write']);

      await workspace.page.getByRole('button', { name: 'Copy as' }).click();

      // Read from clipboard and verify
      const clipboardText = await setup.page.evaluate(() => navigator.clipboard.readText());

      // Validate that the clipboard contains the correct output for the selected adaptation output language
      expect(clipboardText).toContain(languageOutput);
    });
  });
}
