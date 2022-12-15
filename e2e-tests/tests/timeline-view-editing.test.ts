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

test.describe.serial('Timeline View Editing', () => {
  const newActivityStartTime: string = '2022-005T00:00:00.000';

  test('Add an activity to the parent plan', async () => {
    await plan.showPanel('Activity Types');
    await page.getByRole('button', { name: 'CreateActivity-PickBanana' }).click();
  });

  test('Change the start time of the activity', async () => {
    await page.getByRole('gridcell', { name: 'PickBanana' }).click();
    await plan.showPanel('Selected Activity');
    await page.locator('input[name="start-time"]').first().click();
    await page.locator('input[name="start-time"]').first().fill(newActivityStartTime);
    await page.locator('input[name="start-time"]').first().press('Enter');
  });

  test('Add a vertical guide', async () => {
    await plan.showPanel('Timeline Editor');
    const existingGuideCount = await page.locator('.guide').count();
    await page.getByRole('button', { name: 'New Vertical Guide' }).click();
    const newGuideCount = await page.locator('.guide').count();
    expect(newGuideCount - existingGuideCount).toEqual(1);
  });

  test('Remove a vertical guide', async () => {
    const existingGuideCount = await page.locator('.guide').count();
    await page.getByRole('button', { name: 'Delete Guide' }).last().click();
    const newGuideCount = await page.locator('.guide').count();
    await expect(newGuideCount - existingGuideCount).toEqual(-1);
  });

  test('Add a row', async () => {
    const existingRowCount = await page.locator('.timeline-row').count();
    await page.getByRole('button', { name: 'New Row' }).click();
    const newRowCount = await page.locator('.timeline-row').count();
    await expect(newRowCount - existingRowCount).toEqual(1);
  });

  test('Delete a row', async () => {
    const existingRowCount = await page.locator('.timeline-row').count();

    // Click on delete button of last row
    await page.locator('.timeline-row').last().locator("button[aria-label='Delete Row']").click();

    // Confirm deletion of row in modal
    await page.locator('#svelte-modal').getByRole('button', { name: 'Delete' }).click();

    const newRowCount = await page.locator('.timeline-row').count();
    await expect(newRowCount - existingRowCount).toEqual(-1);
  });

  test('Edit a row', async () => {
    // Click on edit button of last row
    await page.locator('.timeline-row').last().locator("button[aria-label='Edit Row']").click();

    // Look for back button indicating that the row editor is active
    await expect(page.locator('.section-back-button ').first()).toBeDefined();

    // TODO fill out this test more when layer editing is possible so that
    // rows can be constructed properly without relying on existing rows from the dummy model
  });
});
