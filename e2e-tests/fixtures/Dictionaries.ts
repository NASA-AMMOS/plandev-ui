import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';

export class Dictionaries {
  confirmModal: Locator;
  confirmModalDeleteButton: Locator;
  createButton: Locator;
  dictionaryBuffer: Buffer;
  dictionaryName: string;
  dictionaryPath: string = 'e2e-tests/data/command-dictionary.xml';
  inputFile: Locator;
  tableRow: Locator;
  tableRowDeleteButton: Locator;

  constructor(public page: Page) {
    this.dictionaryName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });

    const dictionaryFile = readFileSync(this.dictionaryPath);
    const dictionaryXml = dictionaryFile.toString().replace(/GENERIC/, this.dictionaryName);
    this.dictionaryBuffer = Buffer.from(dictionaryXml);

    this.updatePage(page);
  }

  async createDictionary() {
    await expect(this.tableRow).not.toBeVisible();
    await this.fillInputFile();
    await this.createButton.click();
    await this.tableRow.waitFor({ state: 'attached' });
    await this.tableRow.waitFor({ state: 'visible' });
    await expect(this.tableRow).toBeVisible();
  }

  /**
   * @note Automatically cascade deletes any dependent expansion rules and expansion sets.
   */
  async deleteDictionary() {
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

  async fillInputFile() {
    await this.inputFile.focus();
    await this.inputFile.setInputFiles({
      buffer: this.dictionaryBuffer,
      mimeType: 'application/xml',
      name: this.dictionaryName,
    });
    await this.inputFile.evaluate(e => e.blur());
  }

  async goto() {
    await this.page.goto('/plans', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(3000); // Wait for page load to finish.
    await this.page.goto('/dictionaries', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(3000); // Wait for page load to finish.
  }

  updatePage(page: Page): void {
    this.confirmModal = page.locator(`.modal:has-text("Delete Command Dictionary")`);
    this.confirmModalDeleteButton = page.locator(
      `.modal:has-text("Delete Command Dictionary") >> button:has-text("Delete")`,
    );
    this.createButton = page.locator(`button:has-text("Create")`);
    this.inputFile = page.locator('input[name="file"]');
    this.page = page;
    this.tableRow = page.locator(`.ag-row:has-text("${this.dictionaryName}")`);
    this.tableRowDeleteButton = page.locator(
      `.ag-row:has-text("${this.dictionaryName}") >> button[aria-label="Delete Command Dictionary"]`,
    );
  }
}
