import { test, type BrowserContext, type Page } from '@playwright/test';
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
});

test.afterAll(async () => {
  await plans.goto();
  await plans.deletePlan();
  await models.goto();
  await models.deleteModel();
  await page.close();
  await context.close();
});

test.describe.serial('Constraints', () => {
  test('Navigate to the plan page and show the constraints layout', async () => {
    await plan.goto();
    await plan.showConstraintsLayout();
  });

  test('Create constraint from the plan page', async ({ baseURL }) => {
    await plan.createConstraint(baseURL);
  });

  test('Delete constraint', async () => {
    await constraints.deleteConstraint();
  });
});
