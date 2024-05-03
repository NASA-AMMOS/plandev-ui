import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';

export class Models {
  alertError: Locator;
  confirmModal: Locator;
  confirmModalDeleteButton: Locator;
  createButton: Locator;
  createPlanButton: Locator;
  creatingButton: Locator;
  inputFile: Locator;
  inputName: Locator;
  inputVersion: Locator;
  jarPath: string = 'e2e-tests/data/banananation-develop.jar'; // TODO: Pull .jar from aerie project.
  modelId: string;
  modelName: string;
  modelVersion: string = '1.0.0';
  tableRow: Locator;
  tableRowDeleteButton: Locator;
  tableRowModelId: Locator;

  constructor(public page: Page) {
    this.modelName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
    this.updatePage(page);
  }

  async createModel(modelName = '') {
    await expect(this.tableRow).not.toBeVisible();
    if (modelName) {
      await this.fillInputName(modelName);
    } else {
      await this.fillInputName();
    }
    await this.fillInputVersion();
    await this.fillInputFile();
    await this.createButton.click();
    await expect(this.page).toHaveURL(/.*\/models\/\d+/);
    await this.goto();
    await this.tableRow.waitFor({ state: 'attached' });
    await this.tableRow.waitFor({ state: 'visible' });
    await expect(this.tableRow).toBeVisible();
    await expect(this.tableRowModelId).toBeVisible();
    const el = await this.tableRowModelId.elementHandle();
    if (el) {
      this.modelId = (await el.textContent()) as string;
    }
  }

  async deleteModel() {
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

  async fillInputFile(jarPath: string = this.jarPath) {
    await this.inputFile.focus();
    await this.inputFile.setInputFiles(jarPath);
    await this.inputFile.evaluate(e => e.blur());
  }

  async fillInputName(modelName: string = this.modelName) {
    await this.inputName.focus();
    await this.inputName.fill(modelName);
    await this.inputName.evaluate(e => e.blur());
  }

  async fillInputVersion(modelVersion: string = this.modelVersion) {
    await this.inputVersion.focus();
    await this.inputVersion.fill(modelVersion);
    await this.inputVersion.evaluate(e => e.blur());
  }

  async goto() {
    await this.page.goto('/models', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(250);
  }

  updatePage(page: Page): void {
    this.alertError = page.locator('.alert-error');
    this.confirmModal = page.locator(`.modal:has-text("Delete Model")`);
    this.confirmModalDeleteButton = page.locator(`.modal:has-text("Delete Model") >> button:has-text("Delete")`);
    this.createButton = page.getByRole('button', { name: 'Create' });
    this.creatingButton = page.getByRole('button', { name: 'Creating...' });
    this.createPlanButton = page.getByRole('button', { name: 'New plan with model' });
    this.inputFile = page.locator('input[name="file"]');
    this.inputName = page.locator('input[name="name"]');
    this.inputVersion = page.locator('input[name="version"]');
    this.page = page;
    this.tableRow = page.locator(`.ag-row:has-text("${this.modelName}")`);
    this.tableRowDeleteButton = page.locator(
      `.ag-row:has-text("${this.modelName}") >> button[aria-label="Delete Model"]`,
    );
    this.tableRowModelId = page.locator(`.ag-row:has-text("${this.modelName}") > div >> nth=0`);
  }
}
