import { expect, type Locator, type Page } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { fillEditorText } from '../utilities/editor.js';

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
  table: Locator;
  tableRow: Locator;
  tableRowDeleteButton: Locator;

  constructor(public page: Page) {
    this.conditionName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
    this.updatePage(page);
  }

  async createSchedulingCondition(baseURL: string | undefined) {
    await expect(this.saveButton).toBeDisabled();
    await this.fillConditionName();
    await this.fillConditionDescription();
    await this.fillConditionDefinition();
    await expect(this.saveButton).not.toBeDisabled();
    await this.saveButton.click();
    await this.page.waitForURL(`${baseURL}/scheduling/conditions/edit/*`);
    await expect(this.closeButton).not.toBeDisabled();
    await this.closeButton.click();
    await this.page.waitForURL(`${baseURL}/scheduling`);
  }

  async deleteSchedulingCondition() {
    await this.goto();
    await this.filterTable(this.conditionName);
    await expect(this.tableRow).toBeVisible();

    await this.tableRow.hover();
    await expect(this.tableRow.locator('.actions-cell')).toBeVisible();
    await this.tableRowDeleteButton.waitFor({ state: 'attached' });
    await this.tableRowDeleteButton.waitFor({ state: 'visible' });
    await expect(this.tableRowDeleteButton).toBeVisible();

    await expect(this.confirmModal).not.toBeVisible();
    await this.tableRowDeleteButton.click({ position: { x: 2, y: 2 } });
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
    await fillEditorText(this.inputConditionDefinition, this.conditionDefinition);
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
    await this.page.goto('/scheduling/conditions', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(250);
    await this.page.waitForSelector(`input[placeholder="Filter conditions"]`, { state: 'attached' });
  }

  async gotoNew() {
    await this.page.goto('/scheduling/conditions/new', { waitUntil: 'networkidle' });
  }

  updatePage(page: Page): void {
    this.closeButton = page.locator(`button:has-text("Close")`);
    this.confirmModal = page.locator(`.modal:has-text("Delete Scheduling Condition")`);
    this.confirmModalDeleteButton = this.confirmModal.getByRole('button', { name: 'Delete' });
    this.inputConditionDefinition = page.locator('.monaco-editor >> textarea.inputarea');
    this.inputConditionDescription = page.locator('textarea[name="metadata-description"]');
    this.inputConditionModel = page.locator(this.inputConditionModelSelector);
    this.inputConditionName = page.locator(`input[name="metadata-name"]`);
    this.newButton = page.locator(`button:has-text("New")`);
    this.page = page;
    this.saveButton = page.locator(`button:has-text("Save")`);
    this.table = page.locator('.panel:has-text("Scheduling Conditions")').getByRole('treegrid');
    this.tableRow = this.table.getByRole('row', { name: this.conditionName });
    this.tableRowDeleteButton = this.tableRow.getByRole('gridcell').getByRole('button', { name: 'Delete Condition' });
  }
}
