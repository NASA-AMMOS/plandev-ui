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

  await plan.panelActivityTypes.getByRole('button', { name: 'CreateActivity-GrowBanana' }).click();
  await plan.panelActivityDirectivesTable.getByRole('gridcell', { name: 'GrowBanana' }).first().click();

  await plan.panelActivityForm.locator('.parameter-base-number input[type="number"]').fill('2');
  await plan.panelActivityForm.locator('.parameter-base-number input[type="number"]').blur();

  await plan.fillActivityPresetName('Preset 1');

  await plan.panelActivityForm.getByRole('button', { name: 'Enter a unique name for the new preset' }).click();
  await plan.panelActivityForm.locator('.dropdown-header').waitFor({ state: 'detached' });

  await plan.panelActivityForm.locator('.parameter-base-number input[type="number"]').fill('12');
  await plan.panelActivityForm.locator('.parameter-base-number input[type="number"]').blur();

  await plan.fillActivityPresetName('Preset 2');

  await plan.panelActivityForm.getByRole('button', { name: 'Enter a unique name for the new preset' }).click();
  await plan.panelActivityForm.locator('.dropdown-header').waitFor({ state: 'detached' });

  await page.waitForFunction(
    () => document.querySelector('.activity-preset-input-container .selected-display-value')?.innerHTML === 'Preset 2',
  );

  await plan.selectActivityPresetByName('None');

  expect(await plan.panelActivityForm.getByRole('textbox', { name: 'None' })).toBeVisible();
});

test.afterAll(async () => {
  await plans.goto();
  await plans.deletePlan();
  await models.goto();
  await models.deleteModel();
  await page.close();
  await context.close();
});

test.describe.serial('Plan Activity Presets', () => {
  test(`Setting a preset to a directive should update the parameter values`, async () => {
    await plan.selectActivityPresetByName('Preset 1');

    expect(await page.getByRole('textbox', { name: 'Preset 1' })).toBeVisible();
  });

  test(`Removing an activity preset from a directive should reflect that it is no longer present`, async () => {
    await plan.selectActivityPresetByName('None');

    expect(await page.getByRole('textbox', { name: 'None' })).toBeVisible();
  });

  test('Deleting an activity preset should remove it from the list of presets', async () => {
    await plan.selectActivityPresetByName('Preset 1');

    await page.getByRole('button', { name: 'Set Preset' }).click();

    await page.getByRole('button', { name: 'Delete preset' }).waitFor({ state: 'attached' });
    await page.getByRole('button', { name: 'Delete preset' }).click();
    await page.getByRole('button', { name: 'Delete preset' }).waitFor({ state: 'detached' });

    await page.locator('.modal').waitFor({ state: 'attached' });
    await page.locator('.modal').getByRole('button', { name: 'Delete' }).click();

    await page.waitForFunction(
      () => document.querySelector('.activity-preset-input-container .selected-display-value')?.innerHTML === 'None',
    );

    expect(await page.getByRole('textbox', { name: 'None' })).toBeVisible();
  });
});
