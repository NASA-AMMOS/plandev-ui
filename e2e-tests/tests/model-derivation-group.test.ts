import test, { expect } from '@playwright/test';
import { Model } from '../fixtures/Model.js';
import { PanelNames, Plan } from '../fixtures/Plan.js';
import { cleanupApiResources, closeBrowserResources, setupTest, type FullSetupResult } from '../utilities/api.js';
import {
  buildExternalSourceFixture,
  cleanupExternalSourceFixtures,
  MDG_SCHEMA_FILE,
  MDG_SOURCE_FILE,
  seedExternalSourceFixture,
  type ExternalSourceFixture,
} from '../utilities/external-sources.js';

// This test seeds its own namespaced external-source records via the API (see external-sources.ts), so
// it neither depends on nor disturbs any other suite's data. The UI upload path itself is covered by
// external-sources.test.ts.
let mdg: ExternalSourceFixture;

// Main setup with model (uses 'test' user for API operations)
let setup: FullSetupResult;
let model: Model;

// different plans depending on the model association
let originalPlan: Plan;
let originalPlanId: number;
let newPlan: Plan;
let newPlanId: number;

test.beforeAll(async ({ browser }) => {
  setup = await setupTest(browser);
  setup.plans.endTime = '2022-011T00:00:00';

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

  mdg = buildExternalSourceFixture(MDG_SOURCE_FILE, MDG_SCHEMA_FILE);
  await seedExternalSourceFixture(setup.api, mdg);
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

  try {
    await cleanupExternalSourceFixtures(setup.api, [mdg]);
  } finally {
    await closeBrowserResources(setup);
  }
});

test.describe.serial('Model Derivation Group Linking', () => {
  test('Derivation groups can be linked to a model and show in plan', async ({ baseURL }) => {
    test.setTimeout(60 * 1000);
    // check the current plan...
    await originalPlan.goto();
    await setup.page.waitForURL(`${baseURL}/plans/${originalPlanId}`, { timeout: 3000 });
    await setup.plan.showPanel(PanelNames.EXTERNAL_SOURCES);

    // ...and verify that there is nothing associated
    await expect(setup.page.getByText('No Derivation Groups Linked To This Plan')).toBeVisible({ timeout: 15000 });

    // go to the model page
    await model.goto();
    await setup.page.waitForURL(`${baseURL}/models/${setup.models.modelId}`, { timeout: 3000 });

    // Link this test's own derivation group. Scope the checkbox to that specific row: the backend
    // holds other derivation groups, so an unscoped "Press SPACE to toggle cell" checkbox matches
    // multiple rows (strict-mode violation).
    await model.switchToDerivationGroups();
    const derivationGroupCheckbox = setup.page.getByRole('row', { name: mdg.derivationGroup }).getByRole('checkbox');
    await derivationGroupCheckbox.click({ force: true });
    await expect(derivationGroupCheckbox).toBeChecked();

    // save the association
    await model.saveModel();

    // now, create a new plan
    await setup.plans.goto();
    await setup.page.waitForURL(`${baseURL}/plans`, { timeout: 3000 });
    const newPlanName = 'secondPlan';
    await setup.plans.createPlan(newPlanName, setup.modelName);
    newPlan = new Plan(
      setup.page,
      setup.plans,
      setup.constraints,
      setup.schedulingGoals,
      setup.schedulingConditions,
      newPlanName,
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
