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

test.afterEach(async () => {
  await plan.deleteAllActivities();
});

test.afterAll(async () => {
  await plans.goto();
  await plans.deletePlan();
  await models.goto();
  await models.deleteModel();
  await page.close();
  await context.close();
});

test.describe.serial('Plan Activities', () => {
  test('Deleting an activity directive with another directive anchored to it should and selecting re-anchor to plan should re-anchor to plan', async () => {
    await page.getByRole('button', { name: 'CreateActivity-GrowBanana' }).click();
    await page.getByRole('button', { name: 'CreateActivity-PickBanana' }).click();
    await page.getByRole('button', { name: 'CreateActivity-ThrowBanana' }).click();
    await page.getByRole('gridcell', { name: 'PickBanana' }).first().click();
    await page.locator('summary').filter({ hasText: 'Anchor' }).click();
    const firstOptionValue = await page.evaluate(
      () => (document.getElementById('anchors') as HTMLDataListElement).options[1].value,
    );
    await page.getByRole('combobox', { name: 'null' }).fill(firstOptionValue);
    await page.getByRole('gridcell', { name: 'GrowBanana' }).nth(1).click();
    await page.getByRole('button', { name: 'Delete Activity Directive' }).click();
    await page.locator('.modal-content select').nth(1).selectOption('anchor-plan');
    await page.getByRole('button', { name: 'Confirm' }).click();
    await page.getByRole('gridcell', { name: 'PickBanana' }).nth(1).click();
    await page.locator('summary').filter({ hasText: 'Anchor' }).click();
    const anchorValue = await page.evaluate(
      () => (document.querySelector('input[list][name="anchor_id"]') as HTMLInputElement).value,
    );
    expect(anchorValue).toEqual('To Plan');
  });

  test('Deleting multiple activity directives but only 1 has a remaining anchored dependent should prompt for just the one with a remaining dependent', async () => {
    await page.getByRole('button', { name: 'CreateActivity-GrowBanana' }).click();
    await page.getByRole('button', { name: 'CreateActivity-PickBanana' }).click();
    await page.getByRole('button', { name: 'CreateActivity-ThrowBanana' }).click();
    await page.getByRole('gridcell', { name: 'PickBanana' }).first().click();
    await page.locator('summary').filter({ hasText: 'Anchor' }).click();
    const firstOptionValue = await page.evaluate(
      () => (document.getElementById('anchors') as HTMLDataListElement).options[1].value,
    );
    await page.getByRole('combobox', { name: 'null' }).fill(firstOptionValue);
    await page.getByRole('gridcell', { name: 'ThrowBanana' }).nth(1).click();
    await page.locator('summary').filter({ hasText: 'Anchor' }).click();
    const secondOptionValue = await page.evaluate(
      () => (document.getElementById('anchors') as HTMLDataListElement).options[2].value,
    );
    await page.getByRole('combobox', { name: 'null' }).fill(secondOptionValue);
    await page.getByRole('combobox', { name: 'null' }).click();
    await page.getByRole('gridcell', { name: 'GrowBanana' }).nth(1).click();
    await page
      .getByRole('gridcell', { name: 'PickBanana' })
      .nth(1)
      .click({
        modifiers: ['Meta'],
      });
    await page.getByRole('gridcell', { name: 'GrowBanana' }).nth(1).click({
      button: 'right',
    });
    await page.getByText('Delete 2 Activity Directives').click();
    await expect(page.locator('.modal-content .anchor-item')).toHaveCount(1);
    await page.locator('.modal-content select').nth(1).selectOption('anchor-root');
    await page.getByRole('button', { name: 'Confirm' }).click();
  });
});
