import test, { expect, type BrowserContext, type Page } from '@playwright/test';
import { Constraints } from '../fixtures/Constraints.js';
import { Models } from '../fixtures/Models.js';
import { Plan } from '../fixtures/Plan.js';
import { Plans } from '../fixtures/Plans.js';
import { SchedulingConditions } from '../fixtures/SchedulingConditions.js';
import { SchedulingGoals } from '../fixtures/SchedulingGoals.js';

let constraints: Constraints;
let context: BrowserContext;
let models: Models;
let page: Page;
let plan: Plan;
let plans: Plans;
let schedulingConditions: SchedulingConditions;
let schedulingGoals: SchedulingGoals;

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext();
  page = await context.newPage();

  models = new Models(page);
  plans = new Plans(page, models);
  constraints = new Constraints(page);
  schedulingConditions = new SchedulingConditions(page);
  schedulingGoals = new SchedulingGoals(page);
  plan = new Plan(page, plans, constraints, schedulingGoals, schedulingConditions);

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
    await expect(plan.panelActivityDirectivesTable).toBeVisible();
    await expect(plan.panelActivityForm).toBeVisible();
    await expect(plan.panelActivityTypes).toBeVisible();
    await expect(plan.panelTimeline).toBeVisible();
  });

  test(`Clicking on 'Constraints' in the grid menu should show the constraints panel`, async () => {
    await expect(plan.panelConstraints).not.toBeVisible();
    await plan.showPanel('Constraints');
    await expect(plan.panelConstraints).toBeVisible();
  });

  test(`Clicking on 'Expansion' in the grid menu should show the expansion panel`, async () => {
    await expect(plan.panelExpansion).not.toBeVisible();
    await plan.showPanel('Expansion');
    await expect(plan.panelExpansion).toBeVisible();
  });

  test(`Clicking on 'Plan Metadata' in the grid menu should show the plan metadata panel`, async () => {
    await expect(plan.panelPlanMetadata).not.toBeVisible();
    await plan.showPanel('Plan Metadata');
    await expect(plan.panelPlanMetadata).toBeVisible();
  });

  test(`Clicking on 'Scheduling Goals' in the grid menu should show the scheduling goals panel`, async () => {
    await expect(plan.panelSchedulingGoals).not.toBeVisible();
    await plan.showPanel('Scheduling Goals');
    await expect(plan.panelSchedulingGoals).toBeVisible();
  });

  test(`Clicking on 'Scheduling Conditions' in the grid menu should show the scheduling conditions panel`, async () => {
    await expect(plan.panelSchedulingConditions).not.toBeVisible();
    await plan.showPanel('Scheduling Conditions');
    await expect(plan.panelSchedulingConditions).toBeVisible();
  });

  test(`Clicking on 'Simulation' in the grid menu should show the simulation panel`, async () => {
    await expect(plan.panelSimulation).not.toBeVisible();
    await plan.showPanel('Simulation');
    await expect(plan.panelSimulation).toBeVisible();
  });

  test(`Clicking on 'Timeline Editor' in the grid menu should show the timeline editor panel`, async () => {
    await expect(plan.panelTimelineEditor).not.toBeVisible();
    await plan.showPanel('Timeline Editor');
    await expect(plan.panelTimelineEditor).toBeVisible();
  });

  test(`Hovering on 'Activities' in the top navigation bar should show the activity checking menu`, async () => {
    await expect(plan.navButtonActivityCheckingMenu).not.toBeVisible();
    plan.navButtonActivityChecking.hover();
    await expect(plan.navButtonActivityCheckingMenu).toBeVisible();
    plan.planTitle.hover();
    await expect(plan.navButtonActivityCheckingMenu).not.toBeVisible();
  });

  test(`Hovering on 'Constraints' in the top navigation bar should show the constraints menu`, async () => {
    await expect(plan.navButtonConstraintsMenu).not.toBeVisible();
    plan.navButtonConstraints.hover();
    await expect(plan.navButtonConstraintsMenu).toBeVisible();
    plan.planTitle.hover();
    await expect(plan.navButtonConstraintsMenu).not.toBeVisible();
  });

  test(`Hovering on 'Simulation' in the top navigation bar should show the simulation menu`, async () => {
    await expect(plan.navButtonSimulationMenu).not.toBeVisible();
    plan.navButtonSimulation.hover();
    await expect(plan.navButtonSimulationMenu).toBeVisible();
    plan.planTitle.hover();
    await expect(plan.navButtonSimulationMenu).not.toBeVisible();
  });

  test(`Hovering on 'Expansion' in the top navigation bar should show the expansion menu`, async () => {
    await expect(plan.navButtonExpansionMenu).not.toBeVisible();
    plan.navButtonExpansion.hover();
    await expect(plan.navButtonExpansionMenu).toBeVisible();
    plan.planTitle.hover();
    await expect(plan.navButtonExpansionMenu).not.toBeVisible();
  });

  test(`Hovering on 'Scheduling' in the top navigation bar should show the scheduling menu`, async () => {
    await expect(plan.navButtonSchedulingMenu).not.toBeVisible();
    plan.navButtonScheduling.hover();
    await expect(plan.navButtonSchedulingMenu).toBeVisible();
    plan.planTitle.hover();
    await expect(plan.navButtonSchedulingMenu).not.toBeVisible();
  });

  test(`Changing to a new plan should clear the selected activity`, async () => {
    await plan.showPanel('Activity Types');

    // Create an activity which will be auto selected
    await plan.panelActivityTypes.getByRole('button', { name: 'CreateActivity-GrowBanana' }).click();

    // Switch to a new branch and ensure no activity is selected
    await plan.createBranch();
    await expect(plan.panelActivityForm.getByText('No Activity Selected')).toBeVisible();

    // Re-select the activity
    await plan.panelActivityTypes.getByRole('button', { name: 'CreateActivity-GrowBanana' }).click();

    // Switch to parent plan and ensure no activity is selected
    await page.getByRole('link', { name: plans.planName }).click();
    await expect(plan.panelActivityForm.getByText('No Activity Selected')).toBeVisible();

    // Cleanup
    await plan.deleteAllActivities();
  });
});
