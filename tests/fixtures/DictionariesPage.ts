import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { animals, colors, uniqueNamesGenerator } from 'unique-names-generator';

export class DictionariesPage {
  readonly page: Page;

  readonly dictionaryBuffer: Buffer;
  readonly dictionaryName: string;
  readonly dictionaryPath: string;

  readonly confirmModal: Locator;
  readonly confirmModalDeleteButton: Locator;
  readonly createButton: Locator;
  readonly inputFile: Locator;
  readonly tableRow: Locator;
  readonly tableRowDeleteButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.dictionaryName = uniqueNamesGenerator({ dictionaries: [colors, animals] });
    this.dictionaryPath = 'tests/data/command-dictionary.xml';

    const dictionaryFile = readFileSync(this.dictionaryPath);
    const dictionaryXml = dictionaryFile.toString().replace(/GENERIC/, this.dictionaryName);
    this.dictionaryBuffer = Buffer.from(dictionaryXml);

    this.confirmModal = page.locator(`.modal:has-text("Delete Dictionary")`);
    this.confirmModalDeleteButton = page.locator(`.modal:has-text("Delete Dictionary") >> button:has-text("Delete")`);
    this.createButton = page.locator('text=Create');
    this.inputFile = page.locator('input[name="file"]');
    this.tableRow = page.locator(`tr:has-text("${this.dictionaryName}")`);
    this.tableRowDeleteButton = page.locator(
      `tr:has-text("${this.dictionaryName}") >> button[aria-label="Delete Dictionary"]`,
    );
  }

  async creatDictionary() {
    await expect(this.tableRow).not.toBeVisible();
    await this.fillInputFile();
    await this.createButton.click();
    await this.tableRow.waitFor({ state: 'attached' });
    await expect(this.tableRow).toBeVisible();
  }

  async deleteDictionary() {
    await expect(this.tableRow).toBeVisible();
    await expect(this.tableRowDeleteButton).not.toBeVisible();

    await this.tableRow.hover();
    await this.tableRowDeleteButton.waitFor({ state: 'visible' });
    await expect(this.tableRowDeleteButton).toBeVisible();

    await expect(this.confirmModal).not.toBeVisible();
    await this.tableRowDeleteButton.click();
    await this.confirmModal.waitFor({ state: 'attached' });
    await expect(this.confirmModal).toBeVisible();

    await expect(this.confirmModalDeleteButton).toBeVisible();
    await this.confirmModalDeleteButton.click();
    await this.tableRow.waitFor({ state: 'detached' });
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
    await this.page.goto('/plans');
    await this.page.goto('/dictionaries', { waitUntil: 'networkidle' });
  }
}
