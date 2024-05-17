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
  tableRow: Locator;
  tableRowDeleteButton: Locator;

  constructor(
    public page: Page,
    public parcels: Parcels,
    public models: Models,
  ) {
    this.updatePage(page);
  }

  async createExpansionRule(baseURL: string | undefined) {
    await this.goto();
    await expect(this.newButton).not.toBeDisabled();
    await this.newButton.click();
    await this.page.waitForURL(`${baseURL}/expansion/rules/new`);
    await expect(this.saveButton).toBeDisabled();
    await this.selectParcel();
    await this.selectModel();
    await this.selectActivityType();
    await this.fillInputName();
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

  async fillInputEditor() {
    await fillEditorText(this.inputEditor, this.ruleLogic);
  }

  async fillInputName() {
    const expansionRuleName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
    await this.inputName.focus();
    await this.inputName.fill(expansionRuleName);
    await this.inputName.evaluate(e => e.blur());
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
    this.confirmModalDeleteButton = page.locator(
      `.modal:has-text("Delete Expansion Rule") >> button:has-text("Delete")`,
    );
    this.inputActivityType = page.locator(this.inputActivityTypeSelector);
    this.inputParcel = page.locator(this.inputParcelSelector);
    this.inputEditor = page.locator('.panel >> textarea.inputarea');
    this.inputModel = page.locator(this.inputModelSelector);
    this.inputName = page.locator(this.inputNameSelector);
    this.newButton = page.locator(`button:has-text("New")`);
    this.page = page;
    this.rulesNavButton = page.locator(`.nav-button:has-text("Rules")`);
    this.saveButton = page.locator(`button:has-text("Save")`);
    this.tableRow = page.locator(`.ag-row:has-text("${this.ruleActivityType}")`); // TODO: This row might not be unique.
    this.tableRowDeleteButton = page.locator(
      `.ag-row:has-text("${this.ruleActivityType}") >> button[aria-label="Delete Rule"]`,
    );
  }
}
