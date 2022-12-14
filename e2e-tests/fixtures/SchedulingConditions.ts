import { expect, type Locator, type Page } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { getOptionValueFromText } from '../utilities/selectors.js';
import { Models } from './Models.js';

export class SchedulingConditions {
  closeButton: Locator;
  conditionDefinition: string = `export default (): GlobalSchedulingCondition => GlobalSchedulingCondition.scheduleActivitiesOnlyWhen(Real.Resource("/plant").lessThan(10.0))`;
  conditionDescription: string = 'Only add activities when the plant resource is less than 10';
  conditionName: string;
  confirmModal: Locator;
  confirmModalDeleteButton: Locator;
  inputConditionDefinition: Locator;
  inputConditionDescription: Locator;
  inputConditionModel: Locator;
  inputConditionModelSelector: string = 'select[name="model"]';
  inputConditionName: Locator;
  newButton: Locator;
  saveButton: Locator;
  tableRow: Locator;
  tableRowDeleteButton: Locator;

  constructor(public page: Page, public models: Models) {
    this.conditionName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
    this.updatePage(page);
  }

  async createSchedulingCondition(baseURL: string | undefined) {
    await expect(this.saveButton).toBeDisabled();
    await this.selectModel();
    await this.fillConditionName();
    await this.fillConditionDescription();
    await this.fillConditionDefinition();
    await expect(this.saveButton).not.toBeDisabled();
    await this.saveButton.click();
    await this.page.waitForURL(`${baseURL}/scheduling/conditions/edit/*`);
    await expect(this.saveButton).not.toBeDisabled();
    await expect(this.closeButton).not.toBeDisabled();
    await this.closeButton.click();
    await this.page.waitForURL(`${baseURL}/scheduling`);
  }

  async deleteSchedulingCondition() {
    await this.goto();
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

  async fillConditionDefinition() {
    await this.inputConditionDefinition.focus();
    await this.inputConditionDefinition.fill(this.conditionDefinition);
    await this.inputConditionDefinition.evaluate(e => e.blur());
  }

  async fillConditionDescription() {
    await this.inputConditionDescription.focus();
    await this.inputConditionDescription.fill(this.conditionDescription);
    await this.inputConditionDescription.evaluate(e => e.blur());
  }

  async fillConditionName() {
    await this.inputConditionName.focus();
    await this.inputConditionName.fill(this.conditionName);
    await this.inputConditionName.evaluate(e => e.blur());
  }

  async goto() {
    await this.page.goto('/scheduling/conditions', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(250);
    await this.page.waitForSelector(`input[placeholder="Filter conditions"]`, { state: 'attached' });
  }

  async selectModel() {
    await this.page.waitForSelector(`option:has-text("${this.models.modelName}")`, { state: 'attached' });
    const value = await getOptionValueFromText(this.page, this.inputConditionModelSelector, this.models.modelName);
    await this.inputConditionModel.focus();
    await this.inputConditionModel.selectOption(value);
    await this.inputConditionModel.evaluate(e => e.blur());
  }

  updatePage(page: Page): void {
    this.closeButton = page.locator(`button:has-text("Close")`);
    this.confirmModal = page.locator(`.modal:has-text("Delete Scheduling Condition")`);
    this.confirmModalDeleteButton = page.locator(
      `.modal:has-text("Delete Scheduling Condition") >> button:has-text("Delete")`,
    );
    this.inputConditionDefinition = page.locator('.monaco-editor >> textarea.inputarea');
    this.inputConditionDescription = page.locator('textarea[name="condition-description"]');
    this.inputConditionModel = page.locator(this.inputConditionModelSelector);
    this.inputConditionName = page.locator(`input[name="condition-name"]`);
    this.newButton = page.locator(`button:has-text("New")`);
    this.page = page;
    this.saveButton = page.locator(`button:has-text("Save")`);
    this.tableRow = page.locator(`.ag-row:has-text("${this.conditionName}")`);
    this.tableRowDeleteButton = page.locator(
      `.ag-row:has-text("${this.conditionName}") >> button[aria-label="Delete Condition"]`,
    );
  }
}
