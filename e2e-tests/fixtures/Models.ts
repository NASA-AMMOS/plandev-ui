import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';

export class Models {
  alertError: Locator;
  confirmModal: Locator;
  confirmModalDeleteButton: Locator;
  createButton: Locator;
  inputFile: Locator;
  inputName: Locator;
  inputVersion: Locator;
  jarPath: string = 'e2e-tests/data/banananation-develop.jar'; // TODO: Pull .jar from aerie project.
  modelName: string;
  modelVersion: string = '1.0.0';
  tableRow: Locator;
  tableRowDeleteButton: Locator;

  constructor(public page: Page) {
    this.modelName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
    this.updatePage(page);
  }

  async createModel() {
    await expect(this.tableRow).not.toBeVisible();
    await this.fillInputName();
    await this.fillInputVersion();
    await this.fillInputFile();
    await this.createButton.click();
    await this.tableRow.waitFor({ state: 'attached' });
    await expect(this.tableRow).toBeVisible();
  }

  async deleteModel() {
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
    await this.inputFile.setInputFiles(this.jarPath);
    await this.inputFile.evaluate(e => e.blur());
  }

  async fillInputName() {
    await this.inputName.focus();
    await this.inputName.fill(this.modelName);
    await this.inputName.evaluate(e => e.blur());
  }

  async fillInputVersion() {
    await this.inputVersion.focus();
    await this.inputVersion.fill(this.modelVersion);
    await this.inputVersion.evaluate(e => e.blur());
  }

  async goto() {
    await this.page.goto('/plans');
    await this.page.goto('/models', { waitUntil: 'networkidle' });
  }

  updatePage(page: Page): void {
    this.alertError = page.locator('.alert-error');
    this.confirmModal = page.locator(`.modal:has-text("Delete Model")`);
    this.confirmModalDeleteButton = page.locator(`.modal:has-text("Delete Model") >> button:has-text("Delete")`);
    this.createButton = page.locator('text=Create');
    this.inputFile = page.locator('input[name="file"]');
    this.inputName = page.locator('input[name="name"]');
    this.inputVersion = page.locator('input[name="version"]');
    this.page = page;
    this.tableRow = page.locator(`.ag-row:has-text("${this.modelName}")`);
    this.tableRowDeleteButton = page.locator(
      `.ag-row:has-text("${this.modelName}") >> button[aria-label="Delete Model"]`,
    );
  }
}
