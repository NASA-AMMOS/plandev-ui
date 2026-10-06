import test, { expect } from '@playwright/test';
import { Buffer } from 'buffer';
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

    const legacyPlan = {
      end_time: '2022-006T00:00:00',
      name: 'Legacy plan',
      start_time: '2022-001T00:00:00',
    };
    await setup.plans.inputFile.setInputFiles({
      buffer: Buffer.from(JSON.stringify(legacyPlan)),
      mimeType: 'application/json',
      name: 'legacy-plan.json',
    });
    await expect(setup.plans.inputButtonModel).toBeVisible();
    await expect(setup.plans.inputStartTime).toBeEnabled();
    await setup.plans.selectInputModel();

    await setup.plans.fillInputFile(modelFreePlanFile);
    await expect(setup.plans.inputButtonModel).not.toBeVisible();
    await expect(setup.plans.modelStatus).not.toBeVisible();

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
    await expect(setup.page.getByRole('textbox', { name: 'Model' })).toHaveValue('Model-free plan');

    // The Plans page hides the time-range action for permanently read-only plans.
    await expect(setup.page.getByRole('button', { name: 'Change plan time range' })).not.toBeVisible();
  });
});

test.describe.serial('Model free plan viewing', () => {
  const modelFreePlanName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  let plan: Plan;
  let modelFreePlanId: number | null = null;

  test.beforeAll(async () => {
    modelFreePlanId = await setup.api.importPlan(modelFreePlanFile, modelFreePlanName);
    await setup.api.waitForPlanImport(modelFreePlanId);
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

  test('finishes importing and lists the imported resources', async () => {
    await expect(plan.page.getByText('Import in progress')).not.toBeVisible();
    await expect(plan.page.getByText('Plan import failed')).not.toBeVisible();
    await plan.panelActivityTypes.getByRole('tab', { exact: true, name: 'Resources' }).click();
    await expect(plan.panelActivityTypes.getByText('/battery/state_of_charge')).toBeVisible();
    await expect(plan.panelActivityTypes.getByText('/camera/mode')).toBeVisible();
    await plan.panelActivityTypes.getByRole('tab', { exact: true, name: 'Activities' }).click();
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
    await expect(plan.page.getByText('Model-free plan')).toBeVisible();
  });

  test('should not be able to change the time range of a model free plan', async () => {
    await plan.showPanel(PanelNames.PLAN_METADATA);
    await expect(plan.page.getByRole('button', { name: 'Change plan time range' })).toBeVisible();
    await expect(plan.page.getByRole('button', { name: 'Change plan time range' })).toBeDisabled();
  });
});

test.describe.serial('Failed plan import', () => {
  const failedPlanName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  let importedModelId: number | null = null;
  let importedPlanId: number | null = null;
  let plan: Plan;

  test.beforeAll(async () => {
    // The file has an unparseable activity start_offset, which fails after the Gateway has accepted the import
    const response = await setup.api.importPlanTransfer('e2e-tests/data/plan-import-bad-interval.json', failedPlanName);
    importedModelId = response.model_id;
    importedPlanId = response.plan_id;
    const constraints = new Constraints(setup.page);
    const schedulingConditions = new SchedulingConditions(setup.page);
    const schedulingGoals = new SchedulingGoals(setup.page);
    plan = new Plan(setup.page, setup.plans, constraints, schedulingGoals, schedulingConditions, failedPlanName);
  });

  test.afterAll(async () => {
    if (importedPlanId) {
      await setup.api.deletePlan(importedPlanId);
    }
    if (importedModelId) {
      await setup.api.deleteModel(importedModelId);
    }
  });

  test('shows the failure in the plans list', async () => {
    await setup.plans.goto();
    await setup.plans.filterTable(failedPlanName);
    await expect(setup.plans.tableRow(failedPlanName)).toBeVisible();
    // The failure is flagged by a warning icon whose tooltip carries the message
    await setup.plans
      .tableRow(failedPlanName)
      .getByRole('img', { name: 'Import failed: select plan for details' })
      .hover();
    await expect(setup.page.getByText('Import failed: select plan for details').first()).toBeVisible();
  });

  test('shows the failure reason and keeps the plan read-only', async () => {
    await plan.goto(`${importedPlanId}`);
    await expect(plan.page.getByText('Import failed invalid input syntax for type interval').first()).toBeVisible();
    await plan.page.getByRole('button', { name: 'Add Activity' }).click();
    await expect(setup.page.getByText('Activity Directive Builder')).not.toBeVisible();
  });
});
