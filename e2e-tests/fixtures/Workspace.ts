import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';

import { readFileSync } from 'fs';
import { getWorkspacesUrl } from '../../src/utilities/routes';

export class Workspace {
  editSequenceButton: Locator;
  fileInput: Locator;
  folderNameInput: Locator;
  jsonPath: string = 'e2e-tests/data/ban00001.json';
  navButtonSequences: Locator;
  navButtonSequencesMenu: Locator;
  pageLoadingLocatorWithData: Locator;
  saveSequenceButton: Locator;
  sequenceEditor: Locator;
  sequenceNameInput: Locator;
  textEditor: Locator;
  workspaceContextMenu: Locator;
  workspaceContextMenuButton: Locator;
  workspaceSidebar: Locator;

  constructor(
    public page: Page,
    public workspaceId: string,
    public workspaceName: string,
    public baseURL: string = '',
  ) {
    this.updatePage(page);
  }

  async createFolder(folderPath?: string): Promise<string> {
    const path = folderPath || uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });

    await this.openWorkspaceContextMenu();
    await this.workspaceContextMenu.getByRole('menuitem', { name: 'New Folder' }).click();
    await this.page.locator('#modal-container').getByRole('menuitem', { name: this.workspaceName }).click();
    await this.fillFolderPath(path);
    await this.page.getByRole('button', { name: 'Confirm' }).click();

    await this.waitForToast('Workspace Folder Created Successfully');

    return path;
  }

  async createSequence(
    sequencePath?: string,
    sequenceFileName?: string,
  ): Promise<{ sequenceName: string; sequencePath: string }> {
    const seqPath = sequencePath || uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
    const seqName = sequenceFileName || `${uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] })}.seq`;

    await this.openWorkspaceContextMenu();
    await this.workspaceContextMenu.getByRole('menuitem', { name: 'New File' }).click();
    await this.page.locator('#modal-container').getByRole('menuitem', { name: this.workspaceName }).click();

    await this.fillSequenceName(seqName, seqPath);
    await this.page.getByRole('button', { name: 'Confirm' }).click();

    await this.waitForToast('Workspace File Created Successfully');

    return { sequenceName: seqName, sequencePath: seqPath };
  }

  async deleteSequence(sequenceName: string): Promise<void> {
    await this.page.getByRole('menuitem', { name: sequenceName }).click({ button: 'right' });
    await this.page.getByRole('menuitem', { name: 'Delete' }).click();
    await this.page.getByRole('button', { name: 'Delete' }).click();

    await this.waitForToast('Workspace File Deleted Successfully');
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
    await this.workspaceContextMenu.getByRole('menuitem', { name: 'Upload File' }).click();
    await this.page.locator('#modal-container').getByRole('menuitem', { name: this.workspaceName }).click();

    const file = readFileSync(filePath);
    const fileBuffer = Buffer.from(file);

    await this.page.waitForTimeout(1000);
    await this.fileInput.focus();
    await this.fileInput.setInputFiles({
      buffer: fileBuffer,
      mimeType: 'application/json',
      name: 'json',
    });
    await this.fileInput.evaluate(e => e.blur());

    await this.page.getByRole('button', { name: 'Upload' }).click();

    await this.waitForToast('Workspace File Uploaded Successfully');
  }

  async openWorkspaceContextMenu(): Promise<void> {
    await this.workspaceContextMenuButton.click();
    await this.workspaceContextMenu.waitFor({ state: 'attached' });
    await this.workspaceContextMenu.waitFor({ state: 'visible' });
  }

  async saveSequence(): Promise<void> {
    await this.saveSequenceButton.click();
    await this.waitForToast('Workspace File Saved Successfully');
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
    this.sequenceEditor = page.locator('.cm-activeLine').first();
    this.sequenceNameInput = page.locator('#modal-container').getByRole('textbox', { name: 'File Name' });
    this.textEditor = page.locator('.cm-activeLine').nth(2);
    this.workspaceContextMenu = page.getByRole('menu');
    this.workspaceSidebar = page.getByRole('complementary');
    this.workspaceContextMenuButton = this.workspaceSidebar
      .getByRole('button', {
        name: 'New Workspace Item',
      })
      .first();
  }

  async waitForToast(message: string): Promise<void> {
    await this.page.waitForSelector(`.toastify:has-text("${message}")`, { timeout: 10000 });
  }
}
