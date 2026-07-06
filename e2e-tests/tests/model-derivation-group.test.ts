import test, { expect } from '@playwright/test';
import { ExternalSources } from '../fixtures/ExternalSources.js';
import { Model } from '../fixtures/Model.js';
import { PanelNames, Plan } from '../fixtures/Plan.js';
import { cleanupApiResources, closeBrowserResources, setupTest, type FullSetupResult } from '../utilities/api.js';

// This test uses its own uniquely-named external-source artifacts (not the shared "Example External
// Source" fixtures) so it never collides with external-sources.test.ts, which creates AND deletes
// those shared artifacts mid-run. Both files run in parallel against one backend, so shared names
// race — one uploads while the other deletes — which made this test's beforeAll upload flaky.
const MDG_TYPE_SCHEMA = 'e2e-tests/data/Schema_MDG_Source.json';
const MDG_SOURCE_FILE = 'e2e-tests/data/mdg-external-source.json';
const MDG_SOURCE_TYPE = 'MDG External Source';
const MDG_EVENT_TYPE = 'MDGEvent';
const MDG_DERIVATION_GROUP = 'MDG External Source Default';
const MDG_SOURCE_KEY = 'MDGExternalSource:mdg-external-source.json';

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
  await externalSources.createTypes(MDG_TYPE_SCHEMA, [MDG_SOURCE_TYPE], [MDG_EVENT_TYPE]);
  await externalSources.uploadExternalSource(MDG_SOURCE_FILE);
});

test.afterAll(async () => {
  // Clean up plan and model first
  await cleanupApiResources(setup);

  // manually delete the new plan, since setup's planId field doesn't get updated
  //    to reference the new one when creating the new plan. Guard against undefined: if the test
  //    failed before creating the second plan, deletePlan(undefined) throws a GraphQL error that
  //    masks the real failure.
  if (newPlanId) {
    await setup.api.deletePlan(newPlanId);
  }

  // Use API for faster cleanup of this test's own external-source artifacts. Delete ONLY the MDG
  // artifacts — deleting the shared "Example" ones here would clobber external-sources.test.ts if it
  // runs concurrently. Order matters: sources -> derivation groups -> source types -> event types.
  try {
    await setup.api.deleteExternalSources(MDG_DERIVATION_GROUP, [MDG_SOURCE_KEY]);
    await setup.api.deleteDerivationGroups([MDG_DERIVATION_GROUP]);
    await setup.api.deleteExternalSourceTypes([MDG_SOURCE_TYPE]);
    await setup.api.deleteExternalEventTypes([MDG_EVENT_TYPE]);
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
    await expect(setup.page.getByText('No Derivation Groups Linked To This Plan')).toBeVisible({ timeout: 15000 });

    // go to the model page
    await model.goto();
    await setup.page.waitForURL(`${baseURL}/models/${setup.models.modelId}`, { timeout: 3000 });

    // Link this test's own derivation group. Scope the checkbox to that specific row: other suites
    // leave additional derivation groups in the shared backend, so an unscoped "Press SPACE to
    // toggle cell" checkbox matches multiple rows (strict-mode violation).
    await model.switchToDerivationGroups();
    const derivationGroupCheckbox = setup.page
      .getByRole('row', { name: MDG_DERIVATION_GROUP })
      .getByRole('checkbox');
    await derivationGroupCheckbox.click({ force: true });
    await expect(derivationGroupCheckbox).toBeChecked();

    // save the association
    await model.saveModel();

    // now, create a new plan
    await setup.plans.goto();
    await setup.page.waitForURL(`${baseURL}/plans`, { timeout: 3000 });
    await setup.plans.createPlan('secondPlan', setup.modelName);
    newPlan = new Plan(
      setup.page,
      setup.plans,
      setup.constraints,
      setup.schedulingGoals,
      setup.schedulingConditions,
      setup.planName,
    );
    newPlanId = Number(setup.plans.planId);

    // navigate to the new plan...
    await newPlan.goto();
    await setup.page.waitForURL(`${baseURL}/plans/${newPlanId}`, { timeout: 3000 });
    await setup.plan.showPanel(PanelNames.EXTERNAL_SOURCES);

    // ...and this time there should be an association. Allow extra time for the plan-derivation-group
    // subscription to re-deliver for the new plan and for the backend to compute derived events.
    await expect(setup.page.getByText('1 derived events')).toBeVisible({ timeout: 15000 });

    // but when we go back to the old plan...
    // Note that we do not do originalPlan.goto(); it seems that originalPlan's link to setup resets it to refer to newPlan!
    await setup.page.goto(`${baseURL}/plans/${originalPlanId}`, { timeout: 3000 });
    await setup.page.waitForURL(`${baseURL}/plans/${originalPlanId}`, { timeout: 3000 });
    await setup.plan.showPanel(PanelNames.EXTERNAL_SOURCES);

    // ...there still shouldn't be any associations, as models affect the _defaults_, not plans that already exist
    await expect(setup.page.getByText('No Derivation Groups Linked To This Plan')).toBeVisible({ timeout: 15000 });
  });
});
