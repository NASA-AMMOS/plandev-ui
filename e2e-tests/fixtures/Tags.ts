import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';

export class Tags {
  alertError: Locator;
  confirmModal: Locator;
  confirmModalDeleteButton: Locator;
  createButton: Locator;
  inputColor: Locator;
  inputName: Locator;
  table: Locator;
  tableRow: Locator;
  tableRowDeleteButton: Locator;
  tableRowTagId: Locator;
  tagId: string;
  tagName: string;

  constructor(public page: Page) {
    this.tagName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
    this.updatePage(page);
  }

  async createTag() {
    await expect(this.tableRow).not.toBeVisible();
    await this.fillInputName();
    await this.fillInputColor();
    await this.createButton.click();
    await this.tableRow.waitFor({ state: 'attached' });
    await this.tableRow.waitFor({ state: 'visible' });
    await expect(this.tableRow).toBeVisible();
    await expect(this.tableRowTagId).toBeVisible();
    const el = await this.tableRowTagId.elementHandle();
    if (el) {
      this.tagId = (await el.textContent()) as string;
    }
  }

  async deleteTag() {
    await this.filterTable(this.tagName);
    await expect(this.tableRow).toBeVisible();

    await this.tableRow.hover();
    await expect(this.tableRow.locator('.actions-cell')).toBeVisible();
    await this.tableRowDeleteButton.waitFor({ state: 'attached' });
    await this.tableRowDeleteButton.waitFor({ state: 'visible' });
    await expect(this.tableRowDeleteButton).toBeVisible();

    await expect(this.confirmModal).not.toBeVisible();
    await this.tableRowDeleteButton.click({ position: { x: 2, y: 2 } });
    await this.confirmModal.waitFor({ state: 'attached' });
    await this.confirmModal.waitFor({ state: 'visible' });
    await expect(this.confirmModal).toBeVisible();

    await expect(this.confirmModalDeleteButton).toBeVisible();
    await this.confirmModalDeleteButton.click();
    await this.tableRow.waitFor({ state: 'detached' });
    await this.tableRow.waitFor({ state: 'hidden' });
    await expect(this.tableRow).not.toBeVisible();
  }

  async fillInputColor() {
    await this.inputColor.focus();
    await this.inputColor.fill('#0000ff');
    await this.inputColor.blur();
  }

  async fillInputName() {
    await this.inputName.focus();
    await this.inputName.fill(this.tagName);
    await this.inputName.blur();
  }

  private async filterTable(tagName: string) {
    await this.table.waitFor({ state: 'attached' });
    await this.table.waitFor({ state: 'visible' });

    await this.page.getByPlaceholder('Filter tags').fill(tagName);
    await expect(this.table.getByRole('row', { name: tagName })).toBeVisible();
  }

  async goto() {
    await this.page.goto('/tags', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(250);
  }

  updatePage(page: Page): void {
    this.alertError = page.locator('.alert-error');
    this.confirmModal = page.locator(`.modal:has-text("Delete Tag")`);
    this.confirmModalDeleteButton = this.confirmModal.getByRole('button', { name: 'Delete' });
    this.createButton = page.getByRole('button', { name: 'Create' });
    this.inputName = page.locator('input[name="name"]');
    this.inputColor = page.locator('input[name="color"]');
    this.page = page;
    this.table = page.getByRole('treegrid');
    this.tableRow = this.table.getByRole('row', { name: this.tagName });
    this.tableRowDeleteButton = this.tableRow.getByRole('gridcell').getByRole('button', { name: 'Delete Tag' });
    this.tableRowTagId = this.tableRow.getByRole('gridcell').first();
  }
}
