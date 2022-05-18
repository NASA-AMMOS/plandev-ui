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
  test('Running the same scheduling goal twice in a row should show +0 in that goals badge', async () => {
    await plan.showSchedulingLayout();
    const goalName = 'Recurrence Goal';
    const goalDescription = 'Add a BakeBananaBread activity every 12 hours';
    const goalDefinition = `export default (): Goal => Goal.ActivityRecurrenceGoal({ activityTemplate: ActivityTemplates.BakeBananaBread({ temperature: 325.0, tbSugar: 2, glutenFree: false }), interval: 12 * 60 * 60 * 1000 * 1000 })`;
    await plan.createSchedulingGoal(goalName, goalDescription, goalDefinition);
    await plan.runScheduling();
    await expect(plan.schedulingGoalDifferenceBadge).toHaveText('+10');
    await plan.runScheduling();
    await expect(plan.schedulingGoalDifferenceBadge).toHaveText('+0');
  });
});
