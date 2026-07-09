import test, { expect } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { Status } from '../../src/enums/status.js';
import { PanelNames } from '../fixtures/Plan.js';
import { setupTest, teardownTest, type FullSetupResult } from '../utilities/api.js';

let setup: FullSetupResult;
let originalConstraintName: string;
const newConstraintName: string =
  'FAILING_TEST_CONSTRAINT_' + uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
const newConstraintDefinition: string =
  "export default function peelFailing(): Constraint { return Real.Resource('/peel').lessThan(-1000); }";

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

  test('Evaluate a failing and passing constraint', async ({ baseURL }) => {
    originalConstraintName = setup.plan.constraints.constraintName;

    // create a new constraint
    setup.plan.constraints.constraintName = newConstraintName;
    setup.plan.constraints.constraintDefinition = newConstraintDefinition;
    await setup.plan.createConstraint(baseURL);

    // simulate
    await setup.plan.showPanel(PanelNames.SIMULATION, true);
    await setup.plan.runSimulation(Status.Complete);

    // evaluate constraints
    await setup.page.getByRole('navigation').getByText('Constraints').click();
    await setup.page.getByText('Check Constraints', { exact: true }).click();

    // check results, should say "2 of 2 constraints, 1 of 1 violations"
    await setup.plan.showPanel(PanelNames.CONSTRAINTS, true);
    await expect(setup.page.getByText('2 of 2 constraints, 1 of 1').first()).toBeVisible({ timeout: 10000 });
  });

  test('Delete constraint', async () => {
    await setup.plan.removeConstraint(originalConstraintName);
    await setup.plan.removeConstraint(newConstraintName);

    await setup.page.pause();
    await setup.constraints.deleteConstraint(originalConstraintName);
    await setup.constraints.deleteConstraint(newConstraintName);
  });
});
