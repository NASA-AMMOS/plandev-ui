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
let workspace: Workspace;
let workspaces: Workspaces;
let workspaceId: string;
let workspaceName: string;

let workspaceForUnauthorized: Workspace;
// Separate browser contexts for multi-user tests
let setupAuthorized: BrowserSetupResult; // userA - will be added as collaborator
let setupUnauthorized: BrowserSetupResult; // userB - not a collaborator

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
    await workspace.clickFile(file2);

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
    // Get the sidebar wrapper (has data-state) and the inner sidebar (has the button)
    const sidebarWrapper = setup.page.locator('[data-slot="sidebar"]');

    // Verify sidebar is initially expanded
    await expect(sidebarWrapper).toHaveAttribute('data-state', 'expanded');

    // Click expand/collapse button to collapse
    await sidebarWrapper.getByRole('button', { name: 'Collapse panel' }).click();
    await expect(sidebarWrapper).toHaveAttribute('data-state', 'collapsed');

    // Click again to expand
    await sidebarWrapper.getByRole('button', { name: 'Expand panel' }).click();
    await expect(sidebarWrapper).toHaveAttribute('data-state', 'expanded');

    // Test active tab toggling - clicking settings should open it
    await workspace.workspaceSettingsButton.click();
    await expect(workspace.workspaceCollaboratorInput).toBeVisible();

    // Clicking settings again should close it (toggle off)
    await workspace.workspaceSettingsButton.click();
    await expect(workspace.workspaceCollaboratorInput).not.toBeVisible();

    // Reopen the sidebar
    await workspace.workspaceSettingsButton.click();
    await expect(workspace.workspaceCollaboratorInput).toBeVisible();
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

    // Select 2 files for moving using Ctrl+click
    await workspace.getFileRow(file1).click();
    await workspace.getFileRow(file2).click({ modifiers: ['ControlOrMeta'] });

    // Open context menu and move files
    await workspace.openFileContextMenu(file1);
    await workspace.workspaceFileContextMenu.getByRole('menuitem', { exact: true, name: 'Move/Copy' }).click();
    await setup.page.getByRole('menuitem', { name: workspace.workspaceName }).click();
    await setup.page.getByRole('menuitem', { name: folder1 }).click();
    await setup.page.getByRole('button', { name: 'Move Files' }).click();

    // Verify files were moved (no longer in root, now in folder1)
    await workspace.clearSearch();
    const sidebar = setup.page.getByRole('complementary');
    // Files should NOT be at root path (just filename)
    await expect(sidebar.getByTitle(file1, { exact: true })).not.toBeVisible();
    await expect(sidebar.getByTitle(file2, { exact: true })).not.toBeVisible();
    // Files SHOULD be at folder1 path
    await expect(sidebar.getByTitle(`${folder1}/${file1}`, { exact: true })).toBeVisible();
    await expect(sidebar.getByTitle(`${folder1}/${file2}`, { exact: true })).toBeVisible();

    // Select 2 other files for copying
    await workspace.getFileRow(file3).click();
    await workspace.getFileRow(file4).click({ modifiers: ['ControlOrMeta'] });

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

    // Select 2 files for deletion (use row-id to select specifically the root files, not the copies)
    await workspace.workspaceFileGrid.locator(`[row-id="${file3}"]`).click();
    await workspace.workspaceFileGrid.locator(`[row-id="${file5}"]`).click({ modifiers: ['ControlOrMeta'] });

    // Open context menu and delete files
    await workspace.workspaceFileGrid.locator(`[row-id="${file3}"]`).click({ button: 'right' });
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
    // Now file4 only exists at root, so searchForFileAndWait won't have duplicates
    await workspace.searchForFileAndWait(file4);
    await workspace.deleteFile(file4);
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
