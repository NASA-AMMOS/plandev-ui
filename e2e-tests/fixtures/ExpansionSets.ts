import { expect, type Locator, type Page } from '@playwright/test';
import { getOptionValueFromText } from '../utilities/selectors.js';
import { Dictionaries } from './Dictionaries.js';
import { ExpansionRules } from './ExpansionRules.js';
import { Models } from './Models.js';

export class ExpansionSets {
  inputCommandDictionary: Locator;
  inputCommandDictionarySelector: string = 'select[name="commandDictionary"]';
  inputModel: Locator;
  inputModelSelector: string = 'select[name="modelId"]';
  inputRule: Locator;
  inputRuleSelector: string;
  newButton: Locator;
  saveButton: Locator;
  setsNavButton: Locator;

  constructor(
    public page: Page,
    public dictionaries: Dictionaries,
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
    await this.selectCommandDictionary();
    await this.selectModel();
    await this.selectRule();
    await expect(this.saveButton).not.toBeDisabled();
    await this.saveButton.click();
    await this.page.waitForURL(`${baseURL}/expansion/sets`);
  }

  async goto() {
    await this.page.goto('/plans', { waitUntil: 'networkidle' });
    await this.page.goto('/expansion/sets', { waitUntil: 'networkidle' });
    await expect(this.setsNavButton).toHaveClass(/selected/);
  }

  async selectCommandDictionary() {
    const { dictionaryName } = this.dictionaries;
    await this.page.waitForSelector(`option:has-text("${dictionaryName} - 1.0.0")`, { state: 'attached' });
    const value = await getOptionValueFromText(this.page, this.inputCommandDictionarySelector, dictionaryName);
    await this.inputCommandDictionary.focus();
    await this.inputCommandDictionary.selectOption(value);
    await this.inputCommandDictionary.evaluate(e => e.blur());
  }

  async selectModel() {
    const { modelName } = this.models;
    await this.page.waitForSelector(`option:has-text("${modelName}")`, { state: 'attached' });
    const value = await getOptionValueFromText(this.page, this.inputModelSelector, modelName);
    await this.inputModel.focus();
    await this.inputModel.selectOption(value);
    await this.inputModel.evaluate(e => e.blur());
  }

  async selectRule() {
    await this.page.waitForSelector(this.inputRuleSelector, { state: 'attached' });
    await this.inputRule.click();
  }

  updatePage(page: Page): void {
    this.inputCommandDictionary = page.locator(this.inputCommandDictionarySelector);
    this.inputModel = page.locator(this.inputModelSelector);
    this.inputRule = page.locator(this.inputRuleSelector);
    this.newButton = page.locator(`button:has-text("New")`);
    this.page = page;
    this.saveButton = page.locator(`button:has-text("Save")`);
    this.setsNavButton = page.locator(`.nav-button:has-text("Sets")`);
  }
}
