/**
 * E2E Test API Utility
 *
 * Provides direct GraphQL/API access for test setup and teardown,
 * bypassing UI interactions for faster and more reliable tests.
 *
 * Reuses existing GQL queries from src/utilities/gql.ts to avoid duplication.
 */

import type { Browser, BrowserContext, Page } from '@playwright/test';
import fs from 'fs';
import nodePath from 'path';
import url from 'url';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { SchedulingDefinitionType } from '../../src/enums/scheduling.js';
import { ActivityDirectiveInsertInput } from '../../src/types/activity.js';
import type { ReqAuthResponse } from '../../src/types/auth';
import { ConstraintDefinitionInsertInput } from '../../src/types/constraint.js';
import { ModelInsertInput } from '../../src/types/model.js';
import { PlanInsertInput } from '../../src/types/plan.js';
import { SchedulingGoalDefinitionInsertInput, SchedulingGoalInsertInput } from '../../src/types/scheduling.js';
import { convertToQuery } from '../../src/utilities/generic.js';
import gql from '../../src/utilities/gql.js';
import { STORAGE_STATE } from '../../playwright.config.js';
import { Constraints } from '../fixtures/Constraints.js';
import { Models } from '../fixtures/Models.js';
import { Plan } from '../fixtures/Plan.js';
import { Plans } from '../fixtures/Plans.js';
import { SchedulingConditions } from '../fixtures/SchedulingConditions.js';
import { SchedulingGoals } from '../fixtures/SchedulingGoals.js';

// Default URLs from environment variables, with fallbacks for local development
const DEFAULT_HASURA_URL = process.env.PUBLIC_HASURA_CLIENT_URL ?? 'http://localhost:8080/v1/graphql';
const DEFAULT_GATEWAY_URL = process.env.PUBLIC_GATEWAY_CLIENT_URL ?? 'http://localhost:9000';

export interface ApiUser {
  id: string;
  token: string;
}

/**
 * Shared test data written during global setup and read by tests.
 */
export interface SharedTestData {
  jarId: number;
}

/**
 * API client for direct Hasura/Gateway access in e2e tests.
 * Bypasses the UI for faster test setup and teardown.
 */
export class AerieApi {
  private gatewayUrl: string;
  private hasuraUrl: string;
  private user: ApiUser | null = null;

  constructor(hasuraUrl: string = DEFAULT_HASURA_URL, gatewayUrl: string = DEFAULT_GATEWAY_URL) {
    this.hasuraUrl = hasuraUrl;
    this.gatewayUrl = gatewayUrl;
  }

  async createActivityDirective(activityDirective: ActivityDirectiveInsertInput): Promise<{ id: number }> {
    const data = await this.gqlQuery<{ createActivityDirective: { id: number } }>(gql.CREATE_ACTIVITY_DIRECTIVE, {
      activityDirectiveInsertInput: activityDirective,
    });
    return { id: data.createActivityDirective.id };
  }

  async createConstraint(constraint: ConstraintDefinitionInsertInput): Promise<{ id: number }> {
    // Create metadata first using CREATE_CONSTRAINT
    const metadatadata = await this.gqlQuery<{ constraint: { id: number } }>(gql.CREATE_CONSTRAINT, { constraint });
    const constraintId = metadatadata.constraint.id;

    // Then create definition
    await this.gqlQuery(gql.CREATE_CONSTRAINT_DEFINITION, {
      constraintDefinition: {
        constraint_id: constraintId,
        definition: constraint.definition,
      },
    });

    return { id: constraintId };
  }

  async createModel(model: ModelInsertInput): Promise<{ id: number }> {
    const data = await this.gqlQuery<{ createModel: { id: number } }>(gql.CREATE_MODEL, { model });
    return data.createModel;
  }

  async createPlan(plan: PlanInsertInput): Promise<{ id: number }> {
    const data = await this.gqlQuery<{ createPlan: { id: number } }>(gql.CREATE_PLAN, { plan });
    return data.createPlan;
  }

  async createSchedulingGoal(goal: SchedulingGoalInsertInput): Promise<{ id: number }> {
    const metadatadata = await this.gqlQuery<{ createSchedulingGoal: { id: number } }>(gql.CREATE_SCHEDULING_GOAL, {
      description: goal.description ?? '',
      name: goal.name,
      public: goal.public,
    });
    const goalId = metadatadata.createSchedulingGoal.id;

    const goalDefinitionInsertInput: SchedulingGoalDefinitionInsertInput = {
      ...goal,
      definition: null,
      goal_id: goalId,
      type: SchedulingDefinitionType.EDSL,
      uploaded_jar_id: null,
    };
    await this.gqlQuery(gql.CREATE_SCHEDULING_GOAL_DEFINITION, { goalDefinition: goalDefinitionInsertInput });

    return { id: goalId };
  }

  async createTag(name: string, color: string = '#000000'): Promise<{ id: number }> {
    // CREATE_TAG returns directly from INSERT_TAG without an alias
    const data = await this.gqlQuery<{ insert_tags_one: { id: number } }>(gql.CREATE_TAG, {
      tag: { color, name },
    });
    return data.insert_tags_one;
  }

  async deleteActivityDirectives(planId: number, activityIds: number[]): Promise<void> {
    await this.gqlQuery(gql.DELETE_ACTIVITY_DIRECTIVES, {
      activity_ids: activityIds,
      plan_id: planId,
    });
  }

  async deleteConstraint(id: number): Promise<void> {
    await this.gqlQuery(gql.DELETE_CONSTRAINT_METADATA, { id });
  }

  async deleteModel(id: number): Promise<void> {
    await this.gqlQuery(gql.DELETE_MODEL, { id });
  }

  async deletePlan(id: number): Promise<void> {
    await this.gqlQuery(gql.DELETE_PLAN, { id });
  }

  async deleteSchedulingGoal(id: number): Promise<void> {
    await this.gqlQuery(gql.DELETE_SCHEDULING_GOAL_METADATA, { id });
  }

  async deleteTag(id: number): Promise<void> {
    await this.gqlQuery(gql.DELETE_TAG, { id });
  }

  async getPlan(id: number): Promise<unknown> {
    const data = await this.gqlQuery<{ plan: unknown }>(gql.GET_PLAN, { id });
    return data.plan;
  }

  async getSimulationDataset(id: number): Promise<{ reason: string | null; status: string }> {
    const data = await this.gqlQuery<{
      simulation_dataset_by_pk: { reason: string | null; status: string };
    }>(convertToQuery(gql.SUB_SIMULATION_DATASET), { simulationDatasetId: id });
    return data.simulation_dataset_by_pk;
  }

  getUser(): ApiUser | null {
    return this.user;
  }

  async getUsers(): Promise<Array<{ username: string }>> {
    const data = await this.gqlQuery<{ users: Array<{ username: string }> }>(convertToQuery(gql.SUB_USERS));
    return data.users;
  }

  /**
   * Execute a GraphQL query/mutation against Hasura.
   */
  private async gqlQuery<T>(
    queryString: string,
    variables: Record<string, unknown> = {},
    role: string = 'aerie_admin',
  ): Promise<T> {
    if (!this.user) {
      throw new Error('Not logged in. Call login() first.');
    }

    const response = await fetch(this.hasuraUrl, {
      body: JSON.stringify({ query: queryString, variables }),
      headers: {
        Authorization: `Bearer ${this.user.token}`,
        'Content-Type': 'application/json',
        'x-hasura-role': role,
        'x-hasura-user-id': this.user.id,
      },
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.statusText}`);
    }

    const json = await response.json();

    if (json.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(json.errors, null, 2)}`);
    }

    return json.data;
  }

  /**
   * Login via Gateway and store the token for subsequent requests.
   */
  async login(username: string, password: string): Promise<ApiUser> {
    const response = await fetch(`${this.gatewayUrl}/auth/login`, {
      body: JSON.stringify({ password, username }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`);
    }

    const data: ReqAuthResponse = await response.json();

    if (!data.success || !data.token) {
      throw new Error(`Login failed: ${data.message ?? 'Unknown error'}`);
    }

    this.user = { id: username, token: data.token };
    return this.user;
  }

  /**
   * Set the user/token directly (e.g., from storage state).
   */
  setUser(user: ApiUser): void {
    this.user = user;
  }

  async simulate(planId: number, force: boolean = false): Promise<{ simulationDatasetId: number }> {
    const data = await this.gqlQuery<{ simulate: { simulationDatasetId: number } }>(gql.SIMULATE, {
      force,
      planId,
    });
    return data.simulate;
  }

  /**
   * Upload a JAR file to the Gateway and return the uploaded file ID.
   */
  async uploadFile(filePath: string): Promise<number> {
    if (!this.user) {
      throw new Error('Not logged in. Call login() first.');
    }

    const fileBuffer = fs.readFileSync(filePath);
    const fileName = nodePath.basename(filePath);

    // Convert Buffer to ArrayBuffer for Blob compatibility
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength,
    ) as ArrayBuffer;

    const formData = new FormData();
    formData.append('file', new Blob([arrayBuffer]), fileName);

    const response = await fetch(`${this.gatewayUrl}/file`, {
      body: formData,
      headers: {
        Authorization: `Bearer ${this.user.token}`,
        'x-hasura-role': 'aerie_admin',
        'x-hasura-user-id': this.user.id,
      },
      method: 'POST',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`File upload failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data.id;
  }

  /**
   * Wait for simulation to complete with polling.
   */
  async waitForSimulation(
    simulationDatasetId: number,
    timeoutMs: number = 60000,
    pollIntervalMs: number = 1000,
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const dataset = await this.gqlQuery<{
        simulation_dataset_by_pk: { reason: string | null; status: string };
      }>(convertToQuery(gql.SUB_SIMULATION_DATASET), { simulationDatasetId });

      if (dataset.simulation_dataset_by_pk.status === 'success') {
        return;
      }

      if (dataset.simulation_dataset_by_pk.status === 'failed') {
        throw new Error('Simulation failed');
      }

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Simulation timed out after ${timeoutMs}ms`);
  }
}

/**
 * Create an AerieApi instance and login with the test user.
 * Convenience function for common test setup.
 */
export async function createAuthenticatedApi(
  username: string = 'test',
  password: string = 'test',
  hasuraUrl: string = DEFAULT_HASURA_URL,
  gatewayUrl: string = DEFAULT_GATEWAY_URL,
): Promise<AerieApi> {
  const api = new AerieApi(hasuraUrl, gatewayUrl);
  await api.login(username, password);
  return api;
}

/**
 * Read shared test data that was written during global setup.
 * This includes the pre-uploaded JAR ID for model creation.
 */
export function getSharedTestData(): SharedTestData {
  const __filename = url.fileURLToPath(import.meta.url);
  const __dirname = nodePath.dirname(__filename);
  const sharedDataPath = nodePath.join(__dirname, '../../e2e-test-results/.shared/test-data.json');

  if (!fs.existsSync(sharedDataPath)) {
    throw new Error(
      `Shared test data not found at ${sharedDataPath}. ` +
        'Make sure global setup has run successfully before running tests.',
    );
  }

  const data = fs.readFileSync(sharedDataPath, 'utf-8');
  return JSON.parse(data) as SharedTestData;
}

/**
 * Result of setting up a test with model and plan via API.
 */
export interface TestSetupResult {
  api: AerieApi;
  constraints: Constraints;
  context: BrowserContext;
  modelId: number;
  modelName: string;
  models: Models;
  page: Page;
  plan: Plan;
  planId: number;
  planName: string;
  plans: Plans;
  schedulingConditions: SchedulingConditions;
  schedulingGoals: SchedulingGoals;
}

/**
 * Options for setting up a test.
 */
export interface TestSetupOptions {
  modelName?: string;
  planDuration?: string;
  planName?: string;
  planStartTime?: string;
}

/**
 * Set up a complete test environment with model, plan, and UI fixtures.
 * This is a convenience function that handles the common boilerplate for API-based tests.
 *
 * Usage in test.beforeAll:
 * ```typescript
 * let setup: TestSetupResult;
 *
 * test.beforeAll(async ({ browser }) => {
 *   setup = await setupTest(browser);
 * });
 *
 * test.afterAll(async () => {
 *   await teardownTest(setup);
 * });
 * ```
 */
export async function setupTest(browser: Browser, options: TestSetupOptions = {}): Promise<TestSetupResult> {
  const modelName = options.modelName ?? uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  const planName = options.planName ?? uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  const planDuration = options.planDuration ?? '432000000000'; // 5 days in microseconds
  const planStartTime = options.planStartTime ?? '2022-001T00:00:00';

  // Initialize API client and login
  const api = new AerieApi();
  await api.login('test', 'test');

  // Use pre-uploaded JAR from global setup
  const { jarId } = getSharedTestData();

  // Create model via API
  const model = await api.createModel({
    jar_id: jarId,
    mission: 'test',
    name: modelName,
    version: '1.0.0',
  });
  const modelId = model.id;

  // Create plan via API
  const planResult = await api.createPlan({
    duration: planDuration,
    model_id: modelId,
    name: planName,
    start_time: planStartTime,
  });
  const planId = planResult.id;

  // Set up browser context WITH auth state
  const context = await browser.newContext({ storageState: STORAGE_STATE });
  const page = await context.newPage();

  // Initialize fixture classes for UI interactions
  const models = new Models(page);
  models.modelId = String(modelId);
  models.modelName = modelName;

  const plans = new Plans(page, models);
  plans.planId = String(planId);
  plans.planName = planName;

  const constraints = new Constraints(page);
  const schedulingConditions = new SchedulingConditions(page);
  const schedulingGoals = new SchedulingGoals(page);
  const plan = new Plan(page, plans, constraints, schedulingGoals, schedulingConditions);

  return {
    api,
    constraints,
    context,
    modelId,
    modelName,
    models,
    page,
    plan,
    planId,
    planName,
    plans,
    schedulingConditions,
    schedulingGoals,
  };
}

/**
 * Clean up test resources created by setupTest.
 * Deletes the plan and model via API, then closes the browser context.
 */
export async function teardownTest(setup: TestSetupResult): Promise<void> {
  // Clean up via API - much faster than UI navigation
  if (setup.planId) {
    try {
      await setup.api.deletePlan(setup.planId);
    } catch {
      // Ignore cleanup errors
    }
  }
  if (setup.modelId) {
    try {
      await setup.api.deleteModel(setup.modelId);
    } catch {
      // Ignore cleanup errors
    }
  }

  await setup.page.close();
  await setup.context.close();
}
