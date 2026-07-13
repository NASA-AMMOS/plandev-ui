import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Page Object Model for the workspace save-conflict modal (`WorkspaceSaveConflictModal`),
 * shown when a save is rejected by the optimistic-concurrency check (`412`). Covers both
 * the "conflict" variant (the file changed underneath) and the "deleted" variant (the file
 * was deleted/moved underneath). Selectors are scoped to the modal root.
 */
export class WorkspaceSaveConflict {
  cancelButton!: Locator;
  conflictTitle!: Locator;
  deletedTitle!: Locator;
  discardButton!: Locator;
  mineHeader!: Locator;
  modal!: Locator;
  recreateButton!: Locator;
  takeMineButton!: Locator;
  takeTheirsButton!: Locator;
  theirsHeader!: Locator;

  constructor(public page: Page) {
    this.updatePage(page);
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await expect(this.modal).toBeHidden();
  }

  async discardAndClose(): Promise<void> {
    await this.discardButton.click();
    await expect(this.modal).toBeHidden();
  }

  async recreate(): Promise<void> {
    await this.recreateButton.click();
    await expect(this.modal).toBeHidden();
  }

  async takeMine(): Promise<void> {
    await this.takeMineButton.click();
    await expect(this.modal).toBeHidden();
  }

  async takeTheirs(): Promise<void> {
    await this.takeTheirsButton.click();
    await expect(this.modal).toBeHidden();
  }

  updatePage(page: Page): void {
    this.page = page;
    this.modal = page.locator('#modal-container');
    this.conflictTitle = this.modal.getByText('This file was changed by someone else');
    this.deletedTitle = this.modal.getByText('File deleted or moved');
    this.theirsHeader = this.modal.getByText('Theirs (server)');
    this.mineHeader = this.modal.getByText('Mine (your edits)');
    this.takeTheirsButton = this.modal.getByRole('button', { name: 'Keep theirs' });
    this.takeMineButton = this.modal.getByRole('button', { name: 'Keep mine' });
    this.cancelButton = this.modal.getByRole('button', { name: 'Keep editing' });
    this.recreateButton = this.modal.getByRole('button', { name: 'Recreate file' });
    this.discardButton = this.modal.getByRole('button', { name: 'Discard & close' });
  }

  /** Wait for the "conflict" variant (read-only diff of theirs vs mine). */
  async waitForConflict(): Promise<void> {
    await expect(this.conflictTitle).toBeVisible({ timeout: 15000 });
    await expect(this.theirsHeader).toBeVisible();
    await expect(this.mineHeader).toBeVisible();
  }

  /** Wait for the "deleted/moved" variant (single read-only pane of mine). */
  async waitForDeleted(): Promise<void> {
    await expect(this.deletedTitle).toBeVisible({ timeout: 15000 });
  }
}
