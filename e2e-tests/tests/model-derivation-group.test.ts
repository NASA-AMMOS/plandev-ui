import test, { expect } from '@playwright/test';
import { ExternalSources } from '../fixtures/ExternalSources.js';
import { Model } from '../fixtures/Model.js';
import { PanelNames, Plan } from '../fixtures/Plan.js';
import { cleanupApiResources, closeBrowserResources, setupTest, type FullSetupResult } from '../utilities/api.js';

// Main setup with model (uses 'test' user for API operations)
let setup: FullSetupResult;
let externalSources: ExternalSources;
let model: Model;

// different plans depending on the model association
let originalPlan: Plan;
let originalPlanId: number;
let newPlan: Plan;
let newPlanId: number;

test.beforeAll(async ({ browser }) => {
  setup = await setupTest(browser);
  setup.plans.endTime = '2022-011T00:00:00';
  externalSources = new ExternalSources(setup.page);

  model = new Model(setup.page, setup.models, setup.constraints, setup.schedulingGoals, setup.schedulingConditions);
  originalPlan = new Plan(
    setup.page,
    setup.plans,
    setup.constraints,
    setup.schedulingGoals,
    setup.schedulingConditions,
    setup.planName,
  );
  originalPlanId = setup.planId;

  await externalSources.goto();
  await externalSources.createTypes(
    externalSources.exampleTypeSchema,
    externalSources.exampleTypeSchemaExpectedSourceTypes,
    externalSources.exampleTypeSchemaExpectedEventTypes,
  );
  await externalSources.uploadExternalSource();
});

test.afterAll(async () => {
  // Clean up plan and model first
  await cleanupApiResources(setup);

  // manually delete the new plan, since setup's planId field doesn't get updated
  //    to reference the new one when creating the new plan
  await setup.api.deletePlan(newPlanId);

  // Use API for faster cleanup of external sources artifacts
  // Order matters: sources -> derivation groups -> source types -> event types
  try {
    // Delete sources (grouped by derivation group)
    await setup.api.deleteExternalSources(externalSources.exampleDerivationGroup, [externalSources.externalSourceKey]);
    await setup.api.deleteExternalSources(externalSources.derivationTestGroupName, [
      externalSources.derivationTestFileKey1,
      externalSources.derivationTestFileKey2,
      externalSources.derivationTestFileKey3,
      externalSources.derivationTestFileKey4,
    ]);
    // Delete derivation groups
    await setup.api.deleteDerivationGroups([
      externalSources.exampleDerivationGroup,
      externalSources.derivationTestGroupName,
    ]);
    // Delete source types
    await setup.api.deleteExternalSourceTypes([
      externalSources.exampleSourceType,
      externalSources.derivationTestSourceTypeName,
    ]);
    // Delete event types
    await setup.api.deleteExternalEventTypes([
      externalSources.exampleEventType,
      externalSources.derivationATypeName,
      externalSources.derivationBTypeName,
      externalSources.derivationCTypeName,
      externalSources.derivationDTypeName,
    ]);
  } catch {
    // Ignore cleanup errors - resources may not exist or have dependencies
  }
  await closeBrowserResources(setup);
});

test.describe.serial('Model Derivation Group Linking', () => {
  test('Derivation groups can be linked to a model and show in plan', async ({ baseURL }) => {
    // check the current plan...
    await originalPlan.goto();
    await setup.page.waitForURL(`${baseURL}/plans/${originalPlanId}`, { timeout: 3000 });
    await setup.plan.showPanel(PanelNames.EXTERNAL_SOURCES);

    // ...and verify that there is nothing associated
    await expect(setup.page.getByText('No Derivation Groups Linked To This Plan')).toBeVisible();

    // go to the model page
    await model.goto();
    await setup.page.waitForURL(`${baseURL}/models/${setup.models.modelId}`, { timeout: 3000 });

    // select all derivation groups (only 1 will be uploaded and therefore only 1 associated)
    await model.switchToDerivationGroups();
    await setup.page.getByRole('checkbox', { name: 'Press SPACE to toggle cell' }).click();

    // save the association
    await model.saveModel();

    // now, create a new plan
    await setup.page.pause();
    await setup.plans.goto();
    await setup.page.waitForURL(`${baseURL}/plans`, { timeout: 3000 });
    await setup.page.pause();
    console.log('CREATING NEW PLAN WITH MODEL', setup.modelName, setup.modelId, setup.models.modelName);
    await setup.plans.createPlan('secondPlan', setup.modelName);
    await setup.page.pause();
    newPlan = new Plan(
      setup.page,
      setup.plans,
      setup.constraints,
      setup.schedulingGoals,
      setup.schedulingConditions,
      setup.planName,
    );
    newPlanId = Number(setup.plans.planId);
    await setup.page.pause();

    // navigate to the new plan...
    await newPlan.goto();
    await setup.page.waitForURL(`${baseURL}/plans/${newPlanId}`, { timeout: 3000 });
    await setup.plan.showPanel(PanelNames.EXTERNAL_SOURCES);

    // ...and this time there should be an association
    await expect(setup.page.getByText('1 derived events')).toBeVisible();

    // but when we go back to the old plan...
    await setup.page.pause();
    // Note that we do not do originalPlan.goto(); it seems that originalPlan's link to setup resets it to refer to newPlan!
    await setup.page.goto(`${baseURL}/plans/${originalPlanId}`, { timeout: 3000 });
    await setup.page.pause();
    await setup.page.waitForURL(`${baseURL}/plans/${originalPlanId}`, { timeout: 3000 });
    await setup.plan.showPanel(PanelNames.EXTERNAL_SOURCES);

    // ...there still shouldn't be any associations, as models affect the _defaults_, not plans that already exist
    await expect(setup.page.getByText('No Derivation Groups Linked To This Plan')).toBeVisible();
  });
});
