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

test.describe.serial('Plan Resources', () => {
  test('Uploading external plan dataset file - JSON', async () => {
    await plan.uploadExternalDatasets('e2e-tests/data/external-dataset.json');
    await expect(plan.panelActivityTypes.getByText('/awake')).toBeVisible();
    await expect(plan.panelActivityTypes.getByText('/batteryEnergy')).toBeVisible();
  });

  test('Uploading external plan dataset file - CSV', async () => {
    await plan.uploadExternalDatasets('e2e-tests/data/external-dataset.csv');
    await expect(plan.panelActivityTypes.getByText('TotalPower')).toBeVisible();
    await expect(plan.panelActivityTypes.getByText('BatteryStateOfCharge')).toBeVisible();
    await expect(plan.panelActivityTypes.getByText('Temperature')).toBeVisible();
  });
});
