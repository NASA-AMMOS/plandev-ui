import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { readFileSync } from 'fs';
import { getWorkspacesUrl } from '../../src/utilities/routes';
import { generateRandomName, hoverRowAndWaitForButton, setFileInputByBuffer } from '../utilities/helpers';

export class Workspace {
  actionsTabButton!: Locator;
  editSequenceButton!: Locator;
  fileInput!: Locator;
  folderNameInput!: Locator;
  jsonPath: string = 'e2e-tests/data/ban00001.json';
  metadataCancelButton!: Locator;
  metadataEditButton!: Locator;
  metadataPanel!: Locator;
  metadataSaveButton!: Locator;
  metadataTabButton!: Locator;
  navButtonSequences!: Locator;
  navButtonSequencesMenu!: Locator;
  outputPanelCollapseButton!: Locator;
  pageLoadingLocatorWithData!: Locator;
  readOnlyCheckbox!: Locator;
  rightPanelCollapseButton!: Locator;
  saveSequenceButton!: Locator;
  searchInput!: Locator;
  sequenceEditor!: Locator;
  sequenceEditorContent!: Locator;
  sequenceNameInput!: Locator;
  textEditor!: Locator;
  userMetadataEditor!: Locator;
  workspaceCollaboratorInput!: Locator;
  workspaceContextMenuButton!: Locator;
  workspaceFileBrowserButton!: Locator;
  workspaceFileContextMenu!: Locator;
  workspaceFileGrid!: Locator;
  workspaceHeaderMenu!: Locator;
  workspaceRefreshButton!: Locator;
  workspaceSettingsButton!: Locator;
  workspaceSidebar!: Locator;

  constructor(
    public page: Page,
    public workspaceId: string,
    public workspaceName: string,
    public baseURL: string = '',
  ) {
    this.updatePage(page);
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
  }

  async clickFile(name: string, options?: { force?: boolean }): Promise<void> {
    // `force: true` is for callers that expect the click to immediately summon a modal
    // (e.g. unsaved-changes confirmation) — Playwright's hit-test would otherwise see the
    // modal backdrop and retry until timeout, even though the original click registered.
    await this.workspaceFileGrid.getByRole('row', { name }).click(options);
  }

  async createFolder(folderPath?: string): Promise<string> {
    const path = folderPath || generateRandomName();

    await this.openWorkspaceContextMenu();
    const workspaceMenuItem = this.workspaceHeaderMenu.getByRole('menuitem', { name: 'New Folder' });
    await workspaceMenuItem.waitFor({ state: 'visible' });
    // click() auto-waits for the menu item to be stable/actionable, so no fixed animation sleep is
    // needed (createSequence clicks its 'New File' item the same way without one).
    await workspaceMenuItem.click();
    const workspaceModalMenuItem = this.page
      .locator('#modal-container')
      .getByRole('menuitem', { name: this.workspaceName });
    await workspaceModalMenuItem.waitFor({ state: 'visible' });
    await workspaceModalMenuItem.click();
    await this.fillFolderPath(path);
    await this.page.getByRole('button', { name: 'Confirm' }).click();

    await this.waitForToast('Workspace Folder Created Successfully');

    return path;
  }

  async createSequence(
    sequencePath?: string,
    sequenceFileName?: string,
  ): Promise<{ sequenceName: string; sequencePath: string }> {
    const seqPath = sequencePath ?? generateRandomName();
    const seqName = sequenceFileName || `${generateRandomName()}.seq`;

    await this.openWorkspaceContextMenu();
    await this.workspaceHeaderMenu.getByRole('menuitem', { name: 'New File' }).click();
    await this.page.locator('#modal-container').getByRole('menuitem', { name: this.workspaceName }).click();

    await this.fillSequenceName(seqName, seqPath);
    await this.page.getByRole('button', { name: 'Confirm' }).click();

    await this.waitForToast('Workspace File Created Successfully');

    return { sequenceName: seqName, sequencePath: seqPath };
  }

  async deleteFile(fileName: string): Promise<void> {
    await this.openFileContextMenu(fileName);
    await this.workspaceFileContextMenu.getByRole('menuitem', { name: 'Delete' }).click();
    await this.page.locator('#modal-container').getByRole('button', { name: 'Delete' }).click();
    await this.waitForToast('Workspace File Deleted Successfully');
  }

  async deleteFolder(folderName: string): Promise<void> {
    await this.openFileContextMenu(folderName);
    await this.workspaceFileContextMenu.getByRole('menuitem', { name: 'Delete' }).click();
    await this.page.locator('#modal-container').getByRole('button', { name: 'Delete' }).click();
    await this.waitForToast('Workspace Folder Deleted Successfully');
  }

  async deleteSequence(sequenceName: string): Promise<void> {
    await this.openFileContextMenu(sequenceName);
    await this.workspaceFileContextMenu.getByRole('menuitem', { name: 'Delete' }).click();
    await this.page.locator('#modal-container').getByRole('button', { name: 'Delete' }).click();
    await this.waitForToast('Workspace File Deleted Successfully');
  }

  async downloadFile(fileName: string): Promise<Buffer> {
    await this.openFileContextMenu(fileName);

    // Wait for menu item to be ready before clicking
    const downloadMenuItem = this.workspaceFileContextMenu.getByRole('menuitem', { name: 'Download File' });
    await downloadMenuItem.waitFor({ state: 'visible' });

    // Use Promise.all to coordinate the download event with the click action
    const [download] = await Promise.all([
      this.page.waitForEvent('download', { timeout: 30000 }),
      downloadMenuItem.click(),
    ]);

    const stream = await download.createReadStream();

    if (!stream) {
      throw new Error('Failed to create download stream');
    }

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  private async fillFolderPath(folderPath: string): Promise<void> {
    await this.folderNameInput.fill(folderPath);
    await this.folderNameInput.evaluate(e => e.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })));
    await this.folderNameInput.evaluate(e => e.dispatchEvent(new Event('change')));
    await this.folderNameInput.blur();
  }

  async fillSequenceContent(content: string): Promise<void> {
    await this.sequenceEditor.click();
    await this.sequenceEditor.fill(content);
  }

  private async fillSequenceName(name: string, path?: string): Promise<void> {
    await this.sequenceNameInput.fill(path ? `${path}/${name}` : name);
    await this.sequenceNameInput.evaluate(e => e.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })));
    await this.sequenceNameInput.evaluate(e => e.dispatchEvent(new Event('change')));
    await this.sequenceNameInput.blur();
  }

  /**
   * Type content into the user metadata JSON editor (CodeMirror).
   * Clears existing content first.
   */
  async fillUserMetadata(content: string): Promise<void> {
    // Focus the CodeMirror editor
    await this.userMetadataEditor.click();
    // Select all and replace
    await this.page.keyboard.press('ControlOrMeta+a');
    await this.page.keyboard.type(content);
  }

  getFileRow(name: string): Locator {
    return this.workspaceFileGrid.getByRole('row', { name });
  }

  /**
   * Navigate to this specific workspace
   */
  async goto(workspaceId = this.workspaceId): Promise<void> {
    await this.page.goto(getWorkspacesUrl(this.baseURL, parseInt(workspaceId)), { waitUntil: 'load' });
    await this.page.waitForURL(getWorkspacesUrl(this.baseURL, parseInt(workspaceId)));
    await this.pageLoadingLocatorWithData.waitFor({ state: 'detached' });
    await expect(this.page.locator('.workspace-title')).toBeVisible();
  }

  async importSeqJson(filePath: string = this.jsonPath): Promise<void> {
    await this.openWorkspaceContextMenu();
    await this.workspaceHeaderMenu.getByRole('menuitem', { name: 'Upload File' }).click();
    await this.page.locator('#modal-container').getByRole('menuitem', { name: this.workspaceName }).click();

    const file = readFileSync(filePath);
    const fileBuffer = Buffer.from(file);

    const uploadButton = this.page.locator('#modal-container').getByRole('button', { exact: true, name: 'Upload' });

    await setFileInputByBuffer(this.page, this.fileInput, fileBuffer, 'application/json', 'json', uploadButton);

    await uploadButton.click();

    await this.waitForToast('Workspace File Uploaded Successfully');
  }

  async openFileContextMenu(fileName: string): Promise<void> {
    const row = this.workspaceFileGrid.getByRole('row', { name: fileName });
    // AG Grid can briefly detach/reattach rows during re-renders (e.g., after a delete
    // triggers a tree refetch). Wait for the row to stabilize before interacting.
    await row.waitFor({ state: 'visible', timeout: 5000 });
    try {
      await row.scrollIntoViewIfNeeded();
    } catch {
      // Row was detached during AG Grid re-render; re-wait and retry
      await row.waitFor({ state: 'visible', timeout: 5000 });
    }
    const moreActionsButton = row.getByLabel('More actions');
    await hoverRowAndWaitForButton(this.page, row, moreActionsButton);
    await moreActionsButton.click();
    await this.workspaceFileContextMenu.waitFor({ state: 'visible' });
  }

  /**
   * Open the right-side metadata panel by clicking the metadata tab icon.
   * If the panel is already open on the metadata tab, this is a no-op — clicking again
   * would toggle the panel closed.
   */
  async openMetadataPanel(): Promise<void> {
    // The icon rail button sets data-active="true" iff metadata tab is active AND panel is open.
    const isAlreadyOpen = (await this.metadataTabButton.getAttribute('data-active')) === 'true';
    if (!isAlreadyOpen) {
      await this.metadataTabButton.click();
    }
    await this.page.getByText('User metadata', { exact: true }).waitFor({ state: 'visible', timeout: 5000 });
  }

  async openOutputPanel(): Promise<void> {
    const initialText = await this.outputPanelCollapseButton.textContent();
    await this.outputPanelCollapseButton.click();

    if (initialText?.includes('Collapse Editor')) {
      await expect(this.outputPanelCollapseButton).toHaveText(/Expand Editor/);
    } else if (initialText?.includes('Expand Editor')) {
      await expect(this.outputPanelCollapseButton).toHaveText(/Collapse Editor/);
    }
  }

  async openWorkspaceContextMenu(): Promise<void> {
    await this.workspaceContextMenuButton.click();
    await this.workspaceHeaderMenu.waitFor({ state: 'attached' });
    await this.workspaceHeaderMenu.waitFor({ state: 'visible' });
    await expect(this.workspaceHeaderMenu.getByRole('button', { name: 'New File' })).toBeVisible();
    // This timeout seems to fix a race condition where the menu is mounted, but the CSS animation might be doing something to make it disappear prematurely
    // The effect is that the menu opens, but then flashes and disappears
    await this.page.waitForTimeout(1000);
  }

  async renameWorkspaceItem(oldName: string, newName: string, isFolder: boolean = false): Promise<void> {
    await this.openFileContextMenu(oldName);
    await this.workspaceFileContextMenu.getByRole('menuitem', { name: 'Rename' }).click();
    const renameInput = this.page.locator('#modal-container').getByLabel('New Name');
    await renameInput.clear();
    await renameInput.fill(newName);
    await renameInput.evaluate(e => e.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })));
    await renameInput.evaluate(e => e.dispatchEvent(new Event('change')));
    const waitForToastPromise = this.waitForToast(`Workspace ${isFolder ? 'Folder' : 'File'} Renamed Successfully`);
    await this.page.getByRole('button', { name: isFolder ? 'Rename Folder' : 'Rename File' }).click();
    await waitForToastPromise;
  }

  async saveSequence(): Promise<void> {
    await this.saveSequenceButton.click();
    await this.waitForToast('Workspace File Saved Successfully');
  }

  async searchForFile(name: string): Promise<void> {
    await this.searchInput.fill(name);
  }

  async searchForFileAndWait(name: string): Promise<void> {
    await this.searchInput.fill(name);
    // Wait for search results to update and file to be visible
    await this.getFileRow(name).waitFor({ state: 'visible', timeout: 5000 });
  }

  updatePage(page: Page): void {
    this.actionsTabButton = page.getByRole('button', { exact: true, name: 'Actions' });
    this.editSequenceButton = page.getByRole('button', { name: 'Edit Sequence' });
    // File input is detected as a button in Chrome for Testing (Playwright 1.57+)
    // Use locator chain: find by aria-label within the modal
    this.fileInput = page.locator('#modal-container input[type="file"][aria-label="File(s)"]');
    this.folderNameInput = page.locator('#modal-container').getByRole('textbox', { name: 'Folder Name' });
    this.metadataEditButton = page.getByRole('button', { name: 'Edit user metadata' });
    this.metadataCancelButton = page.locator('.user-metadata-editor + div').getByRole('button', { name: 'Cancel' });
    this.metadataPanel = page.locator('.user-metadata-editor').first();
    this.metadataSaveButton = page.locator('.user-metadata-editor + div').getByRole('button', { name: 'Save' });
    this.metadataTabButton = page.getByRole('button', { exact: true, name: 'Metadata' });
    this.navButtonSequences = page.locator('.nav-button:has-text("Sequences")');
    this.navButtonSequencesMenu = this.navButtonSequences.getByRole('menu');
    this.page = page;
    this.outputPanelCollapseButton = page.getByRole('button', { name: /Collapse Editor|Expand Editor/ });
    this.pageLoadingLocatorWithData = page.getByText('Loading workspace').first();
    this.readOnlyCheckbox = page.locator('#read-only');
    this.rightPanelCollapseButton = page.getByRole('button', { name: /Collapse panel|Expand panel/ }).last();
    this.saveSequenceButton = page.getByRole('button', { name: 'Save' });
    this.searchInput = page.getByPlaceholder('Search files and folders');
    this.sequenceEditor = page.locator('.cm-activeLine').first();
    this.sequenceEditorContent = page.locator('.cm-content').first();
    this.sequenceNameInput = page.locator('#modal-container').getByRole('textbox', { name: 'File Name' });
    this.textEditor = page.locator('.cm-activeLine').nth(2);
    this.userMetadataEditor = page.locator('.user-metadata-editor .cm-content').first();
    this.workspaceFileContextMenu = page.getByTestId('context-menu');
    this.workspaceFileGrid = page.getByRole('treegrid');
    this.workspaceHeaderMenu = page.getByTestId('workspace-header-menu');
    this.workspaceSidebar = page.locator('[data-slot="sidebar-wrapper"]').first();
    this.workspaceContextMenuButton = page.getByRole('button', { name: 'New Workspace Item' });
    this.workspaceRefreshButton = page.getByRole('button', { name: 'Refresh Workspace' });
    this.workspaceSettingsButton = page.getByRole('button', { name: 'Settings' });
    this.workspaceFileBrowserButton = page.getByRole('button', { name: 'Files' });
    this.workspaceCollaboratorInput = page.getByPlaceholder('Search collaborators or workspaces');
  }

  async uploadFile(filePath: string, fileName: string): Promise<void> {
    await this.openWorkspaceContextMenu();
    await this.workspaceHeaderMenu.getByRole('menuitem', { name: 'Upload File' }).click();
    await this.page.locator('#modal-container').getByRole('menuitem', { name: this.workspaceName }).click();

    const file = readFileSync(filePath);
    const fileBuffer = Buffer.from(file);

    const uploadButton = this.page.locator('#modal-container').getByRole('button', { exact: true, name: 'Upload' });

    await setFileInputByBuffer(this.page, this.fileInput, fileBuffer, 'application/json', fileName, uploadButton);

    await uploadButton.click();
    await this.waitForToast('Workspace File Uploaded Successfully');
  }

  async waitForToast(message: string): Promise<void> {
    await this.page.waitForSelector(`.toastify:has-text("${message}")`, { timeout: 10000 });
  }
}
