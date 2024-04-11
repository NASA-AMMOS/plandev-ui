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
  tableRow: (planName: string) => Locator;
  tableRowDeleteButton: (planName: string) => Locator;
  tableRowPlanId: (planName: string) => Locator;

  constructor(
    public page: Page,
    public models: Models,
  ) {
    this.planName = this.createPlanName();
    this.updatePage(page);
  }

  async createPlan(planName = this.planName) {
    await expect(this.tableRow(planName)).not.toBeVisible();
    await this.selectInputModel();
    await this.fillInputName(planName);
    await this.fillInputStartTime();
    await this.fillInputEndTime();
    await this.createButton.click();
    await this.tableRow(planName).waitFor({ state: 'attached' });
    await this.tableRow(planName).waitFor({ state: 'visible' });
    const planId = await this.getPlanId(planName);
    this.planId = planId;
    return planId;
  }

  createPlanName() {
    return uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  }

  async deletePlan(planName: string = this.planName) {
    await expect(this.tableRow(planName)).toBeVisible();
    await expect(this.tableRowDeleteButton(planName)).not.toBeVisible();

    await this.tableRow(planName).hover();
    await this.tableRowDeleteButton(planName).waitFor({ state: 'attached' });
    await this.tableRowDeleteButton(planName).waitFor({ state: 'visible' });
    await expect(this.tableRowDeleteButton(planName)).toBeVisible();

    await expect(this.confirmModal).not.toBeVisible();
    await this.tableRowDeleteButton(planName).click();
    await this.confirmModal.waitFor({ state: 'attached' });
    await this.confirmModal.waitFor({ state: 'visible' });
    await expect(this.confirmModal).toBeVisible();

    await expect(this.confirmModalDeleteButton).toBeVisible();
    await this.confirmModalDeleteButton.click();
    await this.tableRow(planName).waitFor({ state: 'detached' });
    await this.tableRow(planName).waitFor({ state: 'hidden' });
    await expect(this.tableRow(planName)).not.toBeVisible();
  }

  async fillInputEndTime() {
    await this.inputEndTime.focus();
    await this.inputEndTime.fill(this.endTime);
    await this.inputEndTime.evaluate(e => e.dispatchEvent(new Event('change')));
    await this.inputEndTime.evaluate(e => e.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })));
  }

  async fillInputName(planName = this.planName) {
    await this.inputName.focus();
    await this.inputName.fill(planName);
    await this.inputName.evaluate(e => e.blur());
  }

  async fillInputStartTime() {
    await this.inputStartTime.focus();
    await this.inputStartTime.fill(this.startTime);
    await this.inputStartTime.evaluate(e => e.dispatchEvent(new Event('change')));
    await this.inputStartTime.evaluate(e => e.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })));
  }

  async getPlanId(planName = this.planName) {
    await expect(this.tableRow(planName)).toBeVisible();
    await expect(this.tableRowPlanId(planName)).toBeVisible();
    const el = await this.tableRowPlanId(planName).elementHandle();
    if (el) {
      return (await el.textContent()) as string;
    }
    return '';
  }

  async goto() {
    await this.page.goto('/plans', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(250);
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
    this.createButton = page.getByRole('button', { name: 'Create' });
    this.durationDisplay = page.locator('input[name="duration"]');
    this.inputEndTime = page.locator('input[name="end-time"]');
    this.inputModel = page.locator(this.inputModelSelector);
    this.inputName = page.locator('input[name="name"]');
    this.inputStartTime = page.locator('input[name="start-time"]');
    this.page = page;
    this.tableRow = (planName: string) => page.locator(`.ag-row:has-text("${planName}")`);
    this.tableRowDeleteButton = (planName: string) =>
      page.locator(`.ag-row:has-text("${planName}") >> button[aria-label="Delete Plan"]`);
    this.tableRowPlanId = (planName: string) => page.locator(`.ag-row:has-text("${planName}") > div >> nth=0`);
  }
}
