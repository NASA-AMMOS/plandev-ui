/**
 * Constraints Test - API-based Setup/Teardown
 *
 * This is a proof-of-concept test that demonstrates using the AerieApi
 * for test setup and teardown instead of UI interactions.
 *
 * Benefits:
 * - Faster setup/teardown (API calls vs UI navigation)
 * - More reliable (no UI flakiness for test data creation)
 * - Still tests actual UI functionality in the test cases
 */
import test, { type BrowserContext, type Page } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { Constraints } from '../fixtures/Constraints.js';
import { Models } from '../fixtures/Models.js';
import { Plan } from '../fixtures/Plan.js';
import { Plans } from '../fixtures/Plans.js';
import { SchedulingConditions } from '../fixtures/SchedulingConditions.js';
import { SchedulingGoals } from '../fixtures/SchedulingGoals.js';
import { AerieApi, getSharedTestData } from '../utilities/api.js';

let api: AerieApi;
let constraints: Constraints;
let context: BrowserContext;
let modelId: number;
let models: Models;
let page: Page;
let plan: Plan;
let planId: number;
let plans: Plans;
let schedulingConditions: SchedulingConditions;
let schedulingGoals: SchedulingGoals;

// Generate unique names for test isolation
const modelName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
const planName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });

test.beforeAll(async ({ browser }) => {
  // Initialize API client and login
  api = new AerieApi();
  await api.login('test', 'test');

  // Use pre-uploaded JAR from global setup
  const { jarId } = getSharedTestData();
  const model = await api.createModel({
    jar_id: jarId,
    mission: 'test',
    name: modelName,
    version: '1.0.0',
  });
  modelId = model.id;

  // Create plan via API
  const planResult = await api.createPlan({
    duration: '432000000000', // 5 days in microseconds
    model_id: modelId,
    name: planName,
    start_time: '2022-001T00:00:00',
  });
  planId = planResult.id;

  // Set up browser context and page objects for UI tests
  context = await browser.newContext();
  page = await context.newPage();

  // Initialize fixture classes (still needed for UI interactions in tests)
  models = new Models(page);
  models.modelId = String(modelId);
  models.modelName = modelName;

  plans = new Plans(page, models);
  plans.planId = String(planId);
  plans.planName = planName;

  constraints = new Constraints(page);
  schedulingConditions = new SchedulingConditions(page);
  schedulingGoals = new SchedulingGoals(page);
  plan = new Plan(page, plans, constraints, schedulingGoals, schedulingConditions);
});

test.afterAll(async () => {
  // Clean up via API - much faster than UI navigation
  if (planId) {
    await api.deletePlan(planId);
  }
  if (modelId) {
    await api.deleteModel(modelId);
  }

  await page.close();
  await context.close();
});

test.describe.serial('Constraints (API Setup)', () => {
  test('Navigate to the plan page and show the constraints layout', async () => {
    await plan.goto();
    await plan.showConstraintsLayout();
  });

  test('Create constraint from the plan page', async ({ baseURL }) => {
    await plan.createConstraint(baseURL);
  });

  test('Delete constraint', async () => {
    await plan.removeConstraint();
    await constraints.deleteConstraint();
  });
});
