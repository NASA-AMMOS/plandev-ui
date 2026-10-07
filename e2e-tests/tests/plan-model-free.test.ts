import test, { expect } from '@playwright/test';
import { Buffer } from 'buffer';
import { readFileSync } from 'fs';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import type { PlanTransferResponse } from '../../src/types/plan.js';
import { Constraints } from '../fixtures/Constraints.js';
import { Dictionaries } from '../fixtures/Dictionaries.js';
import { Models } from '../fixtures/Models.js';
import { Parcels } from '../fixtures/Parcels.js';
import { PanelNames, Plan } from '../fixtures/Plan.js';
import { Plans } from '../fixtures/Plans.js';
import { SchedulingConditions } from '../fixtures/SchedulingConditions.js';
import { SchedulingGoals } from '../fixtures/SchedulingGoals.js';
import { SequenceTemplates } from '../fixtures/SequenceTemplates.js';
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

test.describe('Model free plan with spans but no directives', () => {
  const planName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  let planId: number | null = null;

  test.afterAll(async () => {
    if (planId) {
      await setup.api.deletePlan(planId);
    }
  });

  test('shows imported spans on the timeline', async () => {
    const planJson = JSON.parse(readFileSync(modelFreePlanFile, 'utf8')) as {
      activities: unknown[];
      results: { spans: { directive_id?: number }[] };
    };
    planJson.activities = [];
    planJson.results.spans.forEach(span => delete span.directive_id);

    await setup.plans.goto();
    await setup.plans.importButton.click();
    await setup.plans.inputFile.setInputFiles({
      buffer: Buffer.from(JSON.stringify(planJson)),
      mimeType: 'application/json',
      name: 'plan-with-spans-only.json',
    });
    await setup.plans.fillInputName(planName);
    await expect(setup.plans.createButton).toBeEnabled();
    await setup.plans.createButton.click();

    planId = Number(await setup.plans.getPlanId(planName));
    await setup.api.waitForPlanImport(planId);

    const plan = new Plan(
      setup.page,
      setup.plans,
      new Constraints(setup.page),
      new SchedulingGoals(setup.page),
      new SchedulingConditions(setup.page),
      planName,
    );
    await plan.goto(`${planId}`);

    const activityRow = setup.page.getByRole('banner').filter({ hasText: 'Activities by Type' });
    await expect(activityRow.getByText('Calibrate', { exact: true })).toBeVisible();
    await expect(activityRow.getByText('TakeImage', { exact: true })).toBeVisible();
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

test.describe.serial('Model free plan sequence templating', () => {
  const planName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  const templateName = `${planName} template`;
  const filterName = `${planName} filter`;

  let models: Models;
  let plans: Plans;
  let importedPlan: PlanTransferResponse;
  let dictionaries: Dictionaries;
  let parcels: Parcels;
  let sequenceTemplates: SequenceTemplates;
  let plan: Plan;
  let dictionaryCreated = false;
  let parcelCreated = false;
  let templateCreated = false;
  let filterCreated = false;

  test.afterAll(async () => {
    test.setTimeout(60000);
    try {
      if (filterCreated && importedPlan) {
        await plan.goto(String(importedPlan.plan_id));
        await plan.showPanel(PanelNames.EXPANSION);
        await setup.page.locator('.sne-items').getByText(filterName, { exact: true }).hover();
        await setup.page.getByRole('button', { exact: true, name: `Delete '${filterName}'` }).click();
        await setup.page.locator('.modal').getByRole('button', { exact: true, name: 'Delete' }).click();
        await plan.waitForToast('Sequence Filters Deleted Successfully');
      }
      if (templateCreated) {
        await sequenceTemplates.goto();
        await sequenceTemplates.deleteSequenceTemplate(templateName);
      }
      if (parcelCreated) {
        await parcels.goto();
        await parcels.deleteParcel();
      }
      if (dictionaryCreated) {
        await dictionaries.goto();
        await dictionaries.deleteCommandDictionary();
      }
    } finally {
      if (importedPlan) {
        await setup.api.deletePlan(importedPlan.plan_id);
        await setup.api.deleteModel(importedPlan.model_id);
      }
    }
  });

  test('uploads a model free plan with imported results', async () => {
    test.setTimeout(120000);
    const { page } = setup;
    models = new Models(page);
    plans = new Plans(page, models);

    await plans.goto();
    await plans.importButton.click();
    await plans.fillInputFile(modelFreePlanFile);
    await expect(page.getByText('Model provided by read-only plan')).toBeVisible();
    await expect(plans.inputButtonModel).not.toBeVisible();
    await plans.fillInputName(planName);
    await expect(plans.createButton).toBeEnabled();
    const importResponse = page.waitForResponse(
      response => new URL(response.url()).pathname === '/importPlan' && response.request().method() === 'POST',
    );
    await plans.createButton.click();
    const response = await importResponse;
    expect(response.ok()).toBeTruthy();
    importedPlan = (await response.json()) as PlanTransferResponse;
    await setup.api.waitForPlanImport(importedPlan.plan_id);

    const imported = (await setup.api.getPlan(importedPlan.plan_id)) as {
      is_read_only: boolean;
      model: { is_executable: boolean; name: string };
    };
    expect(imported.is_read_only).toBe(true);
    expect(imported.model.is_executable).toBe(false);
    models.modelId = String(importedPlan.model_id);
    models.modelName = imported.model.name;
  });

  test('authors sequence templates against the imported model', async ({ baseURL }) => {
    const { page } = setup;
    dictionaries = new Dictionaries(page);
    await dictionaries.goto();
    await dictionaries.createCommandDictionary();
    dictionaryCreated = true;
    parcels = new Parcels(page);
    await parcels.createParcel(dictionaries.commandDictionaryName, baseURL);
    parcelCreated = true;

    sequenceTemplates = new SequenceTemplates(page, parcels, models);
    sequenceTemplates.sequenceTemplateActivityType = 'TakeImage';
    await sequenceTemplates.goto();
    await sequenceTemplates.createSequenceTemplate(templateName, 'SeqN');
    templateCreated = true;
    await sequenceTemplates.updateSequenceTemplate(templateName, '/C Example_Command "MODEL_FREE_IMAGE"');
  });

  test('creates and applies sequence filters to imported spans', async () => {
    const { page } = setup;
    plan = new Plan(
      page,
      plans,
      new Constraints(page),
      new SchedulingGoals(page),
      new SchedulingConditions(page),
      planName,
    );
    await plan.goto(String(importedPlan.plan_id));
    await plan.showPanel(PanelNames.EXPANSION);

    // Select an imported span type rather than adding activities or running simulation.
    await plan.sequenceExpansionNewButton.click();
    await plan.sequenceExpansionNewSequenceFilterButton.click();
    await page.getByPlaceholder('Enter a name for this filter').fill(filterName);
    await page.getByPlaceholder('Select types').click();
    await page.getByPlaceholder('Select types').fill('TakeImage');
    await page.getByRole('menuitem', { exact: true, name: 'TakeImage' }).click();
    await page.getByRole('button', { name: 'Create Sequence Filter' }).click();
    const filter = page.locator('.sne-items').getByText(filterName, { exact: true });
    await expect(filter).toBeVisible();
    filterCreated = true;
    await filter.hover();
    await page.getByLabel(`Apply '${filterName}'`).click();
    await expect(plan.sequenceExpansionApplySequenceFilterModal).toBeVisible();
    await plan.sequenceExpansionApplySequenceFilterModal.getByRole('button', { exact: true, name: 'Confirm' }).click();
    await plan.waitForToast('Expansion Sequence Created Successfully');

    const sequenceName = `${filterName} Sequence (Plan ${importedPlan.plan_id})`;
    const sequence = page.locator('.sne-items').getByText(sequenceName, { exact: true });
    await expect(sequence).toBeVisible();
  });

  test('runs sequence-template expansion on imported results', async () => {
    test.setTimeout(90000);
    const { page } = setup;
    const sequenceName = `${filterName} Sequence (Plan ${importedPlan.plan_id})`;
    const sequence = page.locator('.sne-items').getByText(sequenceName, { exact: true });
    await plan.navButtonExpansion.click();
    const expandAll = page.getByRole('button', { exact: true, name: 'Expand All Sequences' });
    await expect(expandAll).toBeEnabled();
    await expandAll.click();
    await plan.waitForToast('Sequence Templating Succeeded', 30000);

    await sequence.hover();
    await page.getByRole('button', { exact: true, name: `Show Expanded '${sequenceName}'` }).click();
    await expect(plan.sequenceExpansionOutputModal).toBeVisible();
    await expect(plan.sequenceExpansionOutputModal.getByText('C Example_Command "MODEL_FREE_IMAGE"')).toBeVisible();
  });
});
