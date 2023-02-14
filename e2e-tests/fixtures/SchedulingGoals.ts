import { expect, type Locator, type Page } from '@playwright/test';
import { getOptionValueFromText } from '../utilities/selectors.js';
import { Models } from './Models.js';

export class SchedulingGoals {
  closeButton: Locator;
  confirmModal: Locator;
  confirmModalDeleteButton: Locator;
  goalDefinition: string = `export default (): Goal => Goal.ActivityRecurrenceGoal({ activityTemplate: ActivityTemplates.BakeBananaBread({ temperature: 325.0, tbSugar: 2, glutenFree: false }), interval: Temporal.Duration.from({ hours: 12 }) })`;
  goalDescription: string = 'Add a BakeBananaBread activity every 12 hours';
  inputGoalDefinition: Locator;
  inputGoalDescription: Locator;
  inputGoalModel: Locator;
  inputGoalModelSelector: string = 'select[name="model"]';
  inputGoalName: Locator;
  newButton: Locator;
  saveButton: Locator;
  tableRowDeleteButtonSelector: (goalName: string) => Locator;
  tableRowSelector: (goalName: string) => Locator;

  constructor(public page: Page, public models: Models) {
    this.updatePage(page);
  }

  async createSchedulingGoal(baseURL: string | undefined, goalName: string) {
    await expect(this.saveButton).toBeDisabled();
    await this.selectModel();
    await this.fillGoalName(goalName);
    await this.fillGoalDescription();
    await this.fillGoalDefinition();
    await expect(this.saveButton).not.toBeDisabled();
    await this.saveButton.click();
    await this.page.waitForURL(`${baseURL}/scheduling/goals/edit/*`);
    await expect(this.saveButton).not.toBeDisabled();
    await expect(this.closeButton).not.toBeDisabled();
    await this.closeButton.click();
    await this.page.waitForURL(`${baseURL}/scheduling`);
  }

  async deleteSchedulingGoal(goalName: string) {
    await this.goto();
    await expect(this.tableRowSelector(goalName)).toBeVisible();
    await expect(this.tableRowDeleteButtonSelector(goalName)).not.toBeVisible();

    await this.tableRowSelector(goalName).hover();
    await this.tableRowDeleteButtonSelector(goalName).waitFor({ state: 'attached' });
    await this.tableRowDeleteButtonSelector(goalName).waitFor({ state: 'visible' });
    await expect(this.tableRowDeleteButtonSelector(goalName)).toBeVisible();

    await expect(this.confirmModal).not.toBeVisible();
    await this.tableRowDeleteButtonSelector(goalName).click();
    await this.confirmModal.waitFor({ state: 'attached' });
    await this.confirmModal.waitFor({ state: 'visible' });
    await expect(this.confirmModal).toBeVisible();

    await expect(this.confirmModalDeleteButton).toBeVisible();
    await this.confirmModalDeleteButton.click();
    await this.tableRowSelector(goalName).waitFor({ state: 'detached' });
    await this.tableRowSelector(goalName).waitFor({ state: 'hidden' });
    await expect(this.tableRowSelector(goalName)).not.toBeVisible();
  }

  async fillGoalDefinition() {
    await this.inputGoalDefinition.focus();
    await this.inputGoalDefinition.fill(this.goalDefinition);
    await this.inputGoalDefinition.evaluate(e => e.blur());
  }

  async fillGoalDescription() {
    await this.inputGoalDescription.focus();
    await this.inputGoalDescription.fill(this.goalDescription);
    await this.inputGoalDescription.evaluate(e => e.blur());
  }

  async fillGoalName(goalName) {
    await this.inputGoalName.focus();
    await this.inputGoalName.fill(goalName);
    await this.inputGoalName.evaluate(e => e.blur());
  }

  async goto() {
    await this.page.goto('/scheduling/goals', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(250);
    await this.page.waitForSelector(`input[placeholder="Filter goals"]`, { state: 'attached' });
  }

  async selectModel() {
    await this.page.waitForSelector(`option:has-text("${this.models.modelName}")`, { state: 'attached' });
    const value = await getOptionValueFromText(this.page, this.inputGoalModelSelector, this.models.modelName);
    await this.inputGoalModel.focus();
    await this.inputGoalModel.selectOption(value);
    await this.inputGoalModel.evaluate(e => e.blur());
  }

  updatePage(page: Page): void {
    this.closeButton = page.locator(`button:has-text("Close")`);
    this.confirmModal = page.locator(`.modal:has-text("Delete Scheduling Goal")`);
    this.confirmModalDeleteButton = page.locator(
      `.modal:has-text("Delete Scheduling Goal") >> button:has-text("Delete")`,
    );
    this.inputGoalDefinition = page.locator('.monaco-editor >> textarea.inputarea');
    this.inputGoalDescription = page.locator('textarea[name="goal-description"]');
    this.inputGoalModel = page.locator(this.inputGoalModelSelector);
    this.inputGoalName = page.locator(`input[name="goal-name"]`);
    this.newButton = page.locator(`button:has-text("New")`);
    this.page = page;
    this.saveButton = page.locator(`button:has-text("Save")`);
    this.tableRowSelector = (goalName: string) => page.locator(`.ag-row:has-text("${goalName}")`);
    this.tableRowDeleteButtonSelector = (goalName: string) =>
      page.locator(`.ag-row:has-text("${goalName}") >> button[aria-label="Delete Goal"]`);
  }
}
