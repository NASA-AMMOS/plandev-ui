import test, { expect, type BrowserContext, type Page } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
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

test.describe.serial('Plan Merge', () => {
  const newActivityStartTime: string = '2022-005T00:00:00.000';
  const planBranchName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });

  test('Add an activity to the parent plan', async () => {
    await page.getByRole('button', { name: 'CreateActivity-BiteBanana' }).click();
  });

  test('Create a branch', async ({ baseURL }) => {
    await plan.createBranch(baseURL, planBranchName);
  });

  test('Change the start time of the activity on the branch', async () => {
    await page.getByRole('gridcell', { name: 'BiteBanana' }).first().click();
    await page.waitForSelector('button:has-text("BiteBanana")', { state: 'visible' });
    await page.locator('input[name="start-time"]').click();
    // Wait for date input to be open before inputting a date
    await page.waitForTimeout(500);
    await page.locator('input[name="start-time"]').fill(newActivityStartTime);
    await page.locator('input[name="start-time"]').press('Enter');
    await plan.waitForToast('Activity Directive Updated Successfully');
  });

  test('Create a merge request from branch to parent plan', async () => {
    await page.getByText(planBranchName).first().click();
    await page.getByText('Create merge request').click();
    await page.getByRole('button', { name: 'Create Merge Request' }).click();
    await plan.waitForToast('Merge Request Created Successfully');
  });

  test('Switch to parent plan', async () => {
    await page.getByRole('link', { name: plans.planName }).click();
  });

  test('Start a merge review', async ({ baseURL }) => {
    await page.getByRole('button', { name: '1 incoming, 0 outgoing' }).click();
    await page.getByRole('button', { name: 'Review' }).click();
    await page.waitForURL(`${baseURL}/plans/*/merge`);
    await page.waitForTimeout(250);
  });

  test('Complete the merge review', async ({ baseURL }) => {
    await page.getByRole('button', { name: 'Approve Changes' }).click();
    await page.waitForURL(`${baseURL}/plans/${plans.planId}/merge`);
    await page.waitForTimeout(250);
  });

  test('Make sure the start time of the activity in the parent plan now equals the start time of the activity in branch', async () => {
    await page.getByRole('gridcell', { name: 'BiteBanana' }).first().click();
    await expect(page.locator('input[name="start-time"]')).toHaveValue(newActivityStartTime);
  });
});
