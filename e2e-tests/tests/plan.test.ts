import test, { expect, type BrowserContext, type Page } from '@playwright/test';
import { Constraints } from '../fixtures/Constraints.js';
import { Models } from '../fixtures/Models.js';
import { PanelNames, Plan } from '../fixtures/Plan.js';
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

test.beforeAll(async ({ baseURL, browser }) => {
  context = await browser.newContext();
  page = await context.newPage();

  models = new Models(page);
  plans = new Plans(page, models);
  constraints = new Constraints(page);
  schedulingConditions = new SchedulingConditions(page);
  schedulingGoals = new SchedulingGoals(page);
  plan = new Plan(page, plans, constraints, schedulingGoals, schedulingConditions);

  await models.goto();
  await models.createModel(baseURL);
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
    await plan.showPanel(PanelNames.CONSTRAINTS);
    await expect(plan.panelConstraints).toBeVisible();
  });

  test(`Clicking on 'Expansion' in the grid menu should show the expansion panel`, async () => {
    await expect(plan.panelExpansion).not.toBeVisible();
    await plan.showPanel(PanelNames.EXPANSION);
    await expect(plan.panelExpansion).toBeVisible();
  });

  test(`Clicking on 'Plan Metadata' in the grid menu should show the plan metadata panel`, async () => {
    await expect(plan.panelPlanMetadata).not.toBeVisible();
    await plan.showPanel(PanelNames.PLAN_METADATA);
    await expect(plan.panelPlanMetadata).toBeVisible();
  });

  test(`Clicking on 'Scheduling Goals' in the grid menu should show the scheduling goals panel`, async () => {
    await expect(plan.panelSchedulingGoals).not.toBeVisible();
    await plan.showPanel(PanelNames.SCHEDULING_GOALS);
    await expect(plan.panelSchedulingGoals).toBeVisible();
  });

  test(`Clicking on 'Scheduling Conditions' in the grid menu should show the scheduling conditions panel`, async () => {
    await expect(plan.panelSchedulingConditions).not.toBeVisible();
    await plan.showPanel(PanelNames.SCHEDULING_CONDITIONS);
    await expect(plan.panelSchedulingConditions).toBeVisible();
  });

  test(`Clicking on 'Simulation' in the grid menu should show the simulation panel`, async () => {
    await expect(plan.panelSimulation).not.toBeVisible();
    await plan.showPanel(PanelNames.SIMULATION);
    await expect(plan.panelSimulation).toBeVisible();
  });

  test(`Clicking on 'Timeline Editor' in the grid menu should show the timeline editor panel`, async () => {
    await expect(plan.panelTimelineEditor).not.toBeVisible();
    await plan.showPanel(PanelNames.TIMELINE_EDITOR);
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

  test(`Changing to a new plan should clear the selected activity`, async ({ baseURL }) => {
    await plan.showPanel(PanelNames.TIMELINE_ITEMS);

    // Create an activity which will be auto selected
    await plan.addActivity('GrowBanana');

    // Switch to a new branch and ensure no activity is selected
    await plan.createBranch(baseURL);
    await expect(plan.panelActivityForm.getByText('No Activity Selected')).toBeVisible();

    // Wait for new activities to swap in
    await page.waitForTimeout(1000);
    // TODO would ideally do this without a timeout

    // Re-select the activity
    await plan.addActivity('GrowBanana');

    const branchPlanUrlRegex = new RegExp(`${baseURL}/plans/(?<planId>\\d+)`);
    const matches = page.url().match(branchPlanUrlRegex);
    expect(matches).not.toBeNull();

    let currentPlanId = 'foo';
    if (matches) {
      const { groups: { planId } = {} } = matches;
      currentPlanId = planId;
    }

    // Switch to parent plan and ensure no activity is selected
    await page.getByRole('link', { name: plans.planName }).click();

    // wait for page to navigate to parent plan
    const parentPlanUrlRegex = new RegExp(`${baseURL}/plans/((?!${currentPlanId}).)*`);
    await page.waitForURL(parentPlanUrlRegex);

    await expect(plan.panelActivityForm.getByText('No Activity Selected')).toBeVisible();

    // Cleanup
    await plan.deleteAllActivities();
  });
});
