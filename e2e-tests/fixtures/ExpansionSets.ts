import { expect, type Locator, type Page } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { getOptionValueFromText } from '../utilities/selectors.js';
import { ExpansionRules } from './ExpansionRules.js';
import { Models } from './Models.js';
import { Parcels } from './Parcels.js';

export class ExpansionSets {
  inputModel: Locator;
  inputModelSelector: string = 'select[name="modelId"]';
  inputName: Locator;
  inputNameSelector: string = 'input[name="name"]';
  inputParcel: Locator;
  inputParcelSelector: string = 'select[name="Parcel"]';
  inputRule: Locator;
  inputRuleSelector: string;
  newButton: Locator;
  saveButton: Locator;
  setsNavButton: Locator;

  constructor(
    public page: Page,
    public parcels: Parcels,
    public models: Models,
    public expansionRules: ExpansionRules,
  ) {
    this.inputRuleSelector = `input[name="${expansionRules.ruleActivityType}"]`;
    this.updatePage(page);
  }

  async createExpansionSet(baseURL: string | undefined) {
    await this.goto();
    await expect(this.newButton).not.toBeDisabled();
    await this.newButton.click();
    await this.page.waitForURL(`${baseURL}/expansion/sets/new`);
    await expect(this.saveButton).toBeDisabled();
    await this.selectParcel();
    await this.selectModel();
    await this.selectRule();
    await this.fillInputName();
    await expect(this.saveButton).not.toBeDisabled();
    await this.saveButton.click();
    await this.page.waitForURL(`${baseURL}/expansion/sets`);
  }

  async fillInputName() {
    const expansionSetName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
    await this.inputName.focus();
    await this.inputName.fill(expansionSetName);
    await this.inputName.evaluate(e => e.blur());
  }

  async goto() {
    await this.page.goto('/expansion/sets', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(250);
    await expect(this.setsNavButton).toHaveClass(/selected/);
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

  async selectRule() {
    await this.page.waitForSelector(this.inputRuleSelector, { state: 'attached' });
    await this.inputRule.first().click();
  }

  updatePage(page: Page): void {
    this.inputModel = page.locator(this.inputModelSelector);
    this.inputName = page.locator(this.inputNameSelector);
    this.inputParcel = page.locator(this.inputParcelSelector);
    this.inputRule = page.locator(this.inputRuleSelector);
    this.newButton = page.locator(`button:has-text("New")`);
    this.page = page;
    this.saveButton = page.locator(`button:has-text("Save")`);
    this.setsNavButton = page.locator(`.nav-button:has-text("Sets")`);
  }
}
