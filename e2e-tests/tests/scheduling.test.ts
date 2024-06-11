import test, { expect, type BrowserContext, type Page } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { Status } from '../../src/enums/status.js';
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
const goalName1: string = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
const goalName2: string = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });

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
});

test.afterAll(async () => {
  await plan.deleteAllActivities();
  await plans.goto();
  await plans.deletePlan();
  await models.goto();
  await models.deleteModel();
  await page.close();
  await context.close();
});

test.describe.serial('Scheduling', () => {
  test('Navigate to the plan page and show the scheduling layout', async () => {
    await plan.goto();
    await plan.showSchedulingLayout();
  });

  test('Create scheduling goal from the plan page', async ({ baseURL }) => {
    await plan.createSchedulingGoal(baseURL, goalName1);
  });

  test('Create scheduling condition from the plan page', async ({ baseURL }) => {
    await plan.createSchedulingCondition(baseURL);
  });

  test('Disabling a scheduling goal should not include that goal in a scheduling run ', async ({ baseURL }) => {
    // Create a second scheduling goal so that when the first goal is disabled, analysis and scheduling buttons are still enabled
    await plan.createSchedulingGoal(baseURL, goalName2);
    await expect(plan.schedulingGoalDifferenceBadge).not.toBeVisible();
    await expect(plan.schedulingGoalEnabledCheckboxSelector(goalName1)).toBeChecked();
    await plan.schedulingGoalEnabledCheckboxSelector(goalName1).uncheck();
    await expect(plan.schedulingGoalEnabledCheckboxSelector(goalName1)).not.toBeChecked();
    await plan.runScheduling(Status.Failed);
    await expect(plan.schedulingGoalDifferenceBadge).not.toBeVisible();
    await plan.schedulingGoalEnabledCheckboxSelector(goalName1).check();
    await expect(plan.schedulingGoalEnabledCheckboxSelector(goalName1)).toBeChecked();
  });

  test('The condition should prevent showing +10 in the goals badge', async () => {
    await plan.runScheduling(Status.Failed);
    await expect(plan.schedulingGoalDifferenceBadge).toHaveText('+0');
  });

  test('Disabling a scheduling condition should not include that condition in a scheduling run ', async () => {
    await expect(plan.schedulingConditionEnabledCheckbox).toBeChecked();
    await plan.schedulingConditionEnabledCheckbox.uncheck();
    await expect(plan.schedulingConditionEnabledCheckbox).not.toBeChecked();
    await plan.runScheduling();
    await expect(plan.schedulingGoalDifferenceBadge).toHaveText('+10');
    await plan.deleteAllActivities();
    await plan.showSchedulingLayout();
  });

  test('Running the same scheduling goal twice in a row should show +0 in that goals badge', async () => {
    await expect(plan.schedulingGoalEnabledCheckboxSelector(goalName1)).toBeChecked();
    await plan.runScheduling();
    await expect(plan.schedulingGoalDifferenceBadge).toHaveText('+10');
    await plan.runScheduling();
    await expect(plan.schedulingGoalDifferenceBadge).toHaveText('+0');
  });

  test('The list of satisfied activities should not be empty', async () => {
    await plan.schedulingGoalExpand.click();
    const satisfiedActivitiesCount = await plan.schedulingSatisfiedActivity.count();
    expect(satisfiedActivitiesCount).toBeGreaterThan(0);
  });

  test('Running analyze-only should show +0 in that goals badge', async () => {
    await expect(plan.schedulingGoalEnabledCheckboxSelector(goalName1)).toBeChecked();
    await plan.runAnalysis();
    await expect(plan.schedulingGoalDifferenceBadge).toHaveText('+0');
    await plan.runAnalysis();
    await expect(plan.schedulingGoalDifferenceBadge).toHaveText('+0');
  });

  test('Modifying the plan should result in scheduling status marked as out of date', async () => {
    await plan.showPanel(PanelNames.ACTIVITY_TYPES);
    await plan.panelActivityTypes.getByRole('button', { name: 'CreateActivity-GrowBanana' }).click();
    await plan.showPanel(PanelNames.SCHEDULING_GOALS);
    await plan.waitForSchedulingStatus(Status.Modified);
  });

  test('Delete scheduling goal', async () => {
    await plan.removeSchedulingGoal(goalName1);
    await schedulingGoals.deleteSchedulingGoal(goalName1);
  });
});
