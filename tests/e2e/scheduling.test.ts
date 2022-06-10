import { expect, test, type Page } from '@playwright/test';
import { Models } from '../fixtures/Models.js';
import { Plan } from '../fixtures/Plan.js';
import { Plans } from '../fixtures/Plans.js';

let page: Page;
let models: Models;
let plan: Plan;
let plans: Plans;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();

  models = new Models(page);
  plans = new Plans(page);
  plan = new Plan(page);

  await models.goto();
  await models.createModel();
  await plans.goto();
  await plans.createPlan(models.modelName);
  await plan.goto(plans.planId);
});

test.afterAll(async () => {
  await plans.goto();
  await plans.deletePlan();
  await models.goto();
  await models.deleteModel();
  await page.close();
});

test.describe.serial('Scheduling', () => {
  test('Create scheduling goal', async () => {
    await plan.showSchedulingLayout();
    await plan.createSchedulingGoal();
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
});
