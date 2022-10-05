import { expect, type Locator, type Page } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { getOptionValueFromText } from '../utilities/selectors.js';
import { Models } from './Models.js';

export class SchedulingGoals {
  closeButton: Locator;
  confirmModal: Locator;
  confirmModalDeleteButton: Locator;
  goalDefinition: string = `export default (): Goal => Goal.ActivityRecurrenceGoal({ activityTemplate: ActivityTemplates.BakeBananaBread({ temperature: 325.0, tbSugar: 2, glutenFree: false }), interval: Temporal.Duration.from({ hours: 12 }) })`;
  goalDescription: string = 'Add a BakeBananaBread activity every 12 hours';
  goalName: string;
  goalsNavButton: Locator;
  inputGoalDefinition: Locator;
  inputGoalDescription: Locator;
  inputGoalModel: Locator;
  inputGoalModelSelector: string = 'select[name="model"]';
  inputGoalName: Locator;
  newButton: Locator;
  saveButton: Locator;
  tableRow: Locator;
  tableRowDeleteButton: Locator;

  constructor(public page: Page, public models: Models) {
    this.goalName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
    this.updatePage(page);
  }

  async createSchedulingGoal(baseURL: string | undefined) {
    await expect(this.saveButton).toBeDisabled();
    await this.selectModel();
    await this.fillGoalName();
    await this.fillGoalDescription();
    await this.fillGoalDefinition();
    await expect(this.saveButton).not.toBeDisabled();
    await this.saveButton.click();
    await this.page.waitForURL(`${baseURL}/scheduling/goals/edit/*`);
    await expect(this.saveButton).not.toBeDisabled();
    await expect(this.closeButton).not.toBeDisabled();
    await this.closeButton.click();
    await this.page.waitForURL(`${baseURL}/scheduling/goals`);
  }

  async deleteSchedulingGoal() {
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

  async fillGoalName() {
    await this.inputGoalName.focus();
    await this.inputGoalName.fill(this.goalName);
    await this.inputGoalName.evaluate(e => e.blur());
  }

  async goto() {
    await this.page.goto('/scheduling/goals', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(250);
    await expect(this.goalsNavButton).toHaveClass(/selected/);
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
    this.goalsNavButton = page.locator(`.nav-button:has-text("Goals")`);
    this.inputGoalDefinition = page.locator('.monaco-editor >> textarea.inputarea');
    this.inputGoalDescription = page.locator('textarea[name="goal-description"]');
    this.inputGoalModel = page.locator(this.inputGoalModelSelector);
    this.inputGoalName = page.locator(`input[name="goal-name"]`);
    this.newButton = page.locator(`button:has-text("New")`);
    this.page = page;
    this.saveButton = page.locator(`button:has-text("Save")`);
    this.tableRow = page.locator(`.ag-row:has-text("${this.goalName}")`);
    this.tableRowDeleteButton = page.locator(
      `.ag-row:has-text("${this.goalName}") >> button[aria-label="Delete Goal"]`,
    );
  }
}
