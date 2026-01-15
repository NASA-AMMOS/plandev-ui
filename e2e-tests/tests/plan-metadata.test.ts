import test, { expect } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { getIntervalFromDoyRange } from '../../src/utilities/time.js';
import { Constraints } from '../fixtures/Constraints.js';
import { Models } from '../fixtures/Models.js';
import { PanelNames, Plan } from '../fixtures/Plan.js';
import { Plans } from '../fixtures/Plans.js';
import { SchedulingConditions } from '../fixtures/SchedulingConditions.js';
import { SchedulingGoals } from '../fixtures/SchedulingGoals.js';
import { User } from '../fixtures/User.js';
import { AerieApi, getSharedTestData, setupTest, teardownTest, type BrowserSetupResult } from '../utilities/api.js';

// Separate browser contexts for each user
let setupA: BrowserSetupResult; // userA's browser context
let setupB: BrowserSetupResult; // userB's browser context

// API instance for userA to create resources
let apiA: AerieApi;
let modelId: number;
let planAId: number;
let planBId: number;

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

test.beforeAll(async ({ browser }) => {
  // Create separate browser contexts for each user using pre-authenticated storage states
  // This eliminates the need for login/logout and avoids race conditions
  setupA = await setupTest(browser, { model: false, user: 'userA' });
  setupB = await setupTest(browser, { model: false, user: 'userB' });

  // Create API instance for userA to create resources owned by userA
  // Note: All test users use 'test' as the password
  apiA = new AerieApi();
  await apiA.login('userA', 'test');

  // Use pre-uploaded JAR from global setup
  const { jarId } = getSharedTestData();

  // Create model via API (much faster and more reliable than UI)
  const modelName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  const model = await apiA.createModel({
    jar_id: jarId,
    mission: 'test',
    name: modelName,
    version: '1.0.0',
  });
  modelId = model.id;

  // Generate plan names
  const planAName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  const planBName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });

  // Create plans via API as userA (so userA owns them for permission testing)
  const planStartTime = '2022-001T00:00:00';
  const planEndTime = '2022-006T00:00:00';

  const planAResult = await apiA.createPlan({
    duration: getIntervalFromDoyRange(planStartTime, planEndTime),
    model_id: modelId,
    name: planAName,
    start_time: planStartTime,
  });
  planAId = planAResult.id;

  const planBResult = await apiA.createPlan({
    duration: getIntervalFromDoyRange(planStartTime, planEndTime),
    model_id: modelId,
    name: planBName,
    start_time: planStartTime,
  });
  planBId = planBResult.id;

  // Initialize fixtures for userA's context
  modelsA = new Models(setupA.page);
  modelsA.modelId = String(modelId);
  modelsA.modelName = modelName;

  plansA = new Plans(setupA.page, modelsA);
  plansA.planId = String(planAId);
  plansA.planName = planAName;

  constraintsA = new Constraints(setupA.page);
  schedulingConditionsA = new SchedulingConditions(setupA.page);
  schedulingGoalsA = new SchedulingGoals(setupA.page);
  planA = new Plan(setupA.page, plansA, constraintsA, schedulingGoalsA, schedulingConditionsA, planAName);
  planB = new Plan(setupA.page, plansA, constraintsA, schedulingGoalsA, schedulingConditionsA, planBName);

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

  // Navigate to plan page
  await planA.goto(String(planAId));
});

test.afterAll(async () => {
  // Clean up via API (much faster and more reliable than UI)
  try {
    if (planAId) {
      await apiA.deletePlan(planAId);
    }
  } catch {
    // Plan may not have been created or already deleted
  }
  try {
    if (planBId) {
      await apiA.deletePlan(planBId);
    }
  } catch {
    // Plan may not have been created or already deleted
  }
  try {
    if (modelId) {
      await apiA.deleteModel(modelId);
    }
  } catch {
    // Model may not have been created or already deleted
  }

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
    const userB = new User(setupB.page, 'userB');
    await userB.gotoWithRetry('/plans');
    await userB.switchRole('user');

    // Use retry helper after role switch (can cause ERR_ABORTED)
    await userB.gotoWithRetry('/plans');
    await userB.gotoWithRetry(`/plans/${planAId}`);
    await planAForUserB.showPanel(PanelNames.PLAN_METADATA, true);
    await planAForUserB.waitForPlanCollaboratorLoad();
    await expect(planAForUserB.planCollaboratorInputContainer).toHaveAttribute('readonly');
  });

  test(`userB can be added as a plan collaborator to userA's plan`, async () => {
    // Switch back to userA's context for this test
    // Reload the page to ensure fresh WebSocket subscriptions (users list)
    await setupA.page.reload({ waitUntil: 'networkidle' });
    await planA.addPlanCollaborator('userB');
  });

  test(`Collaborator userB in "user" role should be able to edit userA's plan collaborators`, async () => {
    // Use userB's separate browser context - no login/logout needed!
    const userB = new User(setupB.page, 'userB');
    await userB.gotoWithRetry('/plans');
    await userB.switchRole('user');

    // Use retry helper after role switch (can cause ERR_ABORTED)
    await userB.gotoWithRetry('/plans');
    await userB.gotoWithRetry(`/plans/${planAId}`);

    await planAForUserB.showPanel(PanelNames.PLAN_METADATA, true);
    await planAForUserB.addPlanCollaborator('userA');
  });

  test(`Sets of collaborators can be added from other plans`, async () => {
    // Use userA's context - navigate to planB
    await planB.goto(String(planBId));

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
