import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { Plans } from './Plans.js';
import { SchedulingGoals } from './SchedulingGoals.js';

export class Plan {
  activitiesNavButton: Locator;
  activityTable: Locator;
  appError: Locator;
  constraintsNavButton: Locator;
  gridMenu: Locator;
  gridMenuButton: Locator;
  gridMenuItem: (name: string) => Locator;
  panelActivityForm: Locator;
  panelActivityTypes: Locator;
  panelConstraintViolations: Locator;
  panelConstraints: Locator;
  panelExpansion: Locator;
  panelScheduling: Locator;
  panelSimulation: Locator;
  panelTimelineForm: Locator;
  panelViewEditor: Locator;
  panelViews: Locator;
  planTitle: Locator;
  scheduleButton: Locator;
  schedulingGoalDifferenceBadge: Locator;
  schedulingGoalEnabledCheckbox: Locator;
  schedulingGoalListItemSelector: string;
  schedulingGoalNewButton: Locator;
  schedulingNavButton: Locator;
  schedulingStatusSelector: (status: string) => string;
  simulationNavButton: Locator;
  timeline: Locator;
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

  async showPanel(name: string) {
    await expect(this.gridMenu).not.toBeVisible();
    await this.gridMenuButton.first().click();
    await this.gridMenu.waitFor({ state: 'visible' });
    await this.gridMenuItem(name).click();
  }

  async showSchedulingLayout() {
    await this.schedulingNavButton.click();
    await this.panelScheduling.waitFor({ state: 'visible' });
    await this.timeline.waitFor({ state: 'visible' });
    await this.activityTable.waitFor({ state: 'visible' });
    await this.panelActivityForm.waitFor({ state: 'visible' });
    await expect(this.panelScheduling).toBeVisible();
    await expect(this.timeline).toBeVisible();
    await expect(this.activityTable).toBeVisible();
    await expect(this.panelActivityForm).toBeVisible();
    await expect(this.schedulingNavButton).toHaveClass(/selected/);
  }

  updatePage(page: Page): void {
    this.activitiesNavButton = page.locator(`.nav-button:has-text("Activities")`);
    this.activityTable = page.locator('[data-component-name="ActivityTable"]');
    this.appError = page.locator('.app-error');
    this.constraintsNavButton = page.locator(`.nav-button:has-text("Constraints")`);
    this.gridMenu = page.locator('.grid-menu > .menu > .menu-slot');
    this.gridMenuButton = page.locator('.grid-menu');
    this.gridMenuItem = (name: string) =>
      page.locator(`.grid-menu > .menu > .menu-slot > .menu-item:has-text("${name}")`);
    this.page = page;
    this.panelActivityForm = page.locator('[data-component-name="ActivityFormPanel"]');
    this.panelActivityTypes = page.locator('[data-component-name="ActivityTypesPanel"]');
    this.panelConstraintViolations = page.locator('[data-component-name="ConstraintViolationsPanel"]');
    this.panelConstraints = page.locator('[data-component-name="ConstraintsPanel"]');
    this.panelExpansion = page.locator('[data-component-name="ExpansionPanel"]');
    this.panelScheduling = page.locator('[data-component-name="SchedulingPanel"]');
    this.panelSimulation = page.locator('[data-component-name="SimulationPanel"]');
    this.panelTimelineForm = page.locator('[data-component-name="TimelineFormPanel"]');
    this.panelViewEditor = page.locator('[data-component-name="ViewEditorPanel"]');
    this.panelViews = page.locator('[data-component-name="ViewsPanel"]');
    this.planTitle = page.locator(`.plan-title:has-text("${this.plans.planName}")`);
    this.scheduleButton = page.locator('.status-badge > .title:has-text("Schedule")');
    this.schedulingGoalDifferenceBadge = page.locator('.difference-badge');
    this.schedulingGoalEnabledCheckbox = page.locator(
      `.scheduling-goal:has-text("${this.schedulingGoals.goalName}") >> input[type="checkbox"]`,
    );
    this.schedulingGoalNewButton = page.locator(`button[name="new-scheduling-goal"]`);
    this.schedulingNavButton = page.locator(`.nav-button:has-text("Scheduling")`);
    this.simulationNavButton = page.locator(`.nav-button:has-text("Simulation")`);
    this.timeline = page.locator('[data-component-name="Timeline"]');
    this.viewNavButton = page.locator(`.nav-button:has-text("View")`);
  }
}
