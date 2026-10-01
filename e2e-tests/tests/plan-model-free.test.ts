import test, { expect } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { Constraints } from '../fixtures/Constraints.js';
import { PanelNames, Plan } from '../fixtures/Plan.js';
import { SchedulingConditions } from '../fixtures/SchedulingConditions.js';
import { SchedulingGoals } from '../fixtures/SchedulingGoals.js';
import { setupTest, teardownTest, type ModelSetupResult } from '../utilities/api.js';

const modelFreePlanFile = 'e2e-tests/data/banana-readonly-plan-export.json';

let setup: ModelSetupResult;

test.beforeAll(async ({ browser }) => {
  setup = await setupTest(browser, { plan: false });
});

test.afterAll(async () => {
  await teardownTest(setup);
});

test.describe.serial('Model free plan creation', () => {
  const modelFreePlanName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });

  test.beforeAll(async () => {
    await setup.plans.goto();
    await setup.plans.importButton.click();
    await setup.plans.fillInputFile(modelFreePlanFile);
  });

  test.afterAll(async () => {
    const modelFreePlanId = await setup.plans.getPlanId(modelFreePlanName);
    if (modelFreePlanId) {
      await setup.api.deletePlan(Number(modelFreePlanId));
    }
  });

  test('uploads a model free plan and disables import and time fields', async () => {
    await expect(setup.page.getByText('Model provided by read-only plan')).toBeVisible();
    await expect(setup.plans.inputButtonModel).not.toBeVisible();
    await expect(setup.plans.inputStartTime).toBeDisabled();
    await expect(setup.plans.inputEndTime).toBeDisabled();

    await setup.plans.fillInputName(modelFreePlanName);

    await expect(setup.plans.createButton).toBeEnabled();
    await setup.plans.createButton.click();

    await setup.plans.filterTable(modelFreePlanName);
    await expect(setup.plans.tableRow(modelFreePlanName)).toBeVisible();
  });

  test('readonly plans cannot have their model or time range edited', async () => {
    await setup.plans.filterTable(modelFreePlanName);

    await setup.plans.tableRow(modelFreePlanName).click();

    // Model input should be hidden for read-only plans
    await expect(setup.page.getByText('Model free plan')).toBeVisible();

    // Time range change button should be disabled for read-only plans
    await expect(setup.page.getByRole('button', { name: 'Change plan time range' })).toBeDisabled();
  });
});

test.describe.serial('Model free plan viewing', () => {
  const modelFreePlanName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  let plan: Plan;
  let modelFreePlanId: number | null = null;

  test.beforeAll(async () => {
    modelFreePlanId = await setup.api.importPlan(modelFreePlanFile, modelFreePlanName);
    const constraints = new Constraints(setup.page);
    const schedulingConditions = new SchedulingConditions(setup.page);
    const schedulingGoals = new SchedulingGoals(setup.page);
    plan = new Plan(setup.page, setup.plans, constraints, schedulingGoals, schedulingConditions, modelFreePlanName);
    await plan.goto(`${modelFreePlanId}`);
  });

  test.afterAll(async () => {
    if (modelFreePlanId) {
      await setup.api.deletePlan(modelFreePlanId);
    }
  });

  test('should not be able to add activities to a model free plan', async () => {
    const addActivityButton = await plan.page.getByRole('button', { name: 'Add Activity' });
    await addActivityButton.scrollIntoViewIfNeeded();
    await addActivityButton.click();
    await expect(setup.page.getByText('Activity Directive Builder')).not.toBeVisible();
  });

  test('should not be able to upload activities to a model free plan', async () => {
    await expect(plan.page.getByRole('button', { exact: true, name: 'Upload' })).not.toBeVisible();
    const uploadActivitiesButton = await plan.page.getByRole('button', { exact: true, name: 'Upload Activities' });
    await expect(uploadActivitiesButton).toBeVisible();
    await uploadActivitiesButton.scrollIntoViewIfNeeded();
    await uploadActivitiesButton.click();
    await expect(plan.page.getByRole('button', { exact: true, name: 'Upload' })).not.toBeVisible();
  });

  test('should not be able to change the model of a model free plan', async () => {
    await plan.showPanel(PanelNames.PLAN_METADATA);
    await expect(plan.page.getByText('Model free plan')).toBeVisible();
  });

  test('should not be able to change the time range of a model free plan', async () => {
    await plan.showPanel(PanelNames.PLAN_METADATA);
    await expect(plan.page.getByRole('button', { name: 'Change plan time range' })).toBeVisible();
    await expect(plan.page.getByRole('button', { name: 'Change plan time range' })).toBeDisabled();
  });
});
