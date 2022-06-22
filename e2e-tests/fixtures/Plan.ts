import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class Plan {
  readonly page: Page;

  readonly appError: Locator;
  readonly planTitle: (planName: string) => Locator;

  readonly activityFormComponent: Locator;
  readonly activityTableComponent: Locator;
  readonly activityTypesComponent: Locator;
  readonly schedulingComponent: Locator;
  readonly schedulingEditorComponent: Locator;
  readonly timelineComponent: Locator;

  readonly activitiesNavButton: Locator;
  readonly constraintsNavButton: Locator;
  readonly schedulingNavButton: Locator;
  readonly simulationNavButton: Locator;
  readonly viewNavButton: Locator;

  readonly scheduleButton: Locator;
  readonly schedulingGoalDifferenceBadge: Locator;
  readonly schedulingGoalEnabledCheckbox: Locator;
  readonly schedulingGoalInputDescription: Locator;
  readonly schedulingGoalInputEditor: Locator;
  readonly schedulingGoalInputName: Locator;
  readonly schedulingGoalSaveButton: Locator;
  readonly schedulingGoalListItemSelector: string;
  readonly schedulingStatusSelector: (status: string) => string;

  readonly schedulingGoalName: string = 'Recurrence Goal';
  readonly schedulingGoalDescription: string = 'Add a BakeBananaBread activity every 12 hours';
  readonly schedulingGoalDefinition: string = `export default (): Goal => Goal.ActivityRecurrenceGoal({ activityTemplate: ActivityTemplates.BakeBananaBread({ temperature: 325.0, tbSugar: 2, glutenFree: false }), interval: 12 * 60 * 60 * 1000 * 1000 })`;

  constructor(page: Page) {
    this.page = page;

    this.appError = page.locator('.app-error');
    this.planTitle = (planName: string) => page.locator(`.plan-title:has-text("${planName}")`);

    this.activityFormComponent = page.locator('[data-component-name="ActivityForm"]');
    this.activityTableComponent = page.locator('[data-component-name="ActivityTable"]');
    this.activityTypesComponent = page.locator('[data-component-name="ActivityTypes"]');
    this.schedulingComponent = page.locator('[data-component-name="Scheduling"]');
    this.schedulingEditorComponent = page.locator('[data-component-name="SchedulingEditor"]');
    this.timelineComponent = page.locator('[data-component-name="Timeline"]');

    this.activitiesNavButton = page.locator(`.nav-button:has-text("Activities")`);
    this.constraintsNavButton = page.locator(`.nav-button:has-text("Constraints")`);
    this.schedulingNavButton = page.locator(`.nav-button:has-text("Scheduling")`);
    this.simulationNavButton = page.locator(`.nav-button:has-text("Simulation")`);
    this.viewNavButton = page.locator(`.nav-button:has-text("View")`);

    this.scheduleButton = page.locator('.status-badge > .title:has-text("Schedule")');
    this.schedulingGoalDifferenceBadge = page.locator('.difference-badge');
    this.schedulingGoalEnabledCheckbox = page.locator(
      `.scheduling-goal:has-text("${this.schedulingGoalName}") >> input[type="checkbox"]`,
    );
    this.schedulingGoalInputDescription = page.locator('[name="goal-description"]');
    this.schedulingGoalInputEditor = page.locator('[data-component-name="SchedulingEditor"] >> textarea.inputarea');
    this.schedulingGoalInputName = page.locator('[name="goal-name"]');
    this.schedulingGoalSaveButton = page.locator('[data-component-name="SchedulingEditor"] >> button:has-text("Save")');
    this.schedulingGoalListItemSelector = `.scheduling-goal:has-text("${this.schedulingGoalName}")`;
    this.schedulingStatusSelector = (status: string) => `.status-badge > .status:has-text("${status}")`;
  }

  async createSchedulingGoal() {
    await expect(this.schedulingGoalSaveButton).toBeDisabled();

    await this.schedulingGoalInputName.focus();
    await this.schedulingGoalInputName.fill(this.schedulingGoalName);
    await this.schedulingGoalInputName.evaluate(e => e.blur());

    await this.schedulingGoalInputDescription.focus();
    await this.schedulingGoalInputDescription.fill(this.schedulingGoalDescription);
    await this.schedulingGoalInputDescription.evaluate(e => e.blur());

    await this.schedulingGoalInputEditor.focus();
    await this.schedulingGoalInputEditor.fill(this.schedulingGoalDefinition);
    await this.schedulingGoalInputEditor.evaluate(e => e.blur());

    await expect(this.schedulingGoalSaveButton).not.toBeDisabled();
    await this.schedulingGoalSaveButton.click();
    await this.page.waitForSelector(this.schedulingGoalListItemSelector, { state: 'visible', strict: true });
  }

  /**
   * Wait for Hasura events to finish seeding the database after a model is created.
   * If we do not wait then navigation to the plan will fail because the data is not there yet.
   */
  async goto(planId: string) {
    await this.page.goto('/plans');
    await this.page.waitForTimeout(1000);
    await this.page.goto(`/plans/${planId}`, { waitUntil: 'networkidle' });
  }

  async runScheduling() {
    await this.scheduleButton.click();
    await this.page.waitForSelector(this.schedulingStatusSelector('Incomplete'), { state: 'visible', strict: true });
    await this.page.waitForSelector(this.schedulingStatusSelector('Complete'), { state: 'visible', strict: true });
  }

  async showSchedulingLayout() {
    await this.schedulingNavButton.click();
    await this.schedulingComponent.waitFor({ state: 'visible' });
    await this.schedulingEditorComponent.waitFor({ state: 'visible' });
    await this.timelineComponent.waitFor({ state: 'visible' });
    await this.activityTableComponent.waitFor({ state: 'visible' });
    await this.activityFormComponent.waitFor({ state: 'visible' });
    await expect(this.schedulingComponent).toBeVisible();
    await expect(this.schedulingEditorComponent).toBeVisible();
    await expect(this.timelineComponent).toBeVisible();
    await expect(this.activityTableComponent).toBeVisible();
    await expect(this.activityFormComponent).toBeVisible();
    await expect(this.schedulingNavButton).toHaveClass(/selected/);
  }
}
