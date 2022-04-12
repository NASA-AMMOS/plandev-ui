import { expect, Locator, Page } from '@playwright/test';
import { animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { getOptionValueFromText, getSelectedOption } from '../utilities/selectors';

export class PlansPage {
  readonly page: Page;

  readonly endTime: string;
  readonly planName: string;
  readonly startTime: string;

  readonly alertError: Locator;
  readonly confirmModal: Locator;
  readonly confirmModalDeleteButton: Locator;
  readonly createButton: Locator;
  readonly inputEndTime: Locator;
  readonly inputModel: Locator;
  readonly inputModelSelector: string = 'select[name="model"]';
  readonly inputName: Locator;
  readonly inputStartTime: Locator;
  readonly tableRow: Locator;
  readonly tableRowDeleteButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.endTime = '2022-006T00:00:00';
    this.planName = uniqueNamesGenerator({ dictionaries: [colors, animals] });
    this.startTime = '2022-001T00:00:00';

    this.alertError = page.locator('.alert-error');
    this.confirmModal = page.locator(`.modal:has-text("Delete Plan")`);
    this.confirmModalDeleteButton = page.locator(`.modal:has-text("Delete Plan") >> button:has-text("Delete")`);
    this.createButton = page.locator('text=Create');
    this.inputEndTime = page.locator('input[name="end-time"]');
    this.inputModel = page.locator(this.inputModelSelector);
    this.inputName = page.locator('input[name="name"]');
    this.inputStartTime = page.locator('input[name="start-time"]');
    this.tableRow = page.locator(`tr:has-text("${this.planName}")`);
    this.tableRowDeleteButton = page.locator(`tr:has-text("${this.planName}") >> button[aria-label="Delete Plan"]`);
  }

  async createPlan(modelName: string) {
    await expect(this.tableRow).not.toBeVisible();
    await this.selectInputModel(modelName);
    await this.fillInputName();
    await this.fillInputStartTime();
    await this.fillInputEndTime();
    await this.createButton.click();
    await this.tableRow.waitFor({ state: 'attached' });
    await expect(this.tableRow).toBeVisible();
  }

  async deletePlan() {
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

  async fillInputEndTime() {
    await this.inputEndTime.focus();
    await this.inputEndTime.fill(this.endTime);
    await this.inputEndTime.evaluate(e => e.blur());
  }

  async fillInputName() {
    await this.inputName.focus();
    await this.inputName.fill(this.planName);
    await this.inputName.evaluate(e => e.blur());
  }

  async fillInputStartTime() {
    await this.inputStartTime.focus();
    await this.inputStartTime.fill(this.startTime);
    await this.inputStartTime.evaluate(e => e.blur());
  }

  async goto() {
    await this.page.goto('/plans');
  }

  async selectInputModel(modelName: string) {
    const value = await getOptionValueFromText(this.page, this.inputModelSelector, modelName);
    await this.inputModel.focus();
    await this.inputModel.selectOption(value);
    await this.inputModel.evaluate(e => e.blur());
  }

  async selectedModel() {
    return await getSelectedOption(this.page, this.inputModelSelector);
  }
}
