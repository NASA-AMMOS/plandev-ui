import type { Locator, Page } from '@playwright/test';

export class PlanPage {
  readonly page: Page;

  readonly planTitle: (planName: string) => Locator;

  constructor(page: Page) {
    this.page = page;

    this.planTitle = (planName: string) => page.locator(`.title:has-text("${planName}")`);
  }

  async goto(planId: string) {
    await this.page.goto(`/plans/${planId}`);
  }
}
