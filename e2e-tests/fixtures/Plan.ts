import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { Plans } from './Plans.js';
import { SchedulingGoals } from './SchedulingGoals.js';

export class Plan {
  activitiesNavButton: Locator;
  activityFormComponent: Locator;
  activityTableComponent: Locator;
  activityTypesComponent: Locator;
  appError: Locator;
  constraintsNavButton: Locator;
  planTitle: Locator;
  scheduleButton: Locator;
  schedulingComponent: Locator;
  schedulingGoalDifferenceBadge: Locator;
  schedulingGoalEnabledCheckbox: Locator;
  schedulingGoalListItemSelector: string;
  schedulingGoalNewButton: Locator;
  schedulingNavButton: Locator;
  schedulingStatusSelector: (status: string) => string;
  simulationNavButton: Locator;
  timelineComponent: Locator;
  viewNavButton: Locator;

  constructor(public page: Page, public plans: Plans, public schedulingGoals: SchedulingGoals) {
    this.schedulingGoalListItemSelector = `.scheduling-goal:has-text("${schedulingGoals.goalName}")`;
    this.schedulingStatusSelector = (status: string) => `.status-badge > .status:has-text("${status}")`;
    this.updatePage(page);
  }

  async createSchedulingGoal(baseURL: string | undefined) {
    const [newSchedulingGoalPage] = await Promise.all([
      this.page.waitForEvent('popup'),
      this.schedulingGoalNewButton.click(),
    ]);
    this.schedulingGoals.updatePage(newSchedulingGoalPage);
    await newSchedulingGoalPage.waitForURL(`${baseURL}/scheduling/goals/new?specId=*`);
    await this.schedulingGoals.createSchedulingGoal(baseURL);
    await newSchedulingGoalPage.close();
    this.schedulingGoals.updatePage(this.page);
    await this.page.waitForSelector(this.schedulingGoalListItemSelector, { state: 'visible', strict: true });
  }

  /**
   * Wait for Hasura events to finish seeding the database after a model is created.
   * If we do not wait then navigation to the plan will fail because the data is not there yet.
   * If your tests fail then the timeout might be too short.
   * Re-run the tests and increase the timeout if you get consistent failures.
   */
  async goto() {
    await this.page.goto('/plans');
    await this.page.waitForTimeout(1200);
    await this.page.goto(`/plans/${this.plans.planId}`, { waitUntil: 'networkidle' });
  }

  async runScheduling() {
    await this.scheduleButton.click();
    await this.page.waitForSelector(this.schedulingStatusSelector('Incomplete'), { state: 'visible', strict: true });
    await this.page.waitForSelector(this.schedulingStatusSelector('Complete'), { state: 'visible', strict: true });
  }

  async showSchedulingLayout() {
    await this.schedulingNavButton.click();
    await this.schedulingComponent.waitFor({ state: 'visible' });
    await this.timelineComponent.waitFor({ state: 'visible' });
    await this.activityTableComponent.waitFor({ state: 'visible' });
    await this.activityFormComponent.waitFor({ state: 'visible' });
    await expect(this.schedulingComponent).toBeVisible();
    await expect(this.timelineComponent).toBeVisible();
    await expect(this.activityTableComponent).toBeVisible();
    await expect(this.activityFormComponent).toBeVisible();
    await expect(this.schedulingNavButton).toHaveClass(/selected/);
  }

  updatePage(page: Page): void {
    this.activitiesNavButton = page.locator(`.nav-button:has-text("Activities")`);
    this.activityFormComponent = page.locator('[data-component-name="ActivityForm"]');
    this.activityTableComponent = page.locator('[data-component-name="ActivityTable"]');
    this.activityTypesComponent = page.locator('[data-component-name="ActivityTypes"]');
    this.appError = page.locator('.app-error');
    this.constraintsNavButton = page.locator(`.nav-button:has-text("Constraints")`);
    this.page = page;
    this.planTitle = page.locator(`.plan-title:has-text("${this.plans.planName}")`);
    this.scheduleButton = page.locator('.status-badge > .title:has-text("Schedule")');
    this.schedulingComponent = page.locator('[data-component-name="Scheduling"]');
    this.schedulingGoalDifferenceBadge = page.locator('.difference-badge');
    this.schedulingGoalEnabledCheckbox = page.locator(
      `.scheduling-goal:has-text("${this.schedulingGoals.goalName}") >> input[type="checkbox"]`,
    );
    this.schedulingGoalNewButton = page.locator(`button[name="new-scheduling-goal"]`);
    this.schedulingNavButton = page.locator(`.nav-button:has-text("Scheduling")`);
    this.simulationNavButton = page.locator(`.nav-button:has-text("Simulation")`);
    this.timelineComponent = page.locator('[data-component-name="Timeline"]');
    this.viewNavButton = page.locator(`.nav-button:has-text("View")`);
  }
}
