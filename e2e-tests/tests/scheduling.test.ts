import { expect, test, type Page } from '@playwright/test';
import { Constraints } from '../fixtures/Constraints.js';
import { Models } from '../fixtures/Models.js';
import { Plan } from '../fixtures/Plan.js';
import { Plans } from '../fixtures/Plans.js';
import { SchedulingGoals } from '../fixtures/SchedulingGoals.js';

let constraints: Constraints;
let models: Models;
let page: Page;
let plan: Plan;
let plans: Plans;
let schedulingGoals: SchedulingGoals;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();

  models = new Models(page);
  plans = new Plans(page, models);
  constraints = new Constraints(page, models);
  schedulingGoals = new SchedulingGoals(page, models);
  plan = new Plan(page, plans, constraints, schedulingGoals);

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
});

test.describe.serial('Scheduling', () => {
  test('Navigate to the plan page and show the scheduling layout', async () => {
    await plan.goto();
    await plan.showSchedulingLayout();
  });

  test('Create scheduling goal from the plan page', async ({ baseURL }) => {
    await plan.createSchedulingGoal(baseURL);
  });

  test('Disabling a scheduling goal should not include that goal in a scheduling run ', async () => {
    await expect(plan.schedulingGoalDifferenceBadge).not.toBeVisible();
    await expect(plan.schedulingGoalEnabledCheckbox).toBeChecked();
    await plan.schedulingGoalEnabledCheckbox.uncheck();
    await expect(plan.schedulingGoalEnabledCheckbox).not.toBeChecked();
    await plan.runScheduling();
    await expect(plan.schedulingGoalDifferenceBadge).not.toBeVisible();
    await plan.schedulingGoalEnabledCheckbox.check();
  });

  test('Running the same scheduling goal twice in a row should show +0 in that goals badge', async () => {
    await expect(plan.schedulingGoalEnabledCheckbox).toBeChecked();
    await plan.runScheduling();
    await expect(plan.schedulingGoalDifferenceBadge).toHaveText('+10');
    await plan.runScheduling();
    await expect(plan.schedulingGoalDifferenceBadge).toHaveText('+0');
  });

  test('Running analyze-only should show +0 in that goals badge', async () => {
    await expect(plan.schedulingGoalEnabledCheckbox).toBeChecked();
    await plan.runAnalysis();
    await expect(plan.schedulingGoalDifferenceBadge).toHaveText('+0');
    await plan.runAnalysis();
    await expect(plan.schedulingGoalDifferenceBadge).toHaveText('+0');
  });

  test('Delete scheduling goal', async () => {
    await schedulingGoals.deleteSchedulingGoal();
  });
});
