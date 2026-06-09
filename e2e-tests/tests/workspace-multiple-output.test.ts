import test, { expect } from '@playwright/test';
import { getWorkspacesUrl } from '../../src/utilities/routes.js';
import { Dictionaries } from '../fixtures/Dictionaries.js';
import { Parcels } from '../fixtures/Parcels.js';
import { Workspace } from '../fixtures/Workspace.js';
import { Workspaces } from '../fixtures/Workspaces.js';
import { setupTest, teardownTest, type BrowserSetupResult } from '../utilities/api.js';

// These values are hard-coded in the sequence adaptation file `sequence-adaptation-multiple-output.js`
const language1Output = 'This is the output for language 1';
const language2Output = 'This is the output for language 2';

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

  // TODO need to accept downloads in context, used to be await browser.newContext({ acceptDownloads: true });
  setup = await setupTest(browser, { model: false });

  dictionaries = new Dictionaries(setup.page);
  parcels = new Parcels(setup.page);
  workspaces = new Workspaces(setup.page, parcels, baseURL);

  // Setup dependencies: dictionary and parcel
  await dictionaries.goto();
  await dictionaries.createCommandDictionary();
  await dictionaries.createSequenceAdaptation(undefined, 'e2e-tests/data/sequence-adaptation-multiple-output.js');
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
});

test.afterAll(async () => {
  // Cleanup: delete workspace, parcel, and dictionary
  await workspaces.goto();
  await workspaces.deleteWorkspace(workspaceName);
  await parcels.goto();
  await parcels.deleteParcel();

  await teardownTest(setup);
});

test.describe.serial('Workspace with sequence adaptation with multiple output languages', () => {
  test('Convert input to first output language', async () => {
    sequence = await workspace.createSequence(undefined, 'foo.seqN.txt');
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

    const outputEditor = workspace.page.getByTestId('output-editor');

    // Validate that the output editor contains the correct output for the adaptation's first output language
    await expect(outputEditor).toContainText(language1Output);
  });

  test('Copy the output for the first language', async () => {
    // Grant clipboard permissions for this test
    await setup.context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await workspace.page.getByRole('button', { name: 'Copy as' }).click();

    // Read from clipboard and verify
    const clipboardText = await setup.page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain(language1Output);
  });

  test('Convert input to second output language', async () => {
    // Change the outputted language
    await workspace.page.getByRole('combobox', { name: 'Output Format' }).selectOption({ index: 1 });

    const outputEditor = workspace.page.getByTestId('output-editor');

    // Validate that the output editor contains the correct output for the adaptation's second output language
    await expect(outputEditor).toContainText(language2Output);
  });

  test('Copy the output for the second language', async () => {
    // Grant clipboard permissions for this test
    await setup.context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await workspace.page.getByRole('button', { name: 'Copy as' }).click();

    // Read from clipboard and verify
    const clipboardText = await setup.page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain(language2Output);
  });
});
