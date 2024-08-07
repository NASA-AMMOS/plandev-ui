import { expect, type Locator, type Page } from '@playwright/test';
import { fillEditorText } from '../utilities/editor.js';

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
  table: Locator;
  tableRowDeleteButtonSelector: (goalName: string) => Locator;
  tableRowSelector: (goalName: string) => Locator;

  constructor(public page: Page) {
    this.updatePage(page);
  }

  async createSchedulingGoal(baseURL: string | undefined, goalName: string) {
    await expect(this.saveButton).toBeDisabled();

    // TODO: Potentially fix this in component. The loading of monaco causes the page fields to reset
    // so we need to wait until the page is fully loaded
    await this.page.getByText('Loading Editor...').waitFor({ state: 'detached' });

    await this.fillGoalName(goalName);
    await this.fillGoalDescription();
    await this.fillGoalDefinition();
    await expect(this.saveButton).not.toBeDisabled();
    await this.saveButton.click();
    await this.page.waitForURL(`${baseURL}/scheduling/goals/edit/*`);
    await expect(this.closeButton).not.toBeDisabled();
    await this.closeButton.click();
    await this.page.waitForURL(`${baseURL}/scheduling`);
  }

  async deleteSchedulingGoal(goalName: string) {
    const tableRow = this.tableRowSelector(goalName);
    await this.goto();
    await this.filterTable(goalName);
    await expect(tableRow).toBeVisible();

    await tableRow.hover();
    await expect(tableRow.locator('.actions-cell')).toBeVisible();
    await this.tableRowDeleteButtonSelector(goalName).waitFor({ state: 'attached' });
    await this.tableRowDeleteButtonSelector(goalName).waitFor({ state: 'visible' });
    await expect(this.tableRowDeleteButtonSelector(goalName)).toBeVisible();

    await expect(this.confirmModal).not.toBeVisible();
    await this.tableRowDeleteButtonSelector(goalName).click({ position: { x: 2, y: 2 } });
    await this.confirmModal.waitFor({ state: 'attached' });
    await this.confirmModal.waitFor({ state: 'visible' });
    await expect(this.confirmModal).toBeVisible();

    await expect(this.confirmModalDeleteButton).toBeVisible();
    await this.confirmModalDeleteButton.click();
    await tableRow.waitFor({ state: 'detached' });
    await tableRow.waitFor({ state: 'hidden' });
    await expect(tableRow).not.toBeVisible();
  }

  async fillGoalDefinition() {
    await fillEditorText(this.inputGoalDefinition, this.goalDefinition);
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

  private async filterTable(goalName: string) {
    await this.table.waitFor({ state: 'attached' });
    await this.table.waitFor({ state: 'visible' });

    const nameColumnHeader = await this.table.getByRole('columnheader', { name: 'Name' });
    await nameColumnHeader.hover();

    const filterIcon = await nameColumnHeader.locator('.ag-icon-menu');
    await expect(filterIcon).toBeVisible();
    await filterIcon.click();
    await this.page.locator('.ag-popup').getByRole('textbox', { name: 'Filter Value' }).first().fill(goalName);
    await expect(this.table.getByRole('row', { name: goalName })).toBeVisible();
    await this.page.keyboard.press('Escape');
  }

  async goto() {
    await this.page.goto('/scheduling/goals', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(250);
    await this.page.waitForSelector(`input[placeholder="Filter goals"]`, { state: 'attached' });
  }

  async gotoNew() {
    await this.page.goto('/scheduling/goals/new', { waitUntil: 'networkidle' });
  }

  updatePage(page: Page): void {
    this.closeButton = page.locator(`button:has-text("Close")`);
    this.confirmModal = page.locator(`.modal:has-text("Delete Scheduling Goal")`);
    this.confirmModalDeleteButton = this.confirmModal.getByRole('button', { name: 'Delete' });
    this.inputGoalDefinition = page.locator('.monaco-editor >> textarea.inputarea');
    this.inputGoalDescription = page.locator('textarea[name="metadata-description"]');
    this.inputGoalModel = page.locator(this.inputGoalModelSelector);
    this.inputGoalName = page.locator(`input[name="metadata-name"]`);
    this.newButton = page.locator(`button:has-text("New")`);
    this.page = page;
    this.saveButton = page.locator(`button:has-text("Save")`);
    this.table = page.locator('.panel:has-text("Scheduling Goals")').getByRole('treegrid');
    this.tableRowSelector = (goalName: string) => this.table.getByRole('row', { name: goalName });
    this.tableRowDeleteButtonSelector = (goalName: string) =>
      this.tableRowSelector(goalName).getByRole('gridcell').getByRole('button', { name: 'Delete Goal' });
  }
}
