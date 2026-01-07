import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { readFileSync } from 'fs';
import { getWorkspacesUrl } from '../../src/utilities/routes';
import { generateRandomName, hoverRowAndWaitForButton } from '../utilities/helpers';

export class Workspace {
  editSequenceButton: Locator;
  fileInput: Locator;
  folderNameInput: Locator;
  jsonPath: string = 'e2e-tests/data/ban00001.json';
  navButtonSequences: Locator;
  navButtonSequencesMenu: Locator;
  pageLoadingLocatorWithData: Locator;
  saveSequenceButton: Locator;
  searchInput: Locator;
  sequenceEditor: Locator;
  sequenceNameInput: Locator;
  textEditor: Locator;
  workspaceCollaboratorInput: Locator;
  workspaceContextMenuButton: Locator;
  workspaceFileContextMenu: Locator;
  workspaceFileGrid: Locator;
  workspaceHeaderMenu: Locator;
  workspaceSettingsButton: Locator;
  workspaceSidebar: Locator;

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

  async clickFile(name: string): Promise<void> {
    await this.workspaceFileGrid.getByRole('row', { name }).click();
  }

  async createFolder(folderPath?: string): Promise<string> {
    const path = folderPath || generateRandomName();

    await this.openWorkspaceContextMenu();
    const workspaceMenuItem = await this.workspaceHeaderMenu.getByRole('menuitem', { name: 'New Folder' });
    await workspaceMenuItem.waitFor({ state: 'visible' });
    await this.page.waitForTimeout(500); // Wait for dropdown menu animation to complete
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
    const seqPath = sequencePath || generateRandomName();
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
    const row = this.workspaceFileGrid.getByRole('row', { name: fileName });
    const deleteButton = row.getByRole('button', { name: 'Delete' });
    await hoverRowAndWaitForButton(this.page, row, deleteButton);
    await deleteButton.click();
    await this.page.locator('#modal-container').getByRole('button', { name: 'Delete' }).click();
    await this.waitForToast('Workspace File Deleted Successfully');
  }

  async deleteFolder(folderName: string): Promise<void> {
    const row = this.workspaceFileGrid.getByRole('row', { name: folderName });
    const deleteButton = row.getByRole('button', { name: 'Delete' });
    await hoverRowAndWaitForButton(this.page, row, deleteButton);
    await deleteButton.click();
    await this.page.locator('#modal-container').getByRole('button', { name: 'Delete' }).click();
    await this.waitForToast('Workspace Folder Deleted Successfully');
  }

  async deleteSequence(sequenceName: string): Promise<void> {
    const row = this.workspaceFileGrid.getByRole('row', { name: sequenceName });
    const deleteButton = row.getByRole('button', { name: 'Delete' });
    await hoverRowAndWaitForButton(this.page, row, deleteButton);
    await deleteButton.click();
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

    // Wait for file input to be ready instead of fixed timeout
    await this.fileInput.waitFor({ state: 'visible' });
    await this.fileInput.focus();
    await this.fileInput.setInputFiles({
      buffer: fileBuffer,
      mimeType: 'application/json',
      name: 'json',
    });
    await this.fileInput.evaluate(e => e.blur());

    // Wait for upload button to be enabled (not just visible) - file must be processed first
    const uploadButton = this.page.locator('#modal-container').getByRole('button', { exact: true, name: 'Upload' });
    await expect(uploadButton).toBeEnabled({ timeout: 10000 });
    await uploadButton.click();

    await this.waitForToast('Workspace File Uploaded Successfully');
  }

  async openFileContextMenu(fileName: string): Promise<void> {
    const row = this.workspaceFileGrid.getByRole('row', { name: fileName });
    const moreActionsButton = row.getByLabel('More actions');
    await hoverRowAndWaitForButton(this.page, row, moreActionsButton);
    await moreActionsButton.click();
    await this.workspaceFileContextMenu.waitFor({ state: 'visible' });
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
    this.editSequenceButton = page.getByRole('button', { name: 'Edit Sequence' });
    this.fileInput = page.getByRole('textbox', { name: 'File(s)' });
    this.folderNameInput = page.locator('#modal-container').getByRole('textbox', { name: 'Folder Name' });
    this.navButtonSequences = page.locator('.nav-button:has-text("Sequences")');
    this.navButtonSequencesMenu = this.navButtonSequences.getByRole('menu');
    this.page = page;
    this.pageLoadingLocatorWithData = page.getByRole('complementary').getByText('No workspace loaded').first();
    this.saveSequenceButton = page.getByRole('button', { name: 'Save' });
    this.searchInput = page.getByPlaceholder('Search files and folders');
    this.sequenceEditor = page.locator('.cm-activeLine').first();
    this.sequenceNameInput = page.locator('#modal-container').getByRole('textbox', { name: 'File Name' });
    this.textEditor = page.locator('.cm-activeLine').nth(2);
    this.workspaceFileContextMenu = page.getByTestId('context-menu');
    this.workspaceFileGrid = page.getByRole('treegrid');
    this.workspaceHeaderMenu = page.getByTestId('workspace-header-menu');
    this.workspaceSidebar = page.getByRole('complementary');
    this.workspaceContextMenuButton = this.workspaceSidebar
      .getByRole('button', {
        name: 'New Workspace Item',
      })
      .first();
    this.workspaceSettingsButton = page.getByRole('button', { name: 'Settings' });
    this.workspaceCollaboratorInput = page.getByPlaceholder('Search collaborators or workspaces');
  }

  async uploadFile(filePath: string, fileName: string): Promise<void> {
    await this.openWorkspaceContextMenu();
    await this.workspaceHeaderMenu.getByRole('menuitem', { name: 'Upload File' }).click();
    await this.page.locator('#modal-container').getByRole('menuitem', { name: this.workspaceName }).click();

    const file = readFileSync(filePath);
    const fileBuffer = Buffer.from(file);

    // Wait for file input to be ready instead of fixed timeout
    await this.fileInput.waitFor({ state: 'visible' });
    await this.fileInput.focus();
    await this.fileInput.setInputFiles({
      buffer: fileBuffer,
      mimeType: 'application/json',
      name: fileName,
    });
    await this.fileInput.evaluate(e => e.blur());

    // Wait for upload button to be enabled (not just visible) - file must be processed first
    const uploadButton = this.page.locator('#modal-container').getByRole('button', { exact: true, name: 'Upload' });
    await expect(uploadButton).toBeEnabled({ timeout: 10000 });
    await uploadButton.click();
    await this.waitForToast('Workspace File Uploaded Successfully');
  }

  async waitForToast(message: string): Promise<void> {
    await this.page.waitForSelector(`.toastify:has-text("${message}")`, { timeout: 10000 });
  }
}
