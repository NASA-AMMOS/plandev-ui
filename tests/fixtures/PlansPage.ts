import { Locator, Page } from '@playwright/test';
import { animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { getOptionValueFromText, getSelectedOption } from '../utils/selectors';

export class PlansPage {
  readonly page: Page;

  readonly endTime: string;
  readonly planName: string;
  readonly startTime: string;

  readonly alertError: Locator;
  readonly createButton: Locator;
  readonly inputEndTime: Locator;
  readonly inputModel: Locator;
  readonly inputModelSelector: string = 'select[name="model"]';
  readonly inputName: Locator;
  readonly inputStartTime: Locator;

  constructor(page: Page) {
    this.page = page;

    this.endTime = '2022-006T00:00:00';
    this.planName = uniqueNamesGenerator({ dictionaries: [colors, animals] });
    this.startTime = '2022-001T00:00:00';

    this.alertError = page.locator('.alert-error');
    this.createButton = page.locator('text=Create');
    this.inputEndTime = page.locator('input[name="end-time"]');
    this.inputModel = page.locator(this.inputModelSelector);
    this.inputName = page.locator('input[name="name"]');
    this.inputStartTime = page.locator('input[name="start-time"]');
  }

  async fillInputEndTime() {
    await this.inputEndTime.focus();
    await this.inputEndTime.fill(this.endTime);
    await this.inputEndTime.evaluate(e => e.blur());
  }

  async fillInputName() {
    await this.inputName.focus();
    await this.inputName.fill(this.planName);
    await this.inputName.evaluate(e => e.blur());
  }

  async fillInputStartTime() {
    await this.inputStartTime.focus();
    await this.inputStartTime.fill(this.startTime);
    await this.inputStartTime.evaluate(e => e.blur());
  }

  async goto() {
    await this.page.goto('/plans');
  }

  async selectInputModel(modelName: string) {
    const value = await getOptionValueFromText(this.page, this.inputModelSelector, modelName);
    await this.inputModel.focus();
    await this.inputModel.selectOption(value);
    await this.inputModel.evaluate(e => e.blur());
  }

  async selectedModel() {
    return await getSelectedOption(this.page, this.inputModelSelector);
  }
}
