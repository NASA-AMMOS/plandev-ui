import test, { expect, type BrowserContext, type Page } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { Constraints } from '../fixtures/Constraints.js';
import { Models } from '../fixtures/Models.js';
import { PanelNames, Plan } from '../fixtures/Plan.js';
import { Plans } from '../fixtures/Plans.js';
import { SchedulingConditions } from '../fixtures/SchedulingConditions.js';
import { SchedulingGoals } from '../fixtures/SchedulingGoals.js';

let constraints: Constraints;
let context: BrowserContext;
let models: Models;
let modelA: string;
let modelB: string;
let modelC: string;
let page: Page;
let plan: Plan;
let plans: Plans;
let schedulingConditions: SchedulingConditions;
let schedulingGoals: SchedulingGoals;

test.beforeAll(async ({ browser, baseURL }) => {
  context = await browser.newContext();
  page = await context.newPage();

  models = new Models(page);
  plans = new Plans(page, models);
  constraints = new Constraints(page);
  schedulingConditions = new SchedulingConditions(page);
  schedulingGoals = new SchedulingGoals(page);
  plan = new Plan(page, plans, constraints, schedulingGoals, schedulingConditions);

  await models.goto();
  modelA = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  modelB = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  modelC = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  await models.createModel(baseURL, modelA, 'e2e-tests/data/model-migration-1.jar');
  await models.goto();
  await models.createModel(baseURL, modelB, 'e2e-tests/data/model-migration-1.jar');
  await models.goto();
  await models.createModel(baseURL, modelC, 'e2e-tests/data/model-migration-2.jar');
  await plans.goto();
  await plans.createPlan(plans.planName, modelA);
  await plan.goto();
  await plan.addActivity('BakeBananaBread');
  await plan.addActivity('BiteBanana');
  await plan.addActivity('ChangeProducer');
  await plan.addActivity('GrowBanana');
  await plan.addActivity('LineCount');
  await plan.addActivity('PeelBanana');
  await plan.addActivity('PickBanana');
});

test.afterAll(async () => {
  await plan.deleteAllActivities();
  await plans.goto();
  await plans.deletePlan();
  await models.goto();
  await models.deleteModel(modelA);
  await models.deleteModel(modelB);
  await models.deleteModel(modelC);
  await page.close();
  await context.close();
});

test.describe.serial('Plan Model Migration', () => {
  test('Mission model migration modal can be opened', async () => {
    await plan.showChangeModelModal();
  });
  test('ModelB and ModelC are options for migration', async () => {
    await plan.changeMissionModelFilter.fill(modelB);
    await expect(plan.changeMissionModelTableRows.getByRole('row', { name: modelB })).toBeVisible({ timeout: 10000 });
    expect(await plan.changeMissionModelTableRows.getByRole('row', { name: modelB }).count()).toBe(1);
    await plan.changeMissionModelFilter.fill(modelC);
    await expect(plan.changeMissionModelTableRows.getByRole('row', { name: modelC })).toBeVisible({ timeout: 10000 });
    expect(await plan.changeMissionModelTableRows.getByRole('row', { name: modelC }).count()).toBe(1);
  });
  test('ModelB has no expected incompatibilities', async () => {
    await plan.changeMissionModelFilter.fill(modelB);
    await plan.changeMissionModelTableRows.getByRole('row', { name: modelB }).click();
    await expect(plan.changeMissionModelModal).toContainText('No expected incompatibilities');
  });
  test('ModelC has expected incompatibilities', async () => {
    await plan.changeMissionModelFilter.fill(modelC);
    await plan.changeMissionModelTableRows.getByRole('row', { name: modelC }).click();
    await expect(plan.changeMissionModelModal).toContainText('7 incompatible activity directives');
    await expect(plan.changeMissionModelModal).toContainText('7 Modified Activity Types');
  });
  test('Can migrate to ModelC', async () => {
    await plan.changeMissionModelMigrateButton.click();
    await plan.waitForToast('Model Migration Success');
  });
  test('Plan has the expected number of validation errors', async () => {
    await expect(page.getByRole('tab', { name: 'Activity Validation Errors' })).toHaveText('3');
  });
  test('BakeBananaBread temperature parameter is a struct', async () => {
    await plan.showPanel(PanelNames.SELECTED_ACTIVITY);
    await plan.panelActivityDirectivesTable.getByRole('row', { name: 'BakeBananaBread' }).first().click();
    await expect(page.getByRole('group', { name: 'temperature-collapse' })).toBeAttached();
  });
  test('Can migrate back to ModelB', async () => {
    await plan.showChangeModelModal();
    await plan.changeMissionModelFilter.fill(modelB);
    await expect(plan.changeMissionModelTableRows.getByRole('row', { name: modelB })).toBeVisible({ timeout: 10000 });
    expect(await plan.changeMissionModelTableRows.getByRole('row', { name: modelB }).count()).toBe(1);
    await plan.changeMissionModelTableRows.getByRole('row', { name: modelB }).click();
    await plan.changeMissionModelMigrateButton.click();
    await plan.waitForToast('Model Migration Success');
    await expect(page.getByRole('tab', { name: 'Activity Validation Errors' })).toHaveText('3');
    await expect(page.getByLabel('temperature', { exact: true })).toBeAttached();
  });
});
