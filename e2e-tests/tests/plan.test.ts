import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { Constraints } from '../fixtures/Constraints.js';
import { Models } from '../fixtures/Models.js';
import { Plan } from '../fixtures/Plan.js';
import { Plans } from '../fixtures/Plans.js';
import { SchedulingGoals } from '../fixtures/SchedulingGoals.js';

let constraints: Constraints;
let context: BrowserContext;
let models: Models;
let page: Page;
let plan: Plan;
let plans: Plans;
let schedulingGoals: SchedulingGoals;

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext();
  page = await context.newPage();

  models = new Models(page);
  plans = new Plans(page, models);
  constraints = new Constraints(page, models);
  schedulingGoals = new SchedulingGoals(page, models);
  plan = new Plan(page, plans, constraints, schedulingGoals);

  await models.goto();
  await models.createModel();
  await plans.goto();
  await plans.createPlan();
  await plan.goto();
});

test.afterAll(async () => {
  await plans.goto();
  await plans.deletePlan();
  await models.goto();
  await models.deleteModel();
  await page.close();
  await context.close();
});

test.describe.serial('Plan', () => {
  test('Error page should not be visible, and the plan title should be visible in the top navigation bar', async () => {
    await expect(plan.appError).not.toBeVisible();
    await expect(plan.planTitle).toBeVisible();
  });

  test('Initially the View layout should be displayed', async () => {
    await expect(plan.panelActivityForm).toBeVisible();
    await expect(plan.panelActivityTable).toBeVisible();
    await expect(plan.panelActivityTypes).toBeVisible();
    await expect(plan.panelTimeline).toBeVisible();
    await expect(plan.navButtonView).toHaveClass(/selected/);
  });

  test(`Clicking on 'Constraints' in the grid menu should show the constraints panel`, async () => {
    await expect(plan.panelConstraints).not.toBeVisible();
    await plan.showPanel('Constraints');
    await expect(plan.panelConstraints).toBeVisible();
  });

  test(`Clicking on 'Constraint Violations' in the grid menu should show the constraint violations panel`, async () => {
    await expect(plan.panelConstraintViolations).not.toBeVisible();
    await plan.showPanel('Constraint Violations');
    await expect(plan.panelConstraintViolations).toBeVisible();
  });

  test(`Clicking on 'Expansion' in the grid menu should show the expansion panel`, async () => {
    await expect(plan.panelExpansion).not.toBeVisible();
    await plan.showPanel('Expansion');
    await expect(plan.panelExpansion).toBeVisible();
  });

  test(`Clicking on 'Scheduling' in the grid menu should show the scheduling panel`, async () => {
    await expect(plan.panelScheduling).not.toBeVisible();
    await plan.showPanel('Scheduling');
    await expect(plan.panelScheduling).toBeVisible();
  });

  test(`Clicking on 'Simulation' in the grid menu should show the simulation panel`, async () => {
    await expect(plan.panelSimulation).not.toBeVisible();
    await plan.showPanel('Simulation');
    await expect(plan.panelSimulation).toBeVisible();
  });

  test(`Clicking on 'Timeline Form' in the grid menu should show the timeline form panel`, async () => {
    await expect(plan.panelTimelineForm).not.toBeVisible();
    await plan.showPanel('Timeline Form');
    await expect(plan.panelTimelineForm).toBeVisible();
  });

  test(`Clicking on 'Timeline Details' in the grid menu should show the timeline details panel`, async () => {
    await expect(plan.panelTimelineDetails).not.toBeVisible();
    await plan.showPanel('Timeline Details');
    await expect(plan.panelTimelineDetails).toBeVisible();
  });

  test(`Clicking on 'Views' in the grid menu should show the views panel`, async () => {
    await expect(plan.panelViews).not.toBeVisible();
    await plan.showPanel('Views');
    await expect(plan.panelViews).toBeVisible();
  });

  test(`Clicking on 'View Editor' in the grid menu should show the view editor panel`, async () => {
    await expect(plan.panelViewEditor).not.toBeVisible();
    await plan.showPanel('View Editor');
    await expect(plan.panelViewEditor).toBeVisible();
  });
});
