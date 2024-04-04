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
    await expect(this.tableRow).toBeVisible();
    await expect(this.tableRowDeleteButton).not.toBeVisible();

    await this.tableRow.hover();
    await this.tableRowDeleteButton.waitFor({ state: 'attached' });
    await this.tableRowDeleteButton.waitFor({ state: 'visible' });
    await expect(this.tableRowDeleteButton).toBeVisible();

    await expect(this.confirmModal).not.toBeVisible();
    await this.tableRowDeleteButton.click();
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
    this.tableRow = page.locator(`.ag-row:has-text("${this.tagName}")`);
    this.tableRowDeleteButton = page.locator(`.ag-row:has-text("${this.tagName}") >> button[aria-label="Delete Tag"]`);
    this.tableRowTagId = page.locator(`.ag-row:has-text("${this.tagName}") > div >> nth=0`);
  }
}
