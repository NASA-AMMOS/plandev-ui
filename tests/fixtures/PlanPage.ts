import type { Locator, Page } from '@playwright/test';

export class PlanPage {
  readonly page: Page;

  readonly appError: Locator;
  readonly planTitle: (planName: string) => Locator;

  readonly activityFormComponent: Locator;
  readonly activityTableComponent: Locator;
  readonly activityTypesComponent: Locator;
  readonly timelineComponent: Locator;

  readonly activitiesNavButton: Locator;
  readonly constraintsNavButton: Locator;
  readonly schedulingNavButton: Locator;
  readonly simulationNavButton: Locator;
  readonly viewNavButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.appError = page.locator('.app-error');
    this.planTitle = (planName: string) => page.locator(`.plan-title:has-text("${planName}")`);

    this.activityFormComponent = page.locator('[data-component-name="ActivityForm"]');
    this.activityTableComponent = page.locator('[data-component-name="ActivityTable"]');
    this.activityTypesComponent = page.locator('[data-component-name="ActivityTypes"]');
    this.timelineComponent = page.locator('[data-component-name="Timeline"]');

    this.activitiesNavButton = page.locator(`.nav-button:has-text("Activities")`);
    this.constraintsNavButton = page.locator(`.nav-button:has-text("Constraints")`);
    this.schedulingNavButton = page.locator(`.nav-button:has-text("Scheduling")`);
    this.simulationNavButton = page.locator(`.nav-button:has-text("Simulation")`);
    this.viewNavButton = page.locator(`.nav-button:has-text("View")`);
  }

  /**
   * Wait for Hasura events to finish seeding the database after a model is created.
   * If we do not wait then navigation to the plan will fail because the data is not there yet.
   */
  async goto(planId: string) {
    await this.page.waitForTimeout(1000);
    await this.page.goto(`/plans/${planId}`);
  }
}
