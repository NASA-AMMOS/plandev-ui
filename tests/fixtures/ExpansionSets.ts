import { expect, type Locator, type Page } from '@playwright/test';
import { getOptionValueFromText } from '../utilities/selectors.js';
import { ExpansionRules } from './ExpansionRules.js';

export class ExpansionSets {
  readonly page: Page;

  readonly inputCommandDictionarySelector: string = 'select[name="commandDictionary"]';
  readonly inputCommandDictionary: Locator;
  readonly inputModelSelector: string = 'select[name="modelId"]';
  readonly inputModel: Locator;
  readonly inputRuleSelector: string;
  readonly inputRule: Locator;
  readonly newButton: Locator;
  readonly saveButton: Locator;
  readonly setsNavButton: Locator;

  constructor(page: Page, expansionRules: ExpansionRules) {
    this.page = page;

    this.inputCommandDictionary = page.locator(this.inputCommandDictionarySelector);
    this.inputModel = page.locator(this.inputModelSelector);
    this.inputRuleSelector = `input[name="${expansionRules.ruleActivityType}"]`;
    this.inputRule = page.locator(this.inputRuleSelector);
    this.newButton = page.locator(`button:has-text("New")`);
    this.saveButton = page.locator(`button:has-text("Save")`);
    this.setsNavButton = page.locator(`.nav-button:has-text("Sets")`);
  }

  async createExpansionSet(baseURL: string | undefined, commandDictionaryName: string, modelName: string) {
    await this.goto();
    await expect(this.newButton).not.toBeDisabled();
    await this.newButton.click();
    await this.page.waitForURL(`${baseURL}/expansion/sets/new`);
    await expect(this.saveButton).toBeDisabled();
    await this.selectCommandDictionary(commandDictionaryName);
    await this.selectModel(modelName);
    await this.selectRule();
    await expect(this.saveButton).not.toBeDisabled();
    await this.saveButton.click();
    await this.page.waitForURL(`${baseURL}/expansion/sets`);
  }

  async goto() {
    await this.page.goto('/plans');
    await this.page.goto('/expansion/sets', { waitUntil: 'networkidle' });
    await expect(this.setsNavButton).toHaveClass(/selected/);
  }

  async selectCommandDictionary(commandDictionaryName: string) {
    await this.page.waitForSelector(`option:has-text("${commandDictionaryName} - 1.0.0")`, { state: 'attached' });
    const value = await getOptionValueFromText(this.page, this.inputCommandDictionarySelector, commandDictionaryName);
    await this.inputCommandDictionary.focus();
    await this.inputCommandDictionary.selectOption(value);
    await this.inputCommandDictionary.evaluate(e => e.blur());
  }

  async selectModel(modelName: string) {
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
}
