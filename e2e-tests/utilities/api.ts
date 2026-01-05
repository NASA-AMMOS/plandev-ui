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
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import url from 'url';
import { STORAGE_STATE, USER_STORAGE_STATES } from '../../playwright.config.js';
import type { ActionDefinition } from '../../src/types/actions.js';
import { ActivityDirectiveInsertInput } from '../../src/types/activity.js';
import { BaseUser } from '../../src/types/app.js';
import type { ReqAuthResponse } from '../../src/types/auth';
import type { ConstraintInsertInput } from '../../src/types/constraint.js';
import { ExpansionRuleInsertInput, ExpansionRuleSlim, ExpansionSet } from '../../src/types/expansion.js';
import { DerivationGroupInsertInput } from '../../src/types/external-source.js';
import { ModelInsertInput, ModelSetInput } from '../../src/types/model.js';
import { PlanInsertInput, PlanSchema, PlanSlim } from '../../src/types/plan.js';
import { SchedulingConditionInsertInput, SchedulingGoalInsertInput } from '../../src/types/scheduling.js';
import type {
  ChannelDictionaryMetadata,
  CommandDictionaryMetadata,
  ParameterDictionaryMetadata,
  Parcel,
  ParcelInsertInput,
  SequenceAdaptationMetadata,
} from '../../src/types/sequencing.js';
import { ExternalDatasetInput, ResourceType } from '../../src/types/simulation.js';
import { ViewInsertInput } from '../../src/types/view.js';
import type { Workspace } from '../../src/types/workspace.js';
import { convertToQuery } from '../../src/utilities/generic.js';
import gql from '../../src/utilities/gql.js';
import { getIntervalFromDoyRange } from '../../src/utilities/time.js';
import { Constraints } from '../fixtures/Constraints.js';
import { Models } from '../fixtures/Models.js';
import { Plan } from '../fixtures/Plan.js';
import { Plans } from '../fixtures/Plans.js';
import { SchedulingConditions } from '../fixtures/SchedulingConditions.js';
import { SchedulingGoals } from '../fixtures/SchedulingGoals.js';
import { View } from '../fixtures/View.js';

// Load .env file if it exists (Node.js doesn't load it automatically)
const envPath = nodePath.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex);
        const value = trimmed.slice(eqIndex + 1).replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

// Default URLs from environment variables, with fallbacks for local development
const DEFAULT_HASURA_URL = process.env.PUBLIC_HASURA_CLIENT_URL ?? 'http://localhost:8080/v1/graphql';
const DEFAULT_GATEWAY_URL = process.env.PUBLIC_GATEWAY_CLIENT_URL ?? 'http://localhost:9000';
const DEFAULT_WORKSPACE_URL = process.env.PUBLIC_WORKSPACE_CLIENT_URL ?? 'http://localhost:9200';

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
  private user: BaseUser | null = null;
  private workspaceUrl: string;

  constructor(
    hasuraUrl: string = DEFAULT_HASURA_URL,
    gatewayUrl: string = DEFAULT_GATEWAY_URL,
    workspaceUrl: string = DEFAULT_WORKSPACE_URL,
  ) {
    this.hasuraUrl = hasuraUrl;
    this.gatewayUrl = gatewayUrl;
    this.workspaceUrl = workspaceUrl;
  }

  async addConstraintModelSpecifications(
    modelId: number,
    constraintSpecs: Array<{ constraintId: number; constraintRevision?: number | null }>,
  ): Promise<void> {
    const constraintSpecsToAdd = constraintSpecs.map((spec, index) => ({
      arguments: {},
      constraint_id: spec.constraintId,
      constraint_revision: spec.constraintRevision ?? null,
      model_id: modelId,
      order: index,
    }));
    await this.gqlQuery(gql.UPDATE_CONSTRAINT_MODEL_SPECIFICATIONS, {
      constraintInvocationIdsToDelete: [],
      constraintSpecsToAdd,
    });
  }

  async addSchedulingConditionModelSpecifications(
    modelId: number,
    conditionSpecs: Array<{ conditionId: number; conditionRevision?: number | null }>,
  ): Promise<void> {
    const conditionSpecsToUpdate = conditionSpecs.map(spec => ({
      condition_id: spec.conditionId,
      condition_revision: spec.conditionRevision ?? null,
      model_id: modelId,
    }));
    await this.gqlQuery(gql.UPDATE_SCHEDULING_CONDITION_MODEL_SPECIFICATIONS, {
      conditionIdsToDelete: [],
      conditionSpecsToUpdate,
      modelId,
    });
  }

  async addSchedulingGoalModelSpecifications(
    modelId: number,
    goalSpecs: Array<{ goalId: number; goalRevision?: number | null; priority?: number }>,
  ): Promise<void> {
    const goalSpecsToAdd = goalSpecs.map((spec, index) => ({
      goal_id: spec.goalId,
      goal_revision: spec.goalRevision ?? null,
      model_id: modelId,
      priority: spec.priority ?? index,
    }));
    await this.gqlQuery(gql.UPDATE_SCHEDULING_GOAL_MODEL_SPECIFICATIONS, {
      goalIdsToDelete: [],
      goalSpecsToAdd,
    });
  }

  async createActionDefinition(
    workspaceId: number,
    name: string,
    description: string,
    actionFilePath: string,
  ): Promise<{ id: number }> {
    // Upload the action file first
    const actionFileId = await this.uploadFile(actionFilePath);

    // Create the action definition
    const data = await this.gqlQuery<{ insert_action_definition_one: { id: number } }>(gql.CREATE_ACTION_DEFINITION, {
      actionDefinitionInsertInput: {
        action_file_id: actionFileId,
        description,
        name,
        workspace_id: workspaceId,
      },
    });
    return { id: data.insert_action_definition_one.id };
  }

  async createActivityDirective(activityDirective: ActivityDirectiveInsertInput): Promise<{ id: number }> {
    const data = await this.gqlQuery<{ insert_activity_directive_one: { id: number } }>(gql.CREATE_ACTIVITY_DIRECTIVE, {
      activityDirectiveInsertInput: activityDirective,
    });
    return { id: data.insert_activity_directive_one.id };
  }

  async createActivityDirectives(
    activityDirectives: ActivityDirectiveInsertInput[],
  ): Promise<Array<{ id: number; type: string }>> {
    const data = await this.gqlQuery<{
      insert_activity_directive: { returning: Array<{ id: number; type: string }> };
    }>(gql.CREATE_ACTIVITY_DIRECTIVES, {
      activityDirectivesInsertInput: activityDirectives,
    });
    return data.insert_activity_directive.returning;
  }

  async createConstraint(constraint: ConstraintInsertInput): Promise<{ id: number }> {
    // Create metadata with nested versions using CREATE_CONSTRAINT
    const data = await this.gqlQuery<{ constraint: { id: number } }>(gql.CREATE_CONSTRAINT, { constraint });
    return { id: data.constraint.id };
  }

  async createDerivationGroup(derivationGroup: DerivationGroupInsertInput): Promise<{ name: string }> {
    const data = await this.gqlQuery<{ createDerivationGroup: { name: string } }>(gql.CREATE_DERIVATION_GROUP, {
      derivationGroup,
    });
    return data.createDerivationGroup;
  }

  async createDictionary(
    dictionaryXml: string,
    persistDictionaryToFilesystem: boolean = false,
  ): Promise<{
    channel?: ChannelDictionaryMetadata;
    command?: CommandDictionaryMetadata;
    parameter?: ParameterDictionaryMetadata;
  }> {
    const data = await this.gqlQuery<{
      createDictionary: {
        channel?: ChannelDictionaryMetadata;
        command?: CommandDictionaryMetadata;
        parameter?: ParameterDictionaryMetadata;
      };
    }>(gql.CREATE_DICTIONARY, { dictionary: dictionaryXml, persistDictionaryToFilesystem });
    return data.createDictionary;
  }

  async createExpansionRule(rule: ExpansionRuleInsertInput): Promise<{ id: number }> {
    const data = await this.gqlQuery<{ createExpansionRule: { id: number } }>(gql.CREATE_EXPANSION_RULE, { rule });
    return data.createExpansionRule;
  }

  async createExpansionSet(
    parcelId: number,
    modelId: number,
    expansionRuleIds: number[],
    name?: string,
    description?: string,
  ): Promise<{ id: number }> {
    const data = await this.gqlQuery<{ createExpansionSet: { id: number } }>(gql.CREATE_EXPANSION_SET, {
      description,
      expansionRuleIds,
      modelId,
      name,
      parcelId,
    });
    return data.createExpansionSet;
  }

  async createExtension(
    label: string,
    url: string,
    description: string = '',
    roles: string[] = ['aerie_admin'],
  ): Promise<{ id: number }> {
    const data = await this.gqlQuery<{
      insert_extensions: { returning: Array<{ id: number }> };
    }>(
      `mutation InsertExtension($label: String!, $description: String!, $url: String!, $roles: [extension_roles_insert_input!]!) {
        insert_extensions(objects: {
          label: $label,
          description: $description,
          url: $url,
          extension_roles: { data: $roles }
        }) {
          returning { id }
        }
      }`,
      {
        description,
        label,
        roles: roles.map(role => ({ role })),
        url,
      },
    );
    return { id: data.insert_extensions.returning[0].id };
  }

  async createExternalDataset(planId: number, dataset: ExternalDatasetInput): Promise<number> {
    // Create a JSON file from the dataset and upload via gateway
    const datasetJson = JSON.stringify(dataset);
    const blob = new Blob([datasetJson], { type: 'application/json' });

    const formData = new FormData();
    formData.append('plan_id', `${planId}`);
    formData.append('external_dataset', blob, 'external-dataset.json');

    const response = await fetch(`${this.gatewayUrl}/uploadDataset`, {
      body: formData,
      headers: { Authorization: `Bearer ${this.user?.token}` },
      method: 'POST',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload external dataset: ${response.status} ${errorText}`);
    }

    const datasetId = await response.json();
    return datasetId as number;
  }

  async createExternalSourceEventTypes(
    sourceTypes: Record<string, object>,
    eventTypes: Record<string, object>,
  ): Promise<void> {
    // Each type entry should be the JSON Schema directly (with type, properties, etc.)
    const body = JSON.stringify({
      event_types: JSON.stringify(eventTypes),
      source_types: JSON.stringify(sourceTypes),
    });
    await this.gatewayRequest('/uploadExternalSourceEventTypes', 'POST', body);
  }

  async createModel(model: ModelInsertInput): Promise<{ id: number }> {
    const data = await this.gqlQuery<{ createModel: { id: number } }>(gql.CREATE_MODEL, { model });
    return data.createModel;
  }

  async createParcel(parcel: ParcelInsertInput): Promise<{ id: number }> {
    const data = await this.gqlQuery<{ createParcel: { id: number } }>(gql.CREATE_PARCEL, { parcel });
    return data.createParcel;
  }

  async createPlan(plan: PlanInsertInput): Promise<{ id: number }> {
    const data = await this.gqlQuery<{ createPlan: { id: number } }>(gql.CREATE_PLAN, { plan });
    return data.createPlan;
  }

  async createPlanDerivationGroup(planId: number, derivationGroupName: string): Promise<void> {
    await this.gqlQuery(gql.CREATE_PLAN_DERIVATION_GROUP, {
      source: {
        derivation_group_name: derivationGroupName,
        plan_id: planId,
      },
    });
  }

  async createSchedulingCondition(condition: SchedulingConditionInsertInput): Promise<{ id: number }> {
    const data = await this.gqlQuery<{ createSchedulingCondition: { id: number } }>(gql.CREATE_SCHEDULING_CONDITION, {
      condition,
    });
    return data.createSchedulingCondition;
  }

  async createSchedulingGoal(goal: SchedulingGoalInsertInput): Promise<{ id: number }> {
    // Use nested versions like effects.ts createSchedulingGoal
    const data = await this.gqlQuery<{ createSchedulingGoal: { id: number } }>(gql.CREATE_SCHEDULING_GOAL, { goal });
    return data.createSchedulingGoal;
  }

  async createSequenceAdaptation(adaptation: { adaptation: string; name: string }): Promise<{ name: string }> {
    const data = await this.gqlQuery<{ createSequenceAdaptation: { name: string } }>(gql.CREATE_SEQUENCE_ADAPTATION, {
      adaptation,
    });
    return data.createSequenceAdaptation;
  }

  async createTag(name: string, color: string = '#000000'): Promise<{ id: number }> {
    // CREATE_TAG returns directly from INSERT_TAG without an alias
    const data = await this.gqlQuery<{ insert_tags_one: { id: number } }>(gql.CREATE_TAG, {
      tag: { color, name },
    });
    return data.insert_tags_one;
  }

  async createView(view: ViewInsertInput): Promise<{ id: number }> {
    const data = await this.gqlQuery<{ newView: { id: number } }>(gql.CREATE_VIEW, { view });
    return data.newView;
  }

  async createWorkspace(location: string, parcelId: number, name?: string): Promise<number> {
    if (!this.user) {
      throw new Error('Not logged in. Call login() first.');
    }

    const body = JSON.stringify({
      parcelId,
      workspaceLocation: location,
      ...(name ? { workspaceName: name } : {}),
    });

    const response = await fetch(`${this.workspaceUrl}/ws/create`, {
      body,
      headers: {
        Authorization: `Bearer ${this.user.token}`,
        'Content-Type': 'application/json',
        'x-hasura-role': 'aerie_admin',
        'x-hasura-user-id': this.user.id as string,
      },
      method: 'POST',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Workspace creation failed: ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Create a file or folder in a workspace.
   * @param workspaceId - The workspace ID
   * @param path - The path to create (e.g., 'folder/file.txt')
   * @param content - File content (string or Uint8Array), or undefined for folders
   */
  async createWorkspaceItem(workspaceId: number, path: string, content?: string | Uint8Array): Promise<void> {
    if (!this.user) {
      throw new Error('Not logged in. Call login() first.');
    }

    const isFolder = content === undefined;
    const type = isFolder ? 'directory' : 'file';

    let body: FormData | undefined;
    if (!isFolder) {
      const pathParts = path.split('/');
      const fileName = pathParts[pathParts.length - 1];

      let blob: Blob;
      if (typeof content === 'string') {
        blob = new Blob([content]);
      } else {
        // Convert Uint8Array to ArrayBuffer for Blob compatibility
        const arrayBuffer = content.buffer.slice(
          content.byteOffset,
          content.byteOffset + content.byteLength,
        ) as ArrayBuffer;
        blob = new Blob([arrayBuffer]);
      }

      body = new FormData();
      body.append('file', blob, fileName);
    }

    const response = await fetch(`${this.workspaceUrl}/ws/${workspaceId}/${path}?type=${type}`, {
      body,
      headers: {
        Authorization: `Bearer ${this.user.token}`,
        'x-hasura-role': 'aerie_admin',
        'x-hasura-user-id': this.user.id as string,
      },
      method: 'PUT',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Workspace ${type} creation failed: ${response.statusText} - ${errorText}`);
    }
  }

  async deleteActionDefinition(id: number): Promise<void> {
    // No built-in DELETE_ACTION_DEFINITION in gql.ts, using raw mutation
    await this.gqlQuery(
      `mutation DeleteActionDefinition($id: Int!) {
        delete_action_definition_by_pk(id: $id) { id }
      }`,
      { id },
    );
  }

  async deleteActivityDirectives(planId: number, activityIds: number[]): Promise<void> {
    await this.gqlQuery(gql.DELETE_ACTIVITY_DIRECTIVES, {
      activity_ids: activityIds,
      plan_id: planId,
    });
  }

  async deleteChannelDictionary(id: number): Promise<void> {
    await this.gqlQuery(gql.DELETE_CHANNEL_DICTIONARY, { id });
  }

  async deleteCommandDictionary(id: number): Promise<void> {
    await this.gqlQuery(gql.DELETE_COMMAND_DICTIONARY, { id });
  }

  async deleteConstraint(id: number): Promise<void> {
    await this.gqlQuery(gql.DELETE_CONSTRAINT_METADATA, { id });
  }

  async deleteDerivationGroups(derivationGroupNames: string[]): Promise<void> {
    await this.gqlQuery(gql.DELETE_DERIVATION_GROUPS, { derivationGroupNames });
  }

  async deleteExpansionRule(id: number): Promise<void> {
    await this.gqlQuery(gql.DELETE_EXPANSION_RULE, { id });
  }

  async deleteExpansionSequence(seqId: string, simulationDatasetId: number): Promise<void> {
    await this.gqlQuery(gql.DELETE_EXPANSION_SEQUENCE, { seqId, simulationDatasetId });
  }

  async deleteExpansionSet(id: number): Promise<void> {
    await this.gqlQuery(gql.DELETE_EXPANSION_SET, { id });
  }

  async deleteExtension(id: number): Promise<void> {
    await this.gqlQuery(
      `mutation DeleteExtension($id: Int!) {
        delete_extensions(where: { id: { _eq: $id } }) {
          returning { id }
        }
      }`,
      { id },
    );
  }

  async deleteExternalEventTypes(names: string[]): Promise<void> {
    await this.gqlQuery(gql.DELETE_EXTERNAL_EVENT_TYPE, { names });
  }

  async deleteExternalSourceTypes(names: string[]): Promise<void> {
    await this.gqlQuery(gql.DELETE_EXTERNAL_SOURCE_TYPE, { names });
  }

  async deleteExternalSources(derivationGroupName: string, sourceKeys: string[]): Promise<void> {
    await this.gqlQuery(gql.DELETE_EXTERNAL_SOURCES, { derivationGroupName, sourceKeys });
  }

  async deleteModel(id: number): Promise<void> {
    await this.gqlQuery(gql.DELETE_MODEL, { id });
  }

  async deleteParameterDictionary(id: number): Promise<void> {
    await this.gqlQuery(gql.DELETE_PARAMETER_DICTIONARY, { id });
  }

  async deleteParcel(id: number): Promise<void> {
    await this.gqlQuery(gql.DELETE_PARCEL, { id });
  }

  async deletePlan(id: number): Promise<void> {
    await this.gqlQuery(gql.DELETE_PLAN, { id });
  }

  async deleteSchedulingCondition(id: number): Promise<void> {
    await this.gqlQuery(gql.DELETE_SCHEDULING_CONDITION_METADATA, { id });
  }

  async deleteSchedulingGoal(id: number): Promise<void> {
    await this.gqlQuery(gql.DELETE_SCHEDULING_GOAL_METADATA, { id });
  }

  async deleteSequenceAdaptation(id: number): Promise<void> {
    await this.gqlQuery(gql.DELETE_SEQUENCE_ADAPTATION, { id });
  }

  async deleteSequenceTemplate(sequenceTemplateId: number): Promise<void> {
    await this.gqlQuery(gql.DELETE_SEQUENCE_TEMPLATE, { sequenceTemplateId });
  }

  async deleteTag(id: number): Promise<void> {
    await this.gqlQuery(gql.DELETE_TAG, { id });
  }

  async deleteView(id: number): Promise<void> {
    await this.gqlQuery(gql.DELETE_VIEW, { id });
  }

  async deleteWorkspace(id: number): Promise<void> {
    if (!this.user) {
      throw new Error('Not logged in. Call login() first.');
    }

    const response = await fetch(`${this.workspaceUrl}/ws/${id}`, {
      headers: {
        Authorization: `Bearer ${this.user.token}`,
        'x-hasura-role': 'aerie_admin',
        'x-hasura-user-id': this.user.id as string,
      },
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Workspace deletion failed: ${response.statusText} - ${errorText}`);
    }
  }

  /**
   * Execute a request against the Gateway API.
   */
  private async gatewayRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: FormData | string,
  ): Promise<T> {
    if (!this.user) {
      throw new Error('Not logged in. Call login() first.');
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.user.token}`,
      'x-hasura-role': 'aerie_admin',
      'x-hasura-user-id': this.user.id as string,
    };

    // Don't set Content-Type for FormData - browser will set it with boundary
    if (body && typeof body === 'string') {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${this.gatewayUrl}${endpoint}`, {
      body,
      headers,
      method,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gateway request failed: ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  async getActionDefinitions(): Promise<ActionDefinition[]> {
    const data = await this.gqlQuery<{ action_definition: ActionDefinition[] }>(
      convertToQuery(gql.SUB_ACTION_DEFINITIONS),
    );
    return data.action_definition;
  }

  async getChannelDictionaries(): Promise<ChannelDictionaryMetadata[]> {
    const data = await this.gqlQuery<{
      channel_dictionary: ChannelDictionaryMetadata[];
    }>(convertToQuery(gql.SUB_CHANNEL_DICTIONARIES));
    return data.channel_dictionary;
  }

  async getCommandDictionaries(): Promise<CommandDictionaryMetadata[]> {
    const data = await this.gqlQuery<{
      // TODO the actual usage of SUB_COMMAND_DICTIONARIES maps to CommandDictionaryMetadata[] but the subscription does NOT return full CommandDictionaryMetadata objects!
      // This is the same for channel dictionaries
      command_dictionary: CommandDictionaryMetadata[];
    }>(convertToQuery(gql.SUB_COMMAND_DICTIONARIES));
    return data.command_dictionary;
  }

  async getConstraints(): Promise<Array<{ id: number; name: string }>> {
    const data = await this.gqlQuery<{ constraints: Array<{ id: number; name: string }> }>(
      convertToQuery(gql.SUB_CONSTRAINTS),
    );
    return data.constraints;
  }

  async getDerivationGroups(): Promise<Array<{ name: string; source_type_name: string }>> {
    const data = await this.gqlQuery<{
      derivationGroups: Array<{ name: string; source_type_name: string }>;
    }>(convertToQuery(gql.SUB_DERIVATION_GROUPS));
    return data.derivationGroups;
  }

  async getExpansionRules(): Promise<ExpansionRuleSlim[]> {
    const data = await this.gqlQuery<{ expansionRules: ExpansionRuleSlim[] }>(convertToQuery(gql.SUB_EXPANSION_RULES));
    return data.expansionRules;
  }

  async getExpansionSets(): Promise<ExpansionSet[]> {
    const data = await this.gqlQuery<{ expansionSets: ExpansionSet[] }>(convertToQuery(gql.SUB_EXPANSION_SETS));
    return data.expansionSets;
  }

  async getExtensions(): Promise<Array<{ description: string; id: number; label: string; url: string }>> {
    const data = await this.gqlQuery<{
      extensions: Array<{ description: string; id: number; label: string; url: string }>;
    }>(convertToQuery(gql.SUB_EXTENSIONS));
    return data.extensions;
  }

  async getExternalEventTypes(): Promise<Array<{ attribute_schema: object; name: string }>> {
    const data = await this.gqlQuery<{ models: Array<{ attribute_schema: object; name: string }> }>(
      convertToQuery(gql.SUB_EXTERNAL_EVENT_TYPES),
    );
    return data.models;
  }

  async getExternalSourceTypes(): Promise<Array<{ name: string }>> {
    const data = await this.gqlQuery<{ models: Array<{ name: string }> }>(
      convertToQuery(gql.SUB_EXTERNAL_SOURCE_TYPES),
    );
    return data.models;
  }

  async getExternalSources(): Promise<Array<{ derivation_group_name: string; key: string }>> {
    const data = await this.gqlQuery<{ models: Array<{ derivation_group_name: string; key: string }> }>(
      convertToQuery(gql.SUB_EXTERNAL_SOURCES),
    );
    return data.models;
  }

  async getModels(): Promise<Array<{ id: number; name: string }>> {
    const data = await this.gqlQuery<{ models: Array<{ id: number; name: string }> }>(gql.GET_MODELS);
    return data.models;
  }

  async getParameterDictionaries(): Promise<ParameterDictionaryMetadata[]> {
    const data = await this.gqlQuery<{
      parameter_dictionary: ParameterDictionaryMetadata[];
    }>(convertToQuery(gql.SUB_PARAMETER_DICTIONARIES));
    return data.parameter_dictionary;
  }

  async getParcels(): Promise<Parcel[]> {
    const data = await this.gqlQuery<{ parcel: Parcel[] }>(convertToQuery(gql.SUB_PARCELS));
    return data.parcel;
  }

  async getPlan(id: number): Promise<PlanSchema> {
    const data = await this.gqlQuery<{ plan: PlanSchema }>(gql.GET_PLAN, { id });
    return data.plan;
  }

  async getPlans(): Promise<PlanSlim[]> {
    const data = await this.gqlQuery<{ plans: PlanSlim[] }>(convertToQuery(gql.SUB_PLANS));
    return data.plans;
  }

  async getResourceTypes(modelId: number): Promise<ResourceType[]> {
    const data = await this.gqlQuery<{ resource_types: ResourceType[] }>(gql.GET_RESOURCE_TYPES, {
      model_id: modelId,
    });
    const { resource_types: resourceTypes } = data;
    return resourceTypes;
  }

  async getSchedulingConditions(): Promise<Array<{ id: number; name: string }>> {
    const data = await this.gqlQuery<{ conditions: Array<{ id: number; name: string }> }>(
      convertToQuery(gql.SUB_SCHEDULING_CONDITIONS),
    );
    return data.conditions;
  }

  async getSchedulingGoals(): Promise<Array<{ id: number; name: string }>> {
    const data = await this.gqlQuery<{ goals: Array<{ id: number; name: string }> }>(
      convertToQuery(gql.SUB_SCHEDULING_GOALS),
    );
    return data.goals;
  }

  async getSequenceAdaptations(): Promise<SequenceAdaptationMetadata[]> {
    const data = await this.gqlQuery<{
      sequence_adaptation: SequenceAdaptationMetadata[];
    }>(convertToQuery(gql.SUB_SEQUENCE_ADAPTATIONS));
    return data.sequence_adaptation;
  }

  async getSimulationDataset(id: number): Promise<{ reason: string | null; status: string }> {
    const data = await this.gqlQuery<{
      simulation_dataset_by_pk: { reason: string | null; status: string };
    }>(convertToQuery(gql.SUB_SIMULATION_DATASET), { simulationDatasetId: id });
    return data.simulation_dataset_by_pk;
  }

  async getTags(): Promise<Array<{ id: number; name: string }>> {
    const data = await this.gqlQuery<{ tags: Array<{ id: number; name: string }> }>(convertToQuery(gql.SUB_TAGS));
    return data.tags;
  }

  getUser(): BaseUser | null {
    return this.user;
  }

  async getUsers(): Promise<Array<{ username: string }>> {
    const data = await this.gqlQuery<{ users: Array<{ username: string }> }>(convertToQuery(gql.SUB_USERS));
    return data.users;
  }

  async getViews(): Promise<Array<{ id: number; name: string }>> {
    const data = await this.gqlQuery<{ views: Array<{ id: number; name: string }> }>(convertToQuery(gql.SUB_VIEWS));
    return data.views;
  }

  async getWorkspaces(): Promise<Workspace[]> {
    const data = await this.gqlQuery<{ workspace: Workspace[] }>(convertToQuery(gql.SUB_WORKSPACES));
    return data.workspace;
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
        'x-hasura-user-id': this.user.id as string,
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
  async login(username: string, password: string): Promise<BaseUser> {
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
  setUser(user: BaseUser): void {
    this.user = user;
  }

  async simulate(planId: number, force: boolean = false): Promise<{ simulationDatasetId: number }> {
    const data = await this.gqlQuery<{ simulate: { simulationDatasetId: number } }>(gql.SIMULATE, {
      force,
      planId,
    });
    return data.simulate;
  }

  async updateModel(id: number, model: Partial<ModelSetInput>): Promise<void> {
    await this.gqlQuery(gql.UPDATE_MODEL, { id, model });
  }

  /**
   * Upload an external source JSON file to create events.
   */
  async uploadExternalSource(
    derivationGroupName: string,
    sourceJson: {
      events: Array<{
        attributes: object;
        duration: string;
        event_type_name: string;
        key: string;
        start_time: string;
      }>;
      source: {
        attributes: object;
        key: string;
        period: { end_time: string; start_time: string };
        source_type_name: string;
        valid_at: string;
      };
    },
  ): Promise<void> {
    if (!this.user) {
      throw new Error('Not logged in. Call login() first.');
    }

    const formData = new FormData();
    formData.append('derivation_group_name', derivationGroupName);
    const blob = new Blob([JSON.stringify(sourceJson)], { type: 'application/json' });
    formData.append('external_source_file', blob, 'external_source.json');

    const response = await fetch(`${this.gatewayUrl}/uploadExternalSource`, {
      body: formData,
      headers: {
        Authorization: `Bearer ${this.user.token}`,
        'x-hasura-role': 'aerie_admin',
        'x-hasura-user-id': this.user.id as string,
      },
      method: 'POST',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`External source upload failed: ${response.statusText} - ${errorText}`);
    }
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
        'x-hasura-user-id': this.user.id as string,
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
  const sharedDataPath = nodePath.join(__dirname, '../../.playwright/.shared/test-data.json');

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
 * Available test users with pre-authenticated storage states.
 * Storage states are created during global setup.
 */
export type TestUser = 'test' | 'userA' | 'userB';

/**
 * Options for setting up a test.
 */
export interface SetupOptions {
  /** Create a model via API (default: true) */
  model?: boolean;
  modelName?: string;
  /** Create a plan via API (default: true, requires model) */
  plan?: boolean;
  planEndTime?: string;
  planName?: string;
  planStartTime?: string;
  /**
   * User to authenticate as (default: 'test').
   * Each user has a pre-authenticated storage state created during global setup.
   * Use different users to test permission scenarios without login/logout.
   */
  user?: TestUser;
}

/**
 * Base result with browser context (always present).
 */
export interface BrowserSetupResult {
  context: BrowserContext;
  page: Page;
}

/**
 * Result when model is created (extends browser).
 */
export interface ModelSetupResult extends BrowserSetupResult {
  api: AerieApi;
  modelId: number;
  modelName: string;
  models: Models;
  plans: Plans;
}

/**
 * Result when model + plan are created (extends model).
 */
export interface FullSetupResult extends ModelSetupResult {
  constraints: Constraints;
  plan: Plan;
  planId: number;
  planName: string;
  schedulingConditions: SchedulingConditions;
  schedulingGoals: SchedulingGoals;
  view: View;
}

/**
 * Union of all setup result types for teardown compatibility.
 */
export type SetupResult = BrowserSetupResult | ModelSetupResult | FullSetupResult;

/**
 * Set up a test environment with configurable model and plan creation.
 *
 * By default creates model + plan. Use options to customize:
 * - `{ model: false }` - browser only (for tags, dictionaries tests)
 * - `{ plan: false }` - model only (for plans.test.ts)
 * - `{}` or no options - full setup with model + plan
 *
 * Usage:
 * ```typescript
 * // Full setup (default) - returns FullSetupResult
 * let setup: FullSetupResult;
 * test.beforeAll(async ({ browser }) => {
 *   setup = await setupTest(browser);
 * });
 *
 * // Model only - returns ModelSetupResult
 * let setup: ModelSetupResult;
 * test.beforeAll(async ({ browser }) => {
 *   setup = await setupTest(browser, { plan: false });
 * });
 *
 * // Browser only - returns BrowserSetupResult
 * let setup: BrowserSetupResult;
 * test.beforeAll(async ({ browser }) => {
 *   setup = await setupTest(browser, { model: false });
 * });
 *
 * test.afterAll(async () => {
 *   await teardownTest(setup);
 * });
 * ```
 */
// Overloads for type-safe returns based on options
export function setupTest(browser: Browser): Promise<FullSetupResult>;
export function setupTest(browser: Browser, options: { model: false; user?: TestUser }): Promise<BrowserSetupResult>;
export function setupTest(
  browser: Browser,
  options: { model?: true; plan: false; user?: TestUser },
): Promise<ModelSetupResult>;
export function setupTest(browser: Browser, options: SetupOptions): Promise<SetupResult>;

// Implementation
export async function setupTest(browser: Browser, options: SetupOptions = {}): Promise<SetupResult> {
  const createModel = options.model !== false;
  const createPlan = createModel && options.plan !== false;
  const user = options.user ?? 'test';

  // Get storage state for the specified user
  const storageState = USER_STORAGE_STATES[user] ?? STORAGE_STATE;

  // Set up browser context WITH auth state for the specified user
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();

  if (!createModel) {
    return { context, page } as BrowserSetupResult;
  }

  // Initialize API client and login with the same user as the browser context
  const api = new AerieApi();
  await api.login(user, 'test');

  // Use pre-uploaded JAR from global setup
  const { jarId } = getSharedTestData();

  // Create model via API
  const modelName = options.modelName ?? uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  const model = await api.createModel({
    jar_id: jarId,
    mission: 'test',
    name: modelName,
    version: '1.0.0',
  });

  // Initialize model fixture
  const models = new Models(page);
  models.modelId = String(model.id);
  models.modelName = modelName;

  // Initialize plans fixture (always available when model exists)
  const plans = new Plans(page, models);

  if (!createPlan) {
    return {
      api,
      context,
      modelId: model.id,
      modelName,
      models,
      page,
      plans,
    } as ModelSetupResult;
  }

  // Create plan via API
  const planName = options.planName ?? uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  const planStartTime = options.planStartTime ?? '2022-001T00:00:00';
  const planEndTime = options.planEndTime ?? '2022-006T00:00:00';
  const planResult = await api.createPlan({
    duration: getIntervalFromDoyRange(planStartTime, planEndTime),
    model_id: model.id,
    name: planName,
    start_time: planStartTime,
  });

  // Update plans fixture with created plan
  plans.planId = String(planResult.id);
  plans.planName = planName;

  // Initialize plan-related fixtures
  const constraints = new Constraints(page);
  const schedulingConditions = new SchedulingConditions(page);
  const schedulingGoals = new SchedulingGoals(page);
  const plan = new Plan(page, plans, constraints, schedulingGoals, schedulingConditions);
  const view = new View(page);

  return {
    api,
    constraints,
    context,
    modelId: model.id,
    modelName,
    models,
    page,
    plan,
    planId: planResult.id,
    planName,
    plans,
    schedulingConditions,
    schedulingGoals,
    view,
  } as FullSetupResult;
}

/**
 * Clean up API resources (plan, model) without closing browser.
 * Use this when you need to perform additional cleanup after plan deletion
 * but before closing the browser (e.g., deleting external source artifacts).
 */
export async function cleanupApiResources(setup: SetupResult): Promise<void> {
  // Clean up via API - much faster than UI navigation
  // Use 'in' checks to narrow union type
  if ('planId' in setup && 'api' in setup) {
    try {
      await setup.api.deletePlan(setup.planId);
    } catch {
      // Ignore cleanup errors
    }
  }
  if ('modelId' in setup && 'api' in setup) {
    try {
      await setup.api.deleteModel(setup.modelId);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Close browser resources (page and context).
 * Use after cleanupApiResources when you need split cleanup.
 */
export async function closeBrowserResources(setup: BrowserSetupResult): Promise<void> {
  await setup.page.close();
  await setup.context.close();
}

/**
 * Clean up test resources created by setupTest.
 * Automatically cleans up whatever was created based on what exists in the result.
 */
export async function teardownTest(setup: SetupResult): Promise<void> {
  await cleanupApiResources(setup);
  await closeBrowserResources(setup);
}
