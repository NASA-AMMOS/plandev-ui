import test, { expect, type BrowserContext, type Page } from '@playwright/test';
import { Status } from '../../src/enums/status.js';
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
  await models.createModel('', baseURL);
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
    await plan.addActivity('GrowBanana');
    await plan.addActivity('PickBanana');
    await plan.addActivity('ThrowBanana');
    await plan.panelActivityDirectivesTable.getByRole('gridcell', { name: 'PickBanana' }).first().click();
    await plan.panelActivityForm.getByRole('button', { name: 'Is Relative To Another Activity Directive' }).click();
    await plan.selectActivityAnchorByIndex(1);

    await plan.panelActivityDirectivesTable.getByRole('gridcell', { name: 'GrowBanana' }).nth(1).click();
    await plan.panelActivityDirectivesTable.getByRole('button', { name: 'Delete Activity Directive' }).click();
    await page.locator('.modal-content select').nth(1).selectOption('anchor-plan');
    await page.getByRole('button', { name: 'Confirm' }).click();
    await plan.panelActivityDirectivesTable.getByRole('gridcell', { name: 'PickBanana' }).nth(1).click();
    await plan.panelActivityForm.getByRole('button', { name: 'Is Relative To Another Activity Directive' }).click();
    await page.waitForFunction(
      () => document.querySelector('.anchor-form .selected-display-value')?.innerHTML === 'To Plan',
    );

    await plan.panelActivityForm.getByRole('button', { name: 'Is Relative To Another Activity Directive' }).click();
    expect(plan.panelActivityForm.getByRole('textbox', { name: 'To Plan' })).toBeVisible();
  });

  test('Deleting multiple activity directives but only 1 has a remaining anchored dependent should prompt for just the one with a remaining dependent', async () => {
    await plan.addActivity('GrowBanana');
    await plan.addActivity('PickBanana');
    await plan.addActivity('ThrowBanana');
    await plan.panelActivityDirectivesTable.getByRole('gridcell', { name: 'PickBanana' }).first().click();
    await plan.panelActivityForm.getByRole('button', { name: 'Is Relative To Another Activity Directive' }).click();
    await plan.selectActivityAnchorByIndex(1);

    await plan.panelActivityDirectivesTable.getByRole('gridcell', { name: 'ThrowBanana' }).nth(1).click();
    await plan.selectActivityAnchorByIndex(2);

    await plan.panelActivityDirectivesTable.getByRole('gridcell', { name: 'GrowBanana' }).nth(1).click();
    await plan.panelActivityDirectivesTable
      .getByRole('gridcell', { name: 'PickBanana' })
      .nth(1)
      .click({
        modifiers: ['Meta'],
      });
    await plan.panelActivityDirectivesTable.getByRole('gridcell', { name: 'GrowBanana' }).nth(1).click({
      button: 'right',
    });
    await page.getByText('Delete 2 Activity Directives').click();
    await expect(page.locator('.modal-content .anchor-item')).toHaveCount(1);
    await page.locator('.modal-content select').nth(1).selectOption('anchor-root');
    await page.getByRole('button', { name: 'Confirm' }).click();
  });

  test('Setting an input path successfully uploads the corresponding file', async () => {
    await plan.addActivity('LineCount');

    await page.locator('input[type="file"]').click();
    await page.locator('input[type="file"]').setInputFiles('./e2e-tests/data/valid-view.json');

    const errorBadge = await page.locator('.input-error-badge-root');

    expect(errorBadge).not.toBeAttached();
  });

  test('Activity validation is run when activities are changed and is resolvable', async () => {
    await plan.waitForActivityCheckingStatus(Status.Complete);
    await plan.navButtonActivityChecking.hover();
    await expect(plan.navButtonActivityCheckingMenu).toContainText('0/0 activities checked');
    await expect(plan.navButtonActivityCheckingMenu).toContainText('No problems detected');
    await plan.addActivity('GrowBanana');
    await plan.addActivity('GrowBanana');
    await plan.waitForActivityCheckingStatus(Status.Complete);
    await plan.navButtonActivityChecking.hover();
    await expect(plan.navButtonActivityCheckingMenu).toContainText('2/2 activities checked');
    await expect(plan.navButtonActivityCheckingMenu).toContainText('No problems detected');
    await plan.addActivity('BakeBananaBread');
    await plan.waitForActivityCheckingStatus(Status.Failed);
    await plan.navButtonActivityChecking.hover();
    await expect(plan.navButtonActivityCheckingMenu).toContainText('3/3 activities checked');
    await expect(plan.navButtonActivityCheckingMenu).toContainText('1 activity has problems');
    await expect(plan.navButtonActivityCheckingMenu).toContainText('2 missing parameters');
    await plan.navButtonActivityCheckingMenu.getByRole('button', { name: 'View in console' }).click();
    await plan.consoleContainer.getByRole('gridcell', { name: 'BakeBananaBread' }).first().click();
    const tbSugar = await plan.panelActivityForm.locator('.parameter', { hasText: 'tbSugar' }).locator('input');
    await tbSugar.fill('100');
    await tbSugar.evaluate(e => e.blur());
    await plan.panelActivityForm.locator('.parameter', { hasText: 'glutenFree' }).getByRole('checkbox').check();
    await plan.waitForActivityCheckingStatus(Status.Complete);
    await plan.navButtonActivityChecking.hover();
    await expect(plan.navButtonActivityCheckingMenu).toContainText('3/3 activities checked');
    await expect(plan.navButtonActivityCheckingMenu).toContainText('No problems detected');
  });
});
