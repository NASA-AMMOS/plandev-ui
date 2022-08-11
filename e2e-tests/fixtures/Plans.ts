import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { getOptionValueFromText, getSelectedOption } from '../utilities/selectors.js';
import { Models } from './Models.js';

export class Plans {
  alertError: Locator;
  confirmModal: Locator;
  confirmModalDeleteButton: Locator;
  createButton: Locator;
  durationDisplay: Locator;
  endTime: string = '2022-006T00:00:00';
  inputEndTime: Locator;
  inputModel: Locator;
  inputModelSelector: string = 'select[name="model"]';
  inputName: Locator;
  inputStartTime: Locator;
  planId: string;
  planName: string;
  startTime: string = '2022-001T00:00:00';
  tableRow: Locator;
  tableRowDeleteButton: Locator;
  tableRowPlanId: Locator;

  constructor(public page: Page, public models: Models) {
    this.planName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
    this.updatePage(page);
  }

  async createPlan() {
    await expect(this.tableRow).not.toBeVisible();
    await this.selectInputModel();
    await this.fillInputName();
    await this.fillInputStartTime();
    await this.fillInputEndTime();
    await this.createButton.click();
    await this.tableRow.waitFor({ state: 'attached' });
    await expect(this.tableRow).toBeVisible();
    await expect(this.tableRowPlanId).toBeVisible();
    const el = await this.tableRowPlanId.elementHandle();
    if (el) {
      this.planId = (await el.textContent()) as string;
    }
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
    await this.inputEndTime.evaluate(e => e.dispatchEvent(new Event('change')));
    await this.inputEndTime.evaluate(e => e.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })));
  }

  async fillInputName() {
    await this.inputName.focus();
    await this.inputName.fill(this.planName);
    await this.inputName.evaluate(e => e.blur());
  }

  async fillInputStartTime() {
    await this.inputStartTime.focus();
    await this.inputStartTime.fill(this.startTime);
    await this.inputStartTime.evaluate(e => e.dispatchEvent(new Event('change')));
    await this.inputStartTime.evaluate(e => e.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })));
  }

  async goto() {
    await this.page.goto('/plans', { waitUntil: 'networkidle' });
  }

  async selectInputModel() {
    const value = await getOptionValueFromText(this.page, this.inputModelSelector, this.models.modelName);
    await this.inputModel.focus();
    await this.inputModel.selectOption(value);
    await this.inputModel.evaluate(e => e.blur());
  }

  async selectedModel() {
    return await getSelectedOption(this.page, this.inputModelSelector);
  }

  updatePage(page: Page): void {
    this.alertError = page.locator('.alert-error');
    this.confirmModal = page.locator(`.modal:has-text("Delete Plan")`);
    this.confirmModalDeleteButton = page.locator(`.modal:has-text("Delete Plan") >> button:has-text("Delete")`);
    this.createButton = page.locator('text=Create');
    this.durationDisplay = page.locator('input[name="duration"]');
    this.inputEndTime = page.locator('input[name="end-time"]');
    this.inputModel = page.locator(this.inputModelSelector);
    this.inputName = page.locator('input[name="name"]');
    this.inputStartTime = page.locator('input[name="start-time"]');
    this.page = page;
    this.tableRow = page.locator(`.ag-row:has-text("${this.planName}")`);
    this.tableRowDeleteButton = page.locator(
      `.ag-row:has-text("${this.planName}") >> button[aria-label="Delete Plan"]`,
    );
    this.tableRowPlanId = page.locator(`.ag-row:has-text("${this.planName}") > div >> nth=1`);
  }
}
