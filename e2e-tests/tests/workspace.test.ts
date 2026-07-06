import test, { expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { getWorkspacesUrl } from '../../src/utilities/routes.js';
import { Dictionaries } from '../fixtures/Dictionaries.js';
import { Parcels } from '../fixtures/Parcels.js';
import { User } from '../fixtures/User.js';
import { Workspace } from '../fixtures/Workspace.js';
import { Workspaces } from '../fixtures/Workspaces.js';
import { setupTest, teardownTest, type BrowserSetupResult } from '../utilities/api.js';
import { generateRandomName } from '../utilities/helpers.js';

// Main setup (uses default 'test' user)
let setup: BrowserSetupResult;
let dictionaries: Dictionaries;
let parcels: Parcels;
let sequence: { sequenceName: string; sequencePath: string };
let sequenceB: { sequenceName: string; sequencePath: string };
let workspace: Workspace;
let workspaces: Workspaces;
let workspaceId: string;
let workspaceName: string;

let workspaceForUnauthorized: Workspace;
// Separate browser contexts for multi-user tests
let setupAuthorized: BrowserSetupResult; // userA - will be added as collaborator
let setupUnauthorized: BrowserSetupResult; // userB - not a collaborator

/**
 * Asserts the three invariants of "this sequence is the active workspace file":
 * URL matches, the file's row is selected in the tree, and the editor pane has
 * rendered the file's section title. Used by the back/forward navigation tests.
 */
async function expectSequenceActive(seq: { sequenceName: string; sequencePath: string }): Promise<void> {
  await expect(setup.page).toHaveURL(
    getWorkspacesUrl(workspace.baseURL, parseInt(workspaceId), `${seq.sequencePath}/${seq.sequenceName}`),
  );
  await expect(workspace.getFileRow(seq.sequenceName)).toHaveAttribute('aria-selected', 'true');
  await expect(setup.page.getByTitle(`${seq.sequencePath}/${seq.sequenceName}`).first()).toBeVisible();
}

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
  await parcels.goto();
  await parcels.createParcel(dictionaries.commandDictionaryName, baseURL);

  // Create a workspace for testing
  await workspaces.goto();
  workspaceId = await workspaces.createWorkspace();
  workspaceName = workspaces.workspaceName;

  // Initialize workspace fixture
  workspace = new Workspace(setup.page, workspaceId, workspaceName, baseURL);
  workspace.updatePage(setup.page);

  // Create separate browser contexts for multi-user tests (pre-authenticated)
  setupAuthorized = await setupTest(browser, { model: false, user: 'userA' });
  setupUnauthorized = await setupTest(browser, { model: false, user: 'userB' });
  workspaceForUnauthorized = new Workspace(setupUnauthorized.page, workspaceId, workspaceName, baseURL);

  // Create workspace fixture for unauthorized user

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

  await teardownTest(setup);

  // Close additional user browser contexts
  await teardownTest(setupAuthorized);
  await teardownTest(setupUnauthorized);
});

test.describe.serial('Workspace', () => {
  test('Navigate to workspace should display workspace correctly', async () => {
    await expect(setup.page.locator('.workspace-title')).toBeVisible();
    await expect(setup.page).toHaveURL(getWorkspacesUrl(workspace.baseURL, parseInt(workspace.workspaceId)));
    await workspace.pageLoadingLocatorWithData.waitFor({ state: 'detached' });
  });

  test('Right icon rail shows sequence tabs when workspace loads with no file selected', async () => {
    // With no file in the URL the page defaults to a SequenceEditor, so the right
    // icon rail should expose Selected Command and Command Dictionary tabs alongside Metadata.
    await expect(setup.page.getByRole('button', { exact: true, name: 'Metadata' })).toBeVisible();
    await expect(setup.page.getByRole('button', { exact: true, name: 'Selected Command' })).toBeVisible();
    await expect(setup.page.getByRole('button', { exact: true, name: 'Command Dictionary' })).toBeVisible();
  });

  test('Workspace header menu should be accessible', async () => {
    await expect(workspace.workspaceContextMenuButton).toBeVisible();
    await workspace.openWorkspaceContextMenu();
    await expect(workspace.workspaceHeaderMenu).toBeVisible();

    // Check for expected menu items
    await expect(workspace.workspaceHeaderMenu.getByRole('menuitem', { name: 'New File' })).toBeVisible();

    // Close menu by pressing Escape
    await setup.page.keyboard.press('Escape');
    await expect(workspace.workspaceHeaderMenu).not.toBeVisible();
  });

  test('Create and delete workspace folder', async () => {
    const folderPath = await workspace.createFolder();
    expect(folderPath).toBeTruthy();

    // Cleanup
    await workspace.searchForFileAndWait(folderPath);
    await workspace.deleteFolder(folderPath);
  });

  test('Create workspace sequence', async () => {
    sequence = await workspace.createSequence();

    expect(sequence.sequenceName).toBeTruthy();
  });

  test('Navigate to sequence', async () => {
    await workspace.searchForFileAndWait(sequence.sequenceName);
    await workspace.clickFile(sequence.sequenceName);

    await expect(setup.page).toHaveURL(
      getWorkspacesUrl(
        workspace.baseURL,
        parseInt(workspace.workspaceId),
        `${sequence.sequencePath}/${sequence.sequenceName}`,
      ),
    );
  });

  // The next six tests exercise the workspace's browser-history state machine:
  // open a second file, walk back/forward, switch to the actions tab and back.
  // Each transition is verified against three invariants — URL, tree selection,
  // and the editor pane's rendered section title — via expectSequenceActive.
  test('Back/forward: create a second sequence and open it builds the back stack', async () => {
    sequenceB = await workspace.createSequence();
    await workspace.clearSearch();
    await workspace.searchForFileAndWait(sequenceB.sequenceName);
    await workspace.clickFile(sequenceB.sequenceName);
    await workspace.clearSearch();
    await expectSequenceActive(sequenceB);
  });

  test('Back/forward: browser back returns to the previously opened sequence', async () => {
    await setup.page.goBack();
    await expectSequenceActive(sequence);
  });

  test('Back/forward: browser forward returns to the more recent sequence', async () => {
    await setup.page.goForward();
    await expectSequenceActive(sequenceB);
  });

  test('Back/forward: switching to the actions tab updates the URL', async () => {
    await setup.page.getByLabel('Actions', { exact: true }).click();
    await expect(setup.page).toHaveURL(/sidebarTab=actions/);
  });

  test('Back/forward: browser back from actions tab returns to the previously open sequence', async () => {
    await setup.page.goBack();
    await expectSequenceActive(sequenceB);
  });

  test('Back/forward: restore state for downstream tests (sequence A active, B deleted)', async () => {
    await workspace.searchForFileAndWait(sequence.sequenceName);
    await workspace.clickFile(sequence.sequenceName);
    await workspace.clearSearch();
    await expectSequenceActive(sequence);
    await workspace.searchForFileAndWait(sequenceB.sequenceName);
    await workspace.deleteSequence(sequenceB.sequenceName);
    await workspace.clearSearch();
  });

  test('Update the selected sequence content', async () => {
    await expect(workspace.saveSequenceButton).toBeDisabled();
    const newContent = '// Updated content\ncommand3();';
    await workspace.fillSequenceContent(newContent);
    await expect(workspace.saveSequenceButton).toBeEnabled();

    await workspace.saveSequence();
  });

  test('Import sequence from file', async () => {
    await workspace.importSeqJson();

    // Cleanup - the imported file is named 'json'
    await workspace.searchForFileAndWait('json');
    await workspace.deleteFile('json');
  });

  test('Delete sequence', async () => {
    await workspace.searchForFileAndWait(sequence.sequenceName);
    await workspace.deleteSequence(sequence.sequenceName);
  });

  test('Upload, download, verify, and delete file', async () => {
    const testFilePath = 'e2e-tests/data/ban00001.json';
    const testFileName = 'test-upload.json';
    const originalContent = readFileSync(testFilePath);

    // Upload the file
    await workspace.uploadFile(testFilePath, testFileName);

    // Search for the file and wait for it to appear in the grid
    await workspace.searchForFileAndWait(testFileName);

    // Download the file and compare contents
    const downloadedContent = await workspace.downloadFile(testFileName);
    expect(downloadedContent.equals(originalContent)).toBe(true);

    // Delete the file
    await workspace.deleteFile(testFileName);

    // Clear search and verify the file no longer exists
    await workspace.clearSearch();
    await expect(workspace.getFileRow(testFileName)).not.toBeVisible();
  });

  test('Rename file', async () => {
    // Create a file to rename
    const { sequenceName } = await workspace.createSequence(undefined, `${generateRandomName()}.seq`);
    await workspace.searchForFileAndWait(sequenceName);

    // Rename the file
    const newName = `${generateRandomName()}.seq`;
    await workspace.renameWorkspaceItem(sequenceName, newName, false);

    // Verify rename succeeded and cleanup
    await workspace.searchForFileAndWait(newName);
    await workspace.deleteFile(newName);
  });

  test('Rename folder', async () => {
    const folderName = await workspace.createFolder(generateRandomName());
    await workspace.searchForFileAndWait(folderName);

    const newFolderName = 'renamed-folder';
    await workspace.renameWorkspaceItem(folderName, newFolderName, true);

    // Verify rename succeeded and cleanup
    await workspace.searchForFileAndWait(newFolderName);
    await workspace.deleteFolder(newFolderName);
  });

  test('Delete folder with contents', async () => {
    // Create folder with a file inside
    const folderName = await workspace.createFolder(generateRandomName());
    const fileName = `${generateRandomName()}.seq`;
    await workspace.createSequence(folderName, fileName);

    // Search and delete the folder
    await workspace.searchForFileAndWait(folderName);
    await workspace.deleteFolder(folderName);

    // Verify folder is deleted (use searchForFile for negative assertion)
    await workspace.searchForFile(folderName);
    await expect(workspace.getFileRow(folderName)).not.toBeVisible();

    // Verify file is deleted (use searchForFile for negative assertion)
    await workspace.searchForFile(fileName);
    await expect(workspace.getFileRow(fileName)).not.toBeVisible();
  });

  test('Context menu shows appropriate menu items for files vs folders', async () => {
    // Create a file and folder for testing
    const { sequenceName } = await workspace.createSequence(undefined, `${generateRandomName()}.seq`);
    const folderName = await workspace.createFolder(generateRandomName());

    // Test file context menu - should have Download
    await workspace.searchForFileAndWait(sequenceName);
    await workspace.openFileContextMenu(sequenceName);
    await expect(
      workspace.workspaceFileContextMenu.getByRole('menuitem', { name: 'Run Action on 1 File' }),
    ).toBeVisible();
    await setup.page.keyboard.press('Escape');

    // Test folder context menu - should NOT have Download
    await workspace.searchForFileAndWait(folderName);
    await workspace.openFileContextMenu(folderName);
    await expect(
      workspace.workspaceFileContextMenu.getByRole('menuitem', { name: 'Run Action on All Files within Selection' }),
    ).toBeVisible();
    await setup.page.keyboard.press('Escape');

    // Cleanup
    await workspace.searchForFileAndWait(sequenceName);
    await workspace.deleteFile(sequenceName);
    await workspace.searchForFileAndWait(folderName);
    await workspace.deleteFolder(folderName);
  });

  test('Save file and detect unsaved changes', async () => {
    // Create a sequence to edit
    const { sequenceName } = await workspace.createSequence(undefined, `${generateRandomName()}.seq`);
    await workspace.searchForFileAndWait(sequenceName);
    await workspace.clickFile(sequenceName);

    // Verify save button is disabled initially
    await expect(workspace.saveSequenceButton).toBeDisabled();

    // Make changes
    await workspace.fillSequenceContent('// New content');

    // Verify save button is now enabled (unsaved changes detected)
    await expect(workspace.saveSequenceButton).toBeEnabled();

    // Save and verify button is disabled again
    await workspace.saveSequence();
    await expect(workspace.saveSequenceButton).toBeDisabled();

    // Cleanup
    await workspace.searchForFileAndWait(sequenceName);
    await workspace.deleteFile(sequenceName);
  });

  test('Unsaved changes warning when navigating away', async () => {
    // Create two sequences
    const { sequenceName: file1 } = await workspace.createSequence(undefined, `${generateRandomName()}.seq`);
    const { sequenceName: file2 } = await workspace.createSequence(undefined, `${generateRandomName()}.seq`);

    // Open first file and make changes
    await workspace.searchForFileAndWait(file1);
    await workspace.clickFile(file1);
    await workspace.fillSequenceContent('// Unsaved changes');
    await expect(workspace.saveSequenceButton).toBeEnabled();

    // Try to navigate to second file
    await workspace.searchForFileAndWait(file2);
    await workspace.clickFile(file2, { force: true });

    // Should show confirmation modal
    const modal = setup.page.locator('#modal-container');
    await modal.waitFor({ state: 'attached' });
    await expect(modal).toContainText('unsaved changes');

    // Cancel navigation
    await setup.page.getByRole('button', { name: 'Keep Editing' }).click();

    // Should still be on first file with unsaved changes
    await expect(workspace.saveSequenceButton).toBeEnabled();

    // Cleanup - save first, then delete both
    await workspace.saveSequence();
    await workspace.searchForFileAndWait(file1);
    await workspace.deleteFile(file1);
    await workspace.searchForFileAndWait(file2);
    await workspace.deleteFile(file2);
  });

  test('Move file to folder', async () => {
    // Create a file and folder
    const { sequenceName } = await workspace.createSequence(undefined, `${generateRandomName()}.seq`);
    const folderName = await workspace.createFolder(generateRandomName());

    // Search and open context menu for the file
    await workspace.searchForFileAndWait(sequenceName);
    await workspace.openFileContextMenu(sequenceName);
    await workspace.workspaceFileContextMenu.getByRole('menuitem', { exact: true, name: 'Move/Copy' }).click();

    // Select destination folder
    await setup.page.locator('#modal-container').getByRole('menuitem', { name: folderName }).click();
    await setup.page.getByRole('button', { name: 'Move' }).click();

    await workspace.waitForToast('Workspace File Moved Successfully');

    // Verify file is now in folder by searching for full path
    await workspace.searchForFileAndWait(sequenceName);

    // Cleanup
    await workspace.searchForFileAndWait(folderName);
    await workspace.deleteFolder(folderName);
  });

  test('Open file in new tab', async () => {
    // Create a file
    const { sequenceName, sequencePath } = await workspace.createSequence(undefined, `${generateRandomName()}.seq`);
    await workspace.searchForFileAndWait(sequenceName);

    // Open context menu and click Open in New Tab
    await workspace.openFileContextMenu(sequenceName);
    const [newPage] = await Promise.all([
      setup.page.context().waitForEvent('page'),
      workspace.workspaceFileContextMenu.getByRole('menuitem', { name: 'Open in New Tab' }).click(),
    ]);

    // Verify new tab has correct URL
    await newPage.waitForLoadState();
    await expect(newPage).toHaveURL(
      getWorkspacesUrl(workspace.baseURL, parseInt(workspace.workspaceId), `${sequencePath}/${sequenceName}`),
    );

    // Close new tab
    await newPage.close();

    // Cleanup
    await workspace.searchForFileAndWait(sequenceName);
    await workspace.deleteFile(sequenceName);
  });

  test('Breadcrumb navigation', async () => {
    // Create nested folder structure: parent/child with a file inside
    const parentFolder = await workspace.createFolder(generateRandomName());
    const childFolder = generateRandomName();
    const testFile = `${generateRandomName()}.seq`;
    await workspace.createFolder(`${parentFolder}/${childFolder}`);
    await workspace.createSequence(`${parentFolder}/${childFolder}`, testFile);

    // Double-click on the child folder to navigate into it
    await workspace.searchForFileAndWait(childFolder);
    await workspace.getFileRow(childFolder).dblclick();
    // Click on the file to trigger URL change
    await workspace.clearSearch();
    await workspace.clickFile(testFile);

    // Verify URL contains the full path (slashes are URL-encoded as %2F)
    await expect(setup.page).toHaveURL(new RegExp(`${parentFolder}%2F${childFolder}%2F${testFile}`));

    // Click the parent breadcrumb to navigate back
    // Given the generated names, this means clicking on the ellipses (...) breadcrumb in order
    // to select the parent folder
    await setup.page.getByRole('button', { name: 'Show hidden folders' }).click();
    await setup.page.getByRole('menuitem', { name: parentFolder }).click();

    // Select the folder to change the url
    await workspace.searchForFileAndWait(childFolder);
    await workspace.clickFile(childFolder);

    // Verify breadcrumb navigation worked - URL should now point to parent folder level
    await expect(setup.page).toHaveURL(new RegExp(`${parentFolder}(?!%2F${childFolder}%2F${testFile})`));

    // Navigate back to root to delete the parent folder
    await setup.page.getByRole('button', { name: workspaceName }).click();
    await workspace.searchForFileAndWait(parentFolder);
    await workspace.deleteFolder(parentFolder);
  });

  test('Copy full path to clipboard', async () => {
    // Grant clipboard permissions for this test
    await setup.context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Create a file
    const { sequenceName, sequencePath } = await workspace.createSequence(undefined, `${generateRandomName()}.seq`);
    await workspace.searchForFileAndWait(sequenceName);

    // Open context menu and click Copy Full Path
    await workspace.openFileContextMenu(sequenceName);
    await workspace.workspaceFileContextMenu.getByRole('menuitem', { name: 'Copy Full Path' }).click();

    // Read from clipboard and verify
    const clipboardText = await setup.page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain(sequencePath);
    expect(clipboardText).toContain(sequenceName);

    // Cleanup
    await workspace.searchForFileAndWait(sequenceName);
    await workspace.deleteFile(sequenceName);
  });

  test('Workspace panel toggling', async () => {
    // The left icon rail has a collapse/expand button whose label reflects the panel state.
    // Initially the panel is open, so the button should say "Collapse panel".
    const leftPanelToggle = setup.page.getByRole('button', { name: /Collapse panel|Expand panel/ }).first();
    await expect(leftPanelToggle).toHaveAttribute('aria-label', 'Collapse panel');

    // Click to collapse
    await leftPanelToggle.click();

    // After collapsing, the button label should change to "Expand panel"
    await expect(leftPanelToggle).toHaveAttribute('aria-label', 'Expand panel');

    // Click to re-expand
    await leftPanelToggle.click();
    await expect(leftPanelToggle).toHaveAttribute('aria-label', 'Collapse panel');

    // Test active tab toggling - clicking settings should activate it and open the panel
    await workspace.workspaceSettingsButton.click();
    await expect(workspace.workspaceSettingsButton).toHaveAttribute('data-active', 'true');
    await expect(leftPanelToggle).toHaveAttribute('aria-label', 'Collapse panel');

    // Clicking settings again should deactivate it and collapse the panel
    await workspace.workspaceSettingsButton.click();
    await expect(workspace.workspaceSettingsButton).toHaveAttribute('data-active', 'false');
    await expect(leftPanelToggle).toHaveAttribute('aria-label', 'Expand panel');

    // Clicking settings again should reactivate it and expand the panel
    await workspace.workspaceSettingsButton.click();
    await expect(workspace.workspaceSettingsButton).toHaveAttribute('data-active', 'true');
    await expect(leftPanelToggle).toHaveAttribute('aria-label', 'Collapse panel');
  });

  test('Add collaborator to workspace', async () => {
    await workspace.workspaceCollaboratorInput.click();
    await workspace.workspaceCollaboratorInput.fill('userA');

    // Wait for suggestions dropdown to appear and find option within it
    const suggestionsDropdown = setup.page.locator('#tags-input');
    await expect(suggestionsDropdown).toBeVisible();
    await suggestionsDropdown.getByRole('option', { exact: true, name: 'userA' }).click();

    await workspace.waitForToast('Workspace Collaborators Updated');
  });

  test('Bulk workspace file operations', async () => {
    // This test creates 5 files + 2 folders (each a ~toast-gated backend round-trip) and then does
    // bulk move/copy/delete. The 60s set in beforeAll only applies to that hook, so the test body
    // otherwise runs at the 30s default and can't finish under CI load. Give it its own budget.
    test.setTimeout(90000);
    await workspace.workspaceFileBrowserButton.click();

    // Create test files and folders
    const { sequenceName: file1 } = await workspace.createSequence('', `${generateRandomName()}.seq`);
    const { sequenceName: file2 } = await workspace.createSequence('', `${generateRandomName()}.seq`);
    const { sequenceName: file3 } = await workspace.createSequence('', `${generateRandomName()}.seq`);
    const { sequenceName: file4 } = await workspace.createSequence('', `${generateRandomName()}.seq`);
    const { sequenceName: file5 } = await workspace.createSequence('', `${generateRandomName()}.seq`);
    const folder1 = await workspace.createFolder(generateRandomName());
    const folder2 = await workspace.createFolder(generateRandomName());

    // Clear search to see all files
    await workspace.clearSearch();

    // Select 2 files for moving using Ctrl+click. force:true lands the click even while the grid is
    // still re-positioning rows under CI contention (see the deletion block below for details).
    await workspace.getFileRow(file1).click({ force: true });
    await workspace.getFileRow(file2).click({ force: true, modifiers: ['ControlOrMeta'] });

    // Open context menu and move files
    await workspace.openFileContextMenu(file1);
    await workspace.workspaceFileContextMenu.getByRole('menuitem', { exact: true, name: 'Move/Copy' }).click();
    await setup.page.getByRole('menuitem', { name: workspace.workspaceName }).click();
    await setup.page.getByRole('menuitem', { name: folder1 }).click();
    await setup.page.getByRole('button', { name: 'Move Files' }).click();

    // Verify files were moved (no longer in root, now in folder1)
    await workspace.clearSearch();
    const sidebar = workspace.workspaceFileGrid;
    // Files should NOT be at root path (just filename)
    await expect(sidebar.getByTitle(file1, { exact: true })).not.toBeVisible();
    await expect(sidebar.getByTitle(file2, { exact: true })).not.toBeVisible();
    // Files SHOULD be at folder1 path
    await expect(sidebar.getByTitle(`${folder1}/${file1}`, { exact: true })).toBeVisible();
    await expect(sidebar.getByTitle(`${folder1}/${file2}`, { exact: true })).toBeVisible();

    // Select 2 other files for copying
    await workspace.getFileRow(file3).click({ force: true });
    await workspace.getFileRow(file4).click({ force: true, modifiers: ['ControlOrMeta'] });

    // Open context menu and copy files
    await workspace.openFileContextMenu(file3);
    await workspace.workspaceFileContextMenu.getByRole('menuitem', { exact: true, name: 'Move/Copy' }).click();
    await setup.page.getByRole('menuitem', { name: workspace.workspaceName }).click();
    await setup.page.getByRole('menuitem', { name: folder2 }).click();
    await setup.page.getByRole('button', { name: 'Copy Files' }).click();

    // Verify files still exist in root (copy, not move)
    await workspace.clearSearch();
    // Files SHOULD still be at root path (just filename)
    await expect(sidebar.getByTitle(file3, { exact: true })).toBeVisible();
    await expect(sidebar.getByTitle(file4, { exact: true })).toBeVisible();
    // Copies SHOULD also exist at folder2 path
    await expect(sidebar.getByTitle(`${folder2}/${file3}`, { exact: true })).toBeVisible();
    await expect(sidebar.getByTitle(`${folder2}/${file4}`, { exact: true })).toBeVisible();

    // Select 2 files for deletion (use row-id to select specifically the root files, not the copies).
    // After the preceding operations the grid re-filters/re-positions rows, and under CI CPU
    // contention a row's transform can keep shifting long enough that Playwright's actionability
    // "stable" check never passes, hanging the click to the test timeout. toHaveCount(1) guards
    // against a transient duplicate row-id; force:true lands the click without waiting for the row
    // to stop moving (we still target the correct row via its unique row-id).
    const file3Row = workspace.workspaceFileGrid.locator(`[row-id="${file3}"]`);
    const file5Row = workspace.workspaceFileGrid.locator(`[row-id="${file5}"]`);
    await expect(file3Row).toHaveCount(1);
    await file3Row.click({ force: true });
    await expect(file5Row).toHaveCount(1);
    await file5Row.click({ force: true, modifiers: ['ControlOrMeta'] });

    // Open context menu and delete files
    await expect(file3Row).toHaveCount(1);
    await file3Row.click({ button: 'right', force: true });
    await workspace.workspaceFileContextMenu.getByRole('menuitem', { name: 'Delete' }).click();
    await setup.page.getByRole('button', { name: 'Delete' }).click();

    // Verify files were deleted from root
    await workspace.clearSearch();
    await expect(sidebar.getByTitle(file3, { exact: true })).not.toBeVisible();
    await expect(sidebar.getByTitle(file5, { exact: true })).not.toBeVisible();

    // Cleanup remaining files and folders
    // Delete folders first (which deletes their contents including copied files)
    await workspace.searchForFileAndWait(folder1);
    await workspace.deleteFolder(folder1);
    await workspace.searchForFileAndWait(folder2);
    await workspace.deleteFolder(folder2);
    // Wait for the folder2 row to fully disappear from the grid before searching for file4,
    // otherwise the grid may still show the copy (folder2/file4) alongside the root file4
    await workspace.clearSearch();
    await expect(workspace.getFileRow(folder2)).not.toBeVisible();
    await workspace.searchForFileAndWait(file4);
    await workspace.deleteFile(file4);
  });

  test('Toggle file read-only and verify editor is locked', async () => {
    // Use the adaptation's input-sequence extension so the file opens as a sequence with the
    // Selected Command panel (a plain `.seq` would open as generic text — no command panel).
    const { sequenceName } = await workspace.createSequence(undefined, `${generateRandomName()}.seqN.txt`);
    await workspace.searchForFileAndWait(sequenceName);
    await workspace.clickFile(sequenceName);

    // Wait for the editor to load and the file metadata banner to appear
    await expect(workspace.readOnlyCheckbox).toBeVisible({ timeout: 10000 });

    // Add a command so the Selected Command panel renders editable argument inputs.
    await workspace.fillSequenceContent('C FSW_CMD_0 "ON" true 0.5');

    // The Selected Command panel (right side) shows the command's argument editors;
    // float_arg_0 renders as a numeric input (spinbutton) labeled by its arg name.
    const commandArgInput = setup.page.getByRole('spinbutton', { name: 'float_arg_0' });
    await expect(commandArgInput).toBeVisible({ timeout: 10000 });

    // Verify the file is initially editable — title should NOT contain "(Read only)"
    await expect(setup.page.getByText('(Read only)')).not.toBeVisible();
    await expect(workspace.saveSequenceButton).toBeVisible();
    // ...and the command argument inputs are interactive.
    await expect(commandArgInput).toBeEnabled();

    // Persist so the document is clean before toggling read-only / deleting later.
    await workspace.saveSequence();

    // Toggle read-only ON
    await workspace.readOnlyCheckbox.click();
    await workspace.waitForToast('File marked as read only');

    // Verify editor title now shows "(Read only)"
    await expect(setup.page.getByText('(Read only)')).toBeVisible();

    // Verify the Save button is hidden (read-only files can't be saved)
    await expect(workspace.saveSequenceButton).not.toBeVisible();

    // Verify the Selected Command panel argument inputs are disabled while read-only —
    // `EditorState.readOnly` alone wouldn't stop the form-builder from editing the document.
    await expect(commandArgInput).toBeDisabled();

    // Verify the editor rejects input — type something and confirm content didn't change
    await workspace.sequenceEditor.click();
    await setup.page.keyboard.type('this should not appear');
    await expect(workspace.sequenceEditor).not.toContainText('this should not appear');

    // Toggle read-only OFF
    await workspace.readOnlyCheckbox.click();
    await workspace.waitForToast('File marked as editable');

    // Verify editor title no longer shows "(Read only)"
    await expect(setup.page.getByText('(Read only)')).not.toBeVisible();

    // Verify the Save button reappears
    await expect(workspace.saveSequenceButton).toBeVisible();
    // ...and the command argument inputs are interactive again.
    await expect(commandArgInput).toBeEnabled();

    // Cleanup
    await workspace.searchForFileAndWait(sequenceName);
    await workspace.deleteFile(sequenceName);
  });

  test('Edit and save user metadata', async () => {
    // Create a file
    const { sequenceName } = await workspace.createSequence(undefined, `${generateRandomName()}.seqN.txt`);
    await workspace.searchForFileAndWait(sequenceName);
    await workspace.clickFile(sequenceName);

    // Open the metadata panel
    await workspace.openMetadataPanel();

    // Click Edit to enter edit mode
    await expect(workspace.metadataEditButton).toBeVisible({ timeout: 5000 });
    await workspace.metadataEditButton.click();

    // Save and Cancel buttons should now appear, Edit button should be gone
    await expect(workspace.metadataSaveButton).toBeVisible();
    await expect(workspace.metadataCancelButton).toBeVisible();
    await expect(workspace.metadataEditButton).not.toBeVisible();

    // Type valid JSON user metadata
    await workspace.fillUserMetadata('{"testKey": "testValue"}');

    // Save should be enabled for valid JSON
    await expect(workspace.metadataSaveButton).toBeEnabled();
    await workspace.metadataSaveButton.click();
    await workspace.waitForToast('User metadata updated');

    // After save, should exit edit mode — Edit button reappears
    await expect(workspace.metadataEditButton).toBeVisible();
    await expect(workspace.metadataSaveButton).not.toBeVisible();

    // Verify the saved content persists — re-enter edit mode and check
    await workspace.metadataEditButton.click();
    await expect(workspace.userMetadataEditor).toContainText('testKey');
    await expect(workspace.userMetadataEditor).toContainText('testValue');
    await workspace.metadataCancelButton.click();

    // Cleanup
    await workspace.searchForFileAndWait(sequenceName);
    await workspace.deleteFile(sequenceName);
  });

  test('Cancel discards user metadata changes', async () => {
    // Create a file
    const { sequenceName } = await workspace.createSequence(undefined, `${generateRandomName()}.seqN.txt`);
    await workspace.searchForFileAndWait(sequenceName);
    await workspace.clickFile(sequenceName);

    // Open metadata panel and enter edit mode
    await workspace.openMetadataPanel();
    await expect(workspace.metadataEditButton).toBeVisible({ timeout: 5000 });
    await workspace.metadataEditButton.click();

    // Type some content
    await workspace.fillUserMetadata('{"unsaved": "changes"}');

    // Cancel should revert to the original content
    await workspace.metadataCancelButton.click();

    // Verify we're back to the original empty object
    await expect(workspace.metadataEditButton).toBeVisible();
    await expect(workspace.userMetadataEditor).not.toContainText('unsaved');

    // Cleanup
    await workspace.searchForFileAndWait(sequenceName);
    await workspace.deleteFile(sequenceName);
  });

  test('Invalid JSON disables user metadata save button', async () => {
    // Create a file
    const { sequenceName } = await workspace.createSequence(undefined, `${generateRandomName()}.seqN.txt`);
    await workspace.searchForFileAndWait(sequenceName);
    await workspace.clickFile(sequenceName);

    // Open metadata panel and enter edit mode
    await workspace.openMetadataPanel();
    await expect(workspace.metadataEditButton).toBeVisible({ timeout: 5000 });
    await workspace.metadataEditButton.click();

    // Type invalid JSON (missing closing brace)
    await workspace.fillUserMetadata('{"broken": ');

    // Save button should be disabled and "Invalid JSON" error should show
    await expect(workspace.metadataSaveButton).toBeDisabled();
    await expect(setup.page.getByText('Invalid JSON')).toBeVisible();

    // Fix the JSON
    await workspace.fillUserMetadata('{"fixed": true}');

    // Save button should now be enabled and error should be gone
    await expect(workspace.metadataSaveButton).toBeEnabled();
    await expect(setup.page.getByText('Invalid JSON')).not.toBeVisible();

    // Cancel and cleanup
    await workspace.metadataCancelButton.click();
    await workspace.searchForFileAndWait(sequenceName);
    await workspace.deleteFile(sequenceName);
  });

  test('Switching files discards unsaved user metadata edits', async () => {
    // Create two files
    const { sequenceName: file1 } = await workspace.createSequence(undefined, `${generateRandomName()}.seqN.txt`);
    const { sequenceName: file2 } = await workspace.createSequence(undefined, `${generateRandomName()}.seqN.txt`);

    // Open first file and start editing metadata
    await workspace.searchForFileAndWait(file1);
    await workspace.clickFile(file1);
    await workspace.openMetadataPanel();
    await expect(workspace.metadataEditButton).toBeVisible({ timeout: 5000 });
    await workspace.metadataEditButton.click();
    await workspace.fillUserMetadata('{"shouldBeDiscarded": true}');

    // Switch to second file
    await workspace.searchForFileAndWait(file2);
    await workspace.clickFile(file2);

    // Metadata panel should show the second file's metadata, edit mode should be exited
    await expect(workspace.metadataEditButton).toBeVisible({ timeout: 5000 });
    await expect(workspace.metadataSaveButton).not.toBeVisible();
    await expect(workspace.userMetadataEditor).not.toContainText('shouldBeDiscarded');

    // Cleanup
    await workspace.searchForFileAndWait(file1);
    await workspace.deleteFile(file1);
    await workspace.searchForFileAndWait(file2);
    await workspace.deleteFile(file2);
  });

  test('Error console is visible with tabs', async () => {
    const consoleNode = setup.page.getByTestId('console');
    await expect(consoleNode).toBeVisible();

    // Verify all expected console tabs are present
    await expect(consoleNode.getByRole('tab', { name: 'Actions' })).toBeVisible();
    await expect(consoleNode.getByRole('tab', { name: 'Adaptation' })).toBeVisible();
    await expect(consoleNode.getByRole('tab', { name: 'Linting' })).toBeVisible();
    await expect(consoleNode.getByRole('tab', { name: 'Logs' })).toBeVisible();
  });

  test('Error console can be expanded and collapsed', async () => {
    const consoleNode = setup.page.getByTestId('console');
    const toggleButton = consoleNode.getByRole('button', { name: /Collapse|Expand/ });

    // Ensure the console starts expanded by clicking a tab (always expands regardless of initial state)
    await consoleNode.getByRole('tab', { name: 'Actions' }).click();

    // When expanded, the search input should be visible and the clicked tab should be active
    await expect(consoleNode.getByPlaceholder('Search')).toBeVisible();
    await expect(consoleNode.getByRole('tab', { name: 'Actions' })).toHaveAttribute('data-state', 'active');

    // Switch to another tab and verify it becomes active
    await consoleNode.getByRole('tab', { name: 'Linting' }).click();
    await expect(consoleNode.getByRole('tab', { name: 'Linting' })).toHaveAttribute('data-state', 'active');
    await expect(consoleNode.getByRole('tab', { name: 'Actions' })).toHaveAttribute('data-state', 'inactive');

    // Collapse the console using the chevron toggle button
    await toggleButton.click();

    // Search input should no longer be visible when collapsed
    await expect(consoleNode.getByPlaceholder('Search')).not.toBeVisible();

    // Expand again by clicking a tab
    await consoleNode.getByRole('tab', { name: 'Adaptation' }).click();
    await expect(consoleNode.getByPlaceholder('Search')).toBeVisible();
    await expect(consoleNode.getByRole('tab', { name: 'Adaptation' })).toHaveAttribute('data-state', 'active');
  });

  test('Users not authorized to modify the workspace should not be able to', async () => {
    // Use userB's separate browser context - no login/logout needed!
    // userB is NOT a collaborator on this workspace

    // Switch to 'user' role which has limited permissions
    const userB = new User(setupUnauthorized.page, 'userB');
    await userB.gotoWithRetry('/plans');
    await userB.switchRole('user');

    // Navigate to workspace
    const workspaceUrl = getWorkspacesUrl(workspaceForUnauthorized.baseURL, parseInt(workspaceId));
    await userB.gotoWithRetry(workspaceUrl);

    await setupUnauthorized.page.waitForLoadState('networkidle');

    // Wait for the workspace file grid to be visible, which confirms both:
    // 1. The workspace subscription has delivered data (workspace is truthy)
    // 2. The workspace contents API call completed (workspaceTree is truthy)
    // Using file grid visibility is more reliable than waiting for loading to detach
    await workspaceForUnauthorized.workspaceFileGrid.waitFor({ state: 'visible', timeout: 30000 });

    // Verify userB can see the workspace file browser (read access)
    await expect(workspaceForUnauthorized.workspaceFileGrid).toBeVisible();

    // As a non-collaborator with 'user' role, the 'New File' option should be disabled
    // via the permissionHandler (adds 'permission-disabled' class and blocks clicks)
    await workspaceForUnauthorized.openWorkspaceContextMenu();
    // The wrapper div[role="button"] receives the permission-disabled class from permissionHandler
    const newFileMenuItemWrapper = workspaceForUnauthorized.workspaceHeaderMenu
      .locator('div[role="button"]')
      .filter({ hasText: 'New File' });

    // The permissionHandler directive adds 'permission-disabled' class when user lacks permission
    await expect(newFileMenuItemWrapper).toHaveClass(/permission-disabled/);
  });
});
