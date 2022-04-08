import { Locator, Page } from '@playwright/test';
import { getSelect } from '../utils/selectors';

export class PlansPage {
  readonly page: Page;

  readonly alertError: Locator;
  readonly createButton: Locator;
  readonly inputModelSelector = 'select[name="model"]';

  constructor(page: Page) {
    this.page = page;

    this.alertError = page.locator('.alert-error');
    this.createButton = page.locator('text=Create');
  }

  async goto() {
    await this.page.goto('/plans');
  }

  async selectedModel() {
    return await getSelect(this.page, this.inputModelSelector);
  }
}
