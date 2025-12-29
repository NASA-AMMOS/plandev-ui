import test from '@playwright/test';
import { setupTest, teardownTest, type FullSetupResult } from '../utilities/api.js';

let setup: FullSetupResult;

test.beforeAll(async ({ browser }) => {
  setup = await setupTest(browser);
});

test.afterAll(async () => {
  await teardownTest(setup);
});

test.describe.serial('Constraints', () => {
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
