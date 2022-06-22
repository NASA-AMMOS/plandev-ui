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

test.describe.serial('Plan', () => {
  test('Error page should not be visible, and the plan title should be visible in the top navigation bar', async () => {
    await expect(plan.appError).not.toBeVisible();
    await expect(plan.planTitle(plans.planName)).toBeVisible();
  });

  test('Initially the View layout should be displayed', async () => {
    await expect(plan.activityFormComponent).toBeVisible();
    await expect(plan.activityTableComponent).toBeVisible();
    await expect(plan.activityTypesComponent).toBeVisible();
    await expect(plan.timelineComponent).toBeVisible();
    await expect(plan.viewNavButton).toHaveClass(/selected/);
  });
});
