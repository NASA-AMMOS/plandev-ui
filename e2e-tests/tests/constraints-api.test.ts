/**
 * Constraints Test - API-based Setup/Teardown
 *
 * This test demonstrates using the AerieApi for fast, reliable setup/teardown.
 * Model and plan are created via API and automatically cleaned up after tests.
 */
import test from '@playwright/test';
import { setupTest, teardownTest, type TestSetupResult } from '../utilities/api.js';

let setup: TestSetupResult;

test.beforeAll(async ({ browser }) => {
  setup = await setupTest(browser);
});

test.afterAll(async () => {
  await teardownTest(setup);
});

test.describe.serial('Constraints (API Setup)', () => {
  test('Navigate to the plan page and show the constraints layout', async () => {
    await setup.plan.goto();
    await setup.plan.showConstraintsLayout();
  });

  test('Create constraint from the plan page', async ({ baseURL }) => {
    await setup.plan.createConstraint(baseURL);
  });

  test('Delete constraint', async () => {
    await setup.plan.removeConstraint();
    await setup.constraints.deleteConstraint();
  });
});
