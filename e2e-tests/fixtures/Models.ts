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
  table: Locator;
  tableRow: (modelName?: string) => Locator;
  tableRowDeleteButton: (modelName?: string) => Locator;
  tableRowModelId: (modelName?: string) => Locator;

  constructor(public page: Page) {
    this.modelName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
    this.updatePage(page);
  }

  async createModel(baseURL: string | undefined, modelName = this.modelName) {
    await expect(this.tableRow(modelName)).not.toBeVisible();
    if (modelName) {
      await this.fillInputName(modelName);
    } else {
      await this.fillInputName();
    }
    await this.fillInputVersion();
    await this.fillInputFile();
    await this.createButton.click();
    const editModelUrlRegex = new RegExp(`${baseURL}/models/(?<modelId>\\d+)`);
    await this.page.waitForURL(editModelUrlRegex);
    const matches = this.page.url().match(editModelUrlRegex);

    expect(matches).not.toBeNull();

    if (matches) {
      const { groups: { modelId } = {} } = matches;
      this.modelId = modelId;
      expect(modelId).toBeDefined();
    }

    const modelStatusLocator = this.page.getByText('Jar file status Extracted');
    await modelStatusLocator.waitFor({ state: 'attached' });
    await modelStatusLocator.waitFor({ state: 'visible' });
  }

  async deleteModel(modelName: string = this.modelName) {
    await this.filterTable(modelName);
    await expect(this.tableRow(modelName)).toBeVisible();

    await this.tableRow(modelName).hover();
    await expect(this.tableRow(modelName).locator('.actions-cell')).toBeVisible();
    await this.tableRowDeleteButton(modelName).waitFor({ state: 'attached' });
    await this.tableRowDeleteButton(modelName).waitFor({ state: 'visible' });
    await expect(this.tableRowDeleteButton(modelName)).toBeVisible();

    await expect(this.confirmModal).not.toBeVisible();
    await this.tableRow(modelName).locator('.actions-cell').waitFor({ state: 'visible' });

    await this.tableRowDeleteButton(modelName).click({ position: { x: 2, y: 2 } });
    await this.confirmModal.waitFor({ state: 'attached' });
    await this.confirmModal.waitFor({ state: 'visible' });
    await expect(this.confirmModal).toBeVisible();

    await expect(this.confirmModalDeleteButton).toBeVisible();
    await this.confirmModalDeleteButton.click();
    await this.tableRow(modelName).waitFor({ state: 'detached' });
    await this.tableRow(modelName).waitFor({ state: 'hidden' });
    await expect(this.tableRow(modelName)).not.toBeVisible();
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

  async filterTable(modelName: string) {
    await this.table.waitFor({ state: 'attached' });
    await this.table.waitFor({ state: 'visible' });

    const nameColumnHeader = await this.table.getByRole('columnheader', { name: 'Name' });
    await nameColumnHeader.hover();

    const filterIcon = await nameColumnHeader.locator('.ag-icon-menu');
    await expect(filterIcon).toBeVisible();
    await filterIcon.click();
    await this.page.locator('.ag-popup').getByRole('textbox', { name: 'Filter Value' }).first().fill(modelName);
    await expect(this.table.getByRole('row', { name: modelName })).toBeVisible();
    await this.page.keyboard.press('Escape');
  }

  async goto() {
    await this.page.goto('/models', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(250);
  }

  updatePage(page: Page): void {
    this.alertError = page.locator('.alert-error');
    this.confirmModal = page.locator(`.modal:has-text("Delete Model")`);
    this.confirmModalDeleteButton = this.confirmModal.getByRole('button', { name: 'Delete' });
    this.createButton = page.getByRole('button', { name: 'Create' });
    this.creatingButton = page.getByRole('button', { name: 'Creating...' });
    this.createPlanButton = page.getByRole('button', { name: 'New plan with model' });
    this.inputFile = page.locator('input[name="file"]');
    this.inputName = page.locator('input[name="name"]');
    this.inputVersion = page.locator('input[name="version"]');
    this.page = page;
    this.table = page.getByRole('treegrid');
    this.tableRow = (modelName: string = this.modelName) => this.table.getByRole('row', { name: modelName });
    this.tableRowDeleteButton = (modelName: string = this.modelName) =>
      this.tableRow(modelName).getByRole('gridcell').getByRole('button', { name: 'Delete Model' });
    this.tableRowModelId = (modelName: string = this.modelName) =>
      this.tableRow(modelName).getByRole('gridcell').first();
  }
}
