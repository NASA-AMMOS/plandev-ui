import test, { expect } from '@playwright/test';
import { Constraints } from '../fixtures/Constraints.js';
import { Models } from '../fixtures/Models.js';
import { PanelNames, Plan } from '../fixtures/Plan.js';
import { Plans } from '../fixtures/Plans.js';
import { SchedulingConditions } from '../fixtures/SchedulingConditions.js';
import { SchedulingGoals } from '../fixtures/SchedulingGoals.js';
import { User } from '../fixtures/User.js';
import { setupTest, teardownTest, type BrowserSetupResult } from '../utilities/api.js';

// Separate browser contexts for each user
let setupA: BrowserSetupResult; // userA's browser context
let setupB: BrowserSetupResult; // userB's browser context

// Fixtures for userA's context
let constraintsA: Constraints;
let modelsA: Models;
let planA: Plan;
let planB: Plan;
let plansA: Plans;
let schedulingConditionsA: SchedulingConditions;
let schedulingGoalsA: SchedulingGoals;

// Fixtures for userB's context (only what we need)
let planAForUserB: Plan;
let plansB: Plans;

test.beforeAll(async ({ browser, baseURL }) => {
  // Create separate browser contexts for each user using pre-authenticated storage states
  // This eliminates the need for login/logout and avoids race conditions
  setupA = await setupTest(browser, { model: false, user: 'userA' });
  setupB = await setupTest(browser, { model: false, user: 'userB' });

  // Initialize fixtures for userA's context
  modelsA = new Models(setupA.page);
  plansA = new Plans(setupA.page, modelsA);
  constraintsA = new Constraints(setupA.page);
  schedulingConditionsA = new SchedulingConditions(setupA.page);
  schedulingGoalsA = new SchedulingGoals(setupA.page);
  planA = new Plan(setupA.page, plansA, constraintsA, schedulingGoalsA, schedulingConditionsA, plansA.createPlanName());
  planB = new Plan(setupA.page, plansA, constraintsA, schedulingGoalsA, schedulingConditionsA, plansA.createPlanName());

  // Initialize fixtures for userB's context (shares the same plan names)
  const modelsB = new Models(setupB.page);
  plansB = new Plans(setupB.page, modelsB);
  const constraintsB = new Constraints(setupB.page);
  const schedulingConditionsB = new SchedulingConditions(setupB.page);
  const schedulingGoalsB = new SchedulingGoals(setupB.page);
  planAForUserB = new Plan(
    setupB.page,
    plansB,
    constraintsB,
    schedulingGoalsB,
    schedulingConditionsB,
    planA.planName, // Same plan name as planA
  );

  // Create model as userA (who has admin role by default)
  await modelsA.goto();
  await modelsA.createModel(baseURL);

  // Create plans as userA
  await plansA.goto();

  const planAId = await plansA.createPlan(planA.planName);
  await plansA.filterTable(planA.planName);
  await expect(plansA.table.getByRole('row', { name: planA.planName })).toBeVisible();

  await plansA.createPlan(planB.planName);
  await planA.goto(planAId);
});

test.afterAll(async () => {
  // Clean up as userA (admin)
  await plansA.goto();
  const userA = new User(setupA.page, 'userA');
  await userA.switchRole('aerie_admin');
  await plansA.deletePlan(planA.planName);
  await plansA.deletePlan(planB.planName);
  await modelsA.goto();
  await modelsA.deleteModel();

  // Close both browser contexts
  await teardownTest(setupA);
  await teardownTest(setupB);
});

test.describe.serial('Plan Metadata', () => {
  test('Plan should be re-nameable', async () => {
    await planA.showPanel(PanelNames.PLAN_METADATA, true);
    await planA.renamePlan(planA.planName + '_renamed');

    // Give the input form a moment to react before immediately performing another rename
    await expect(planA.planNameInput).toHaveValue(planA.planName + '_renamed');
    await planA.renamePlan(planA.planName);
  });

  test('Plan name uniqueness validation enforced', async () => {
    await planA.showPanel(PanelNames.PLAN_METADATA, true);
    await planA.fillPlanName(planB.planName);
    await expect(setupA.page.locator('.error:has-text("Plan name already exists")')).toBeDefined();
  });

  test('Plan owner should be userA', async () => {
    await planA.showPanel(PanelNames.PLAN_METADATA, true);
    await expect(planA.panelPlanMetadata.locator('input[name="owner"]')).toHaveValue('userA');
  });

  test('userA can be added as a plan collaborator to their own plan', async () => {
    await planA.addPlanCollaborator('userA');
  });

  test('userA can be removed as a plan collaborator', async () => {
    await planA.removePlanCollaborator('userA');
  });

  test(`Non-collaborator userB as role user should not be able to edit userA's plan collaborators`, async () => {
    // Use userB's separate browser context - no login/logout needed!
    await plansB.goto();
    const userB = new User(setupB.page, 'userB');
    await userB.switchRole('user');

    const planAId = await plansB.getPlanId(planA.planName);
    await planAForUserB.goto(planAId);
    await planAForUserB.showPanel(PanelNames.PLAN_METADATA, true);
    await expect(planAForUserB.planCollaboratorInputContainer).toHaveAttribute('readonly');
  });

  test(`userB can be added as a plan collaborator to userA's plan`, async () => {
    // Switch back to userA's context for this test
    await plansA.goto();
    const planAId = await plansA.getPlanId(planA.planName);
    await planA.goto(planAId);

    await planA.addPlanCollaborator('userB');
  });

  test(`Collaborator userB in "user" role should be able to edit userA's plan collaborators`, async () => {
    // Use userB's separate browser context - no login/logout needed!
    const userB = new User(setupB.page, 'userB');
    await userB.switchRole('user');

    await plansB.goto();
    const planAId = await plansB.getPlanId(planA.planName);
    await planAForUserB.goto(planAId);

    await planAForUserB.showPanel(PanelNames.PLAN_METADATA, true);
    await planAForUserB.addPlanCollaborator('userA');
  });

  test(`Sets of collaborators can be added from other plans`, async () => {
    // Use userA's context
    await plansA.goto();
    const planBId = await plansA.getPlanId(planB.planName);
    await planB.goto(planBId);

    await planB.showPanel(PanelNames.PLAN_METADATA, true);

    // Wait for plan to be an option in the input (via socket update)
    await planB.waitForPlanCollaboratorLoad();
    await planB.planCollaboratorInput.click();
    await expect(setupA.page.getByRole('option', { name: planA.planName })).toBeVisible({ timeout: 5000 });
    await setupA.page.keyboard.press('Escape');
    await planB.addPlanCollaborator(planA.planName, false);
    await expect(
      planB.planCollaboratorInputContainer
        .getByTestId('tags-input-selected-items')
        .getByRole('option', { name: 'userA' }),
    ).toBeDefined();
    await expect(
      planB.planCollaboratorInputContainer
        .getByTestId('tags-input-selected-items')
        .getByRole('option', { name: 'userB' }),
    ).toBeDefined();
  });
});
