import { expect, Locator, Page } from '@playwright/test';
import { animals, colors, uniqueNamesGenerator } from 'unique-names-generator';

export class ModelsPage {
  readonly page: Page;

  readonly jarPath: string;
  readonly modelName: string;
  readonly modelVersion: string;

  readonly alertError: Locator;
  readonly confirmModal: Locator;
  readonly confirmModalDeleteButton: Locator;
  readonly createButton: Locator;
  readonly deleteButton: Locator;
  readonly inputFile: Locator;
  readonly inputName: Locator;
  readonly inputVersion: Locator;
  readonly modelTableRow: Locator;

  constructor(page: Page) {
    this.page = page;

    // TODO: Pull .jar file directly from built aerie project.
    this.jarPath = 'tests/data/banananation-develop.jar';
    this.modelName = uniqueNamesGenerator({ dictionaries: [colors, animals] });
    this.modelVersion = '0.0.0';

    this.alertError = page.locator('.alert-error');
    this.confirmModal = page.locator(`.modal:has-text("Delete Model")`);
    this.confirmModalDeleteButton = page.locator(`.modal button:has-text("Delete")`);
    this.createButton = page.locator('text=Create');
    this.deleteButton = page.locator(`tr:has-text("${this.modelName}") >> button[aria-label="Delete Model"]`);
    this.inputFile = page.locator('input[name="file"]');
    this.inputName = page.locator('input[name="name"]');
    this.inputVersion = page.locator('input[name="version"]');
    this.modelTableRow = page.locator(`tr:has-text("${this.modelName}")`);
  }

  async createModel() {
    await expect(this.modelTableRow).not.toBeVisible();
    await this.inputName.fill(this.modelName);
    await this.inputVersion.fill(this.modelVersion);
    await this.inputFile.setInputFiles(this.jarPath);
    await this.createButton.click();
    await expect(this.modelTableRow).toBeVisible();
  }

  async deleteModel() {
    await expect(this.modelTableRow).toBeVisible();
    await expect(this.deleteButton).not.toBeVisible();
    await this.modelTableRow.hover();
    await expect(this.deleteButton).toBeVisible();
    await expect(this.confirmModal).not.toBeVisible();
    await this.deleteButton.click();
    await expect(this.confirmModal).toBeVisible();
    await expect(this.confirmModalDeleteButton).toBeVisible();
    await this.confirmModalDeleteButton.click();
    await expect(this.modelTableRow).not.toBeVisible();
  }

  async fillInputFile() {
    await this.inputFile.setInputFiles(this.jarPath);
  }

  async fillInputName() {
    await this.inputName.fill(this.modelName);
  }

  async fillInputVersion() {
    await this.inputVersion.fill(this.modelVersion);
  }

  async goto() {
    await this.page.goto('/plans');
    await this.page.goto('/models');
  }
}
