import { expect, test, type BrowserContext, type Page } from '@playwright/test';
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
  constraints = new Constraints(page, models);
  schedulingConditions = new SchedulingConditions(page, models);
  schedulingGoals = new SchedulingGoals(page, models);
  plan = new Plan(page, plans, constraints, schedulingGoals, schedulingConditions);

  await models.goto();
  await models.createModel();
  await plans.goto();
  await plans.createPlan();
});

test.afterAll(async () => {
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
    await plan.createSchedulingGoal(baseURL);
  });

  test('Create scheduling condition from the plan page', async ({ baseURL }) => {
    await plan.createSchedulingCondition(baseURL);
  });

  test('Disabling a scheduling goal should not include that goal in a scheduling run ', async () => {
    await expect(plan.schedulingGoalDifferenceBadge).not.toBeVisible();
    await expect(plan.schedulingGoalEnabledCheckbox).toBeChecked();
    await plan.schedulingGoalEnabledCheckbox.uncheck();
    await expect(plan.schedulingGoalEnabledCheckbox).not.toBeChecked();
    await plan.runScheduling();
    await expect(plan.schedulingGoalDifferenceBadge).not.toBeVisible();
    await plan.schedulingGoalEnabledCheckbox.check();
    await expect(plan.schedulingGoalEnabledCheckbox).toBeChecked();
  });

  test('The condition should prevent showing +10 in the goals badge', async () => {
    await plan.runScheduling();
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

  // TODO: Uncomment after https://github.com/NASA-AMMOS/aerie/issues/633 is fixed.
  // test('Running the same scheduling goal twice in a row should show +0 in that goals badge', async () => {
  //   await expect(plan.schedulingGoalEnabledCheckbox).toBeChecked();
  //   await plan.runScheduling();
  //   await expect(plan.schedulingGoalDifferenceBadge).toHaveText('+10');
  //   await plan.runScheduling();
  //   await expect(plan.schedulingGoalDifferenceBadge).toHaveText('+0');
  // });

  // TODO: Uncomment after https://github.com/NASA-AMMOS/aerie/issues/633 is fixed.
  // test('The list of satisfied activities should not be empty', async () => {
  //   await plan.schedulingGoalExpand.click();
  //   const satisfiedActivitiesCount = await plan.schedulingSatisfiedActivity.count();
  //   expect(satisfiedActivitiesCount).toBeGreaterThan(0);
  // });

  // TODO: Uncomment after https://github.com/NASA-AMMOS/aerie/issues/633 is fixed.
  // test('Running analyze-only should show +0 in that goals badge', async () => {
  //   await expect(plan.schedulingGoalEnabledCheckbox).toBeChecked();
  //   await plan.runAnalysis();
  //   await expect(plan.schedulingGoalDifferenceBadge).toHaveText('+0');
  //   await plan.runAnalysis();
  //   await expect(plan.schedulingGoalDifferenceBadge).toHaveText('+0');
  // });

  test('Delete scheduling goal', async () => {
    await schedulingGoals.deleteSchedulingGoal();
  });
});
