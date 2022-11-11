import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { Constraints } from './Constraints.js';
import { Plans } from './Plans.js';
import { SchedulingGoals } from './SchedulingGoals.js';

export class Plan {
  analyzeButton: Locator;
  appError: Locator;
  constraintListItemSelector: string;
  constraintNewButton: Locator;
  gridMenu: Locator;
  gridMenuButton: Locator;
  gridMenuItem: (name: string) => Locator;
  navButtonActivities: Locator;
  navButtonConstraints: Locator;
  navButtonScheduling: Locator;
  navButtonSimulation: Locator;
  navButtonView: Locator;
  panelActivityForm: Locator;
  panelActivityTable: Locator;
  panelActivityTypes: Locator;
  panelConstraintViolations: Locator;
  panelConstraints: Locator;
  panelExpansion: Locator;
  panelScheduling: Locator;
  panelSimulation: Locator;
  panelTimeline: Locator;
  panelTimelineForm: Locator;
  panelViewEditor: Locator;
  panelViews: Locator;
  planTitle: Locator;
  scheduleButton: Locator;
  schedulingGoalDifferenceBadge: Locator;
  schedulingGoalEnabledCheckbox: Locator;
  schedulingGoalExpand: Locator;
  schedulingGoalListItemSelector: string;
  schedulingGoalNewButton: Locator;
  schedulingSatisfiedActivity: Locator;
  schedulingStatusSelector: (status: string) => string;

  constructor(
    public page: Page,
    public plans: Plans,
    public constraints: Constraints,
    public schedulingGoals: SchedulingGoals,
  ) {
    this.constraintListItemSelector = `.constraint-list-item:has-text("${constraints.constraintName}")`;
    this.schedulingGoalListItemSelector = `.scheduling-goal:has-text("${schedulingGoals.goalName}")`;
    this.schedulingStatusSelector = (status: string) => `.status-badge.${status}`;
    this.updatePage(page);
  }

  async createConstraint(baseURL: string | undefined) {
    const [newConstraintPage] = await Promise.all([this.page.waitForEvent('popup'), this.constraintNewButton.click()]);
    this.constraints.updatePage(newConstraintPage);
    await newConstraintPage.waitForURL(`${baseURL}/constraints/new`);
    await this.constraints.createConstraint(baseURL);
    await newConstraintPage.close();
    this.constraints.updatePage(this.page);
    await this.page.waitForSelector(this.constraintListItemSelector, { state: 'visible', strict: true });
  }

  async createSchedulingGoal(baseURL: string | undefined) {
    const [newSchedulingGoalPage] = await Promise.all([
      this.page.waitForEvent('popup'),
      this.schedulingGoalNewButton.click(),
    ]);
    this.schedulingGoals.updatePage(newSchedulingGoalPage);
    await newSchedulingGoalPage.waitForURL(`${baseURL}/scheduling/goals/new?modelId=*&&specId=*`);
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
    await this.page.waitForTimeout(1200);
    await this.page.goto(`/plans/${this.plans.planId}`, { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(250);
  }

  async runAnalysis() {
    await this.analyzeButton.click();
    await this.page.waitForSelector(this.schedulingStatusSelector('Incomplete'), { state: 'attached', strict: true });
    await this.page.waitForSelector(this.schedulingStatusSelector('Incomplete'), { state: 'visible', strict: true });
    await this.page.waitForSelector(this.schedulingStatusSelector('Complete'), { state: 'attached', strict: true });
    await this.page.waitForSelector(this.schedulingStatusSelector('Complete'), { state: 'visible', strict: true });
  }

  async runScheduling() {
    await this.scheduleButton.click();
    await this.page.waitForSelector(this.schedulingStatusSelector('Incomplete'), { state: 'attached', strict: true });
    await this.page.waitForSelector(this.schedulingStatusSelector('Incomplete'), { state: 'visible', strict: true });
    await this.page.waitForSelector(this.schedulingStatusSelector('Complete'), { state: 'attached', strict: true });
    await this.page.waitForSelector(this.schedulingStatusSelector('Complete'), { state: 'visible', strict: true });
  }

  async showConstraintsLayout() {
    await this.navButtonConstraints.click();
    await this.panelConstraints.waitFor({ state: 'attached' });
    await this.panelConstraints.waitFor({ state: 'visible' });
    await this.panelActivityForm.waitFor({ state: 'attached' });
    await this.panelActivityForm.waitFor({ state: 'visible' });
    await this.panelActivityTable.waitFor({ state: 'attached' });
    await this.panelActivityTable.waitFor({ state: 'visible' });
    await this.panelConstraintViolations.waitFor({ state: 'attached' });
    await this.panelConstraintViolations.waitFor({ state: 'visible' });
    await this.panelTimeline.waitFor({ state: 'attached' });
    await this.panelTimeline.waitFor({ state: 'visible' });
    await expect(this.panelConstraints).toBeVisible();
    await expect(this.panelActivityForm).toBeVisible();
    await expect(this.panelActivityTable).toBeVisible();
    await expect(this.panelConstraintViolations).toBeVisible();
    await expect(this.panelTimeline).toBeVisible();
    await expect(this.navButtonConstraints).toHaveClass(/selected/);
  }

  async showPanel(name: string) {
    await expect(this.gridMenu).not.toBeVisible();
    await this.gridMenuButton.first().click();
    await this.gridMenu.waitFor({ state: 'attached' });
    await this.gridMenu.waitFor({ state: 'visible' });
    await this.gridMenuItem(name).click();
  }

  async showSchedulingLayout() {
    await this.navButtonScheduling.click();
    await this.panelScheduling.waitFor({ state: 'attached' });
    await this.panelScheduling.waitFor({ state: 'visible' });
    await this.panelActivityForm.waitFor({ state: 'attached' });
    await this.panelActivityForm.waitFor({ state: 'visible' });
    await this.panelActivityTable.waitFor({ state: 'attached' });
    await this.panelActivityTable.waitFor({ state: 'visible' });
    await this.panelTimeline.waitFor({ state: 'attached' });
    await this.panelTimeline.waitFor({ state: 'visible' });
    await expect(this.panelScheduling).toBeVisible();
    await expect(this.panelActivityForm).toBeVisible();
    await expect(this.panelActivityTable).toBeVisible();
    await expect(this.panelTimeline).toBeVisible();
    await expect(this.navButtonScheduling).toHaveClass(/selected/);
  }

  updatePage(page: Page): void {
    this.appError = page.locator('.app-error');
    this.constraintNewButton = page.locator(`button[name="new-constraint"]`);
    this.gridMenu = page.locator('.grid-menu > .menu > .menu-slot');
    this.gridMenuButton = page.locator('.grid-menu');
    this.gridMenuItem = (name: string) =>
      page.locator(`.grid-menu > .menu > .menu-slot > .menu-item:has-text("${name}")`);
    this.navButtonActivities = page.locator(`.nav-button:has-text("Activities")`);
    this.navButtonConstraints = page.locator(`.nav-button:has-text("Constraints")`);
    this.navButtonScheduling = page.locator(`.nav-button:has-text("Scheduling")`);
    this.navButtonSimulation = page.locator(`.nav-button:has-text("Simulation")`);
    this.navButtonView = page.locator(`.nav-button:has-text("View")`);
    this.page = page;
    this.panelActivityForm = page.locator('[data-component-name="ActivityFormPanel"]');
    this.panelActivityTable = page.locator('[data-component-name="ActivityTablePanel"]');
    this.panelActivityTypes = page.locator('[data-component-name="ActivityTypesPanel"]');
    this.panelConstraintViolations = page.locator('[data-component-name="ConstraintViolationsPanel"]');
    this.panelConstraints = page.locator('[data-component-name="ConstraintsPanel"]');
    this.panelExpansion = page.locator('[data-component-name="ExpansionPanel"]');
    this.panelScheduling = page.locator('[data-component-name="SchedulingPanel"]');
    this.panelSimulation = page.locator('[data-component-name="SimulationPanel"]');
    this.panelTimeline = page.locator('[data-component-name="TimelinePanel"]');
    this.panelTimelineForm = page.locator('[data-component-name="TimelineFormPanel"]');
    this.panelViewEditor = page.locator('[data-component-name="ViewEditorPanel"]');
    this.panelViews = page.locator('[data-component-name="ViewsPanel"]');
    this.planTitle = page.locator(`.plan-title:has-text("${this.plans.planName}")`);
    this.scheduleButton = page.locator('.header-actions > button[aria-label="Schedule"]');
    this.analyzeButton = page.locator('.header-actions > button[aria-label="Analyze"]');
    this.schedulingGoalDifferenceBadge = page.locator('.difference-badge');
    this.schedulingGoalEnabledCheckbox = page.locator(
      `.scheduling-goal:has-text("${this.schedulingGoals.goalName}") >> input[type="checkbox"]`,
    );
    this.schedulingGoalExpand = page.locator('span[aria-label="scheduling-goal-expand"]');
    this.schedulingGoalNewButton = page.locator(`button[name="new-scheduling-goal"]`);
    this.schedulingSatisfiedActivity = page.locator('li > .satisfied-activity');
  }
}
