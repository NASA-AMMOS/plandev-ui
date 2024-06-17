import { expect, type Locator, type Page } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { fillEditorText } from '../utilities/editor.js';
import { getOptionValueFromText } from '../utilities/selectors.js';
import { Models } from './Models.js';
import { Parcels } from './Parcels.js';

export class ExpansionRules {
  cancelButton: Locator;
  closeButton: Locator;
  confirmModal: Locator;
  confirmModalDeleteButton: Locator;
  expansionRuleName: string;
  inputActivityType: Locator;
  inputActivityTypeSelector: string = 'select[name="activityType"]';
  inputEditor: Locator;
  inputModel: Locator;
  inputModelSelector: string = 'select[name="modelId"]';
  inputName: Locator;
  inputNameSelector: string = 'input[name="name"]';
  inputParcel: Locator;
  inputParcelSelector: string = 'select[name="parcel"]';
  newButton: Locator;
  ruleActivityType = 'PeelBanana';
  ruleLogic: string = `export default function({ activityInstance: ActivityType }): ExpansionReturn { return [C.FSW_CMD_0({ boolean_arg_0: true, enum_arg_0: "OFF", float_arg_0: 0.0 })]; }`;
  rulesNavButton: Locator;
  saveButton: Locator;
  table: Locator;
  tableRow: Locator;
  tableRowDeleteButton: Locator;

  constructor(
    public page: Page,
    public parcels: Parcels,
    public models: Models,
  ) {
    this.expansionRuleName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
    this.updatePage(page);
  }

  async createExpansionRule(baseURL: string | undefined, expansionRuleName = this.expansionRuleName) {
    await this.goto();
    await expect(this.newButton).not.toBeDisabled();
    await this.newButton.click();
    await this.page.waitForURL(`${baseURL}/expansion/rules/new`);
    await expect(this.saveButton).toBeDisabled();
    await this.selectParcel();
    await this.selectModel();
    await this.selectActivityType();
    await this.fillInputName(expansionRuleName);
    await this.fillInputEditor();
    await expect(this.saveButton).not.toBeDisabled();
    await this.saveButton.click();
    await this.page.waitForURL(`${baseURL}/expansion/rules/edit/*`);
    await expect(this.saveButton).not.toBeDisabled();
    await expect(this.closeButton).not.toBeDisabled();
    await this.closeButton.click();
    await this.page.waitForURL(`${baseURL}/expansion/rules`);
  }

  async deleteExpansionRule() {
    await this.goto();
    await this.filterTable(this.expansionRuleName);
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

  async fillInputEditor() {
    await fillEditorText(this.inputEditor, this.ruleLogic);
  }

  async fillInputName(expansionRuleName = this.expansionRuleName) {
    await this.inputName.focus();
    await this.inputName.fill(expansionRuleName);
    await this.inputName.evaluate(e => e.blur());
  }

  private async filterTable(expansionRuleName: string) {
    await this.table.waitFor({ state: 'attached' });
    await this.table.waitFor({ state: 'visible' });

    const nameColumnHeader = await this.table.getByRole('columnheader', { name: 'Name' });
    await nameColumnHeader.hover();

    const filterIcon = await nameColumnHeader.locator('.ag-icon-menu');
    await expect(filterIcon).toBeVisible();
    await filterIcon.click();
    await this.page.locator('.ag-popup').getByRole('textbox', { name: 'Filter Value' }).first().fill(expansionRuleName);
    await expect(this.table.getByRole('row', { name: expansionRuleName })).toBeVisible();
    await this.page.keyboard.press('Escape');
  }

  async goto() {
    await this.page.goto('/expansion/rules', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(250);
    await expect(this.rulesNavButton).toHaveClass(/selected/);
  }

  async selectActivityType() {
    await this.page.waitForSelector(`option:has-text("${this.ruleActivityType}")`, { state: 'attached' });
    const value = await getOptionValueFromText(this.page, this.inputActivityTypeSelector, this.ruleActivityType);
    await this.inputActivityType.focus();
    await this.inputActivityType.selectOption(value);
    await this.inputActivityType.evaluate(e => e.blur());
  }

  async selectModel() {
    const { modelName } = this.models;
    await this.page.waitForSelector(`option:has-text("${modelName}")`, { state: 'attached' });
    const value = await getOptionValueFromText(this.page, this.inputModelSelector, modelName);
    await this.inputModel.focus();
    await this.inputModel.selectOption(value);
    await this.inputModel.evaluate(e => e.blur());
  }

  async selectParcel() {
    const { parcelName } = this.parcels;
    await this.page.waitForSelector(`option:has-text("${parcelName}")`, { state: 'attached' });
    const value = await getOptionValueFromText(this.page, this.inputParcelSelector, parcelName);
    await this.inputParcel.focus();
    await this.inputParcel.selectOption(value);
    await this.inputParcel.evaluate(e => e.blur());
  }

  updatePage(page: Page): void {
    this.cancelButton = page.locator(`button:has-text("Cancel")`);
    this.closeButton = page.locator(`button:has-text("Close")`);
    this.confirmModal = page.locator(`.modal:has-text("Delete Expansion Rule")`);
    this.confirmModalDeleteButton = this.confirmModal.getByRole('button', { name: 'Delete' });
    this.inputActivityType = page.locator(this.inputActivityTypeSelector);
    this.inputParcel = page.locator(this.inputParcelSelector);
    this.inputEditor = page.locator('.panel >> textarea.inputarea');
    this.inputModel = page.locator(this.inputModelSelector);
    this.inputName = page.locator(this.inputNameSelector);
    this.newButton = page.locator(`button:has-text("New")`);
    this.page = page;
    this.rulesNavButton = page.locator(`.nav-button:has-text("Rules")`);
    this.saveButton = page.locator(`button:has-text("Save")`);
    this.table = page.locator('.panel:has-text("Expansion Rules")').getByRole('treegrid');
    this.tableRow = this.table.getByRole('row', { name: this.expansionRuleName });
    this.tableRowDeleteButton = this.tableRow.getByRole('gridcell').getByRole('button', { name: 'Delete Rule' });
  }
}
