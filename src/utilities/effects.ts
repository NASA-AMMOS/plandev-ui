import { goto } from '$app/navigation';
import { base } from '$app/paths';
import type { CommandDictionary as AmpcsCommandDictionary } from '@nasa-jpl/aerie-ampcs';
import { get } from 'svelte/store';
import { activityDirectivesMap, selectedActivityDirectiveId } from '../stores/activities';
import { checkConstraintsStatus, constraintResultsResponse } from '../stores/constraints';
import { catchError, catchSchedulingError } from '../stores/errors';
import {
  createExpansionRuleError,
  creatingExpansionSequence,
  planExpansionStatus,
  savingExpansionRule,
  savingExpansionSet,
} from '../stores/expansion';
import { createModelError, createPlanError, creatingModel, creatingPlan, models, plan } from '../stores/plan';
import { schedulingStatus, selectedSpecId } from '../stores/scheduling';
import { commandDictionaries } from '../stores/sequencing';
import { selectedSpanId, simulationDatasetId, simulationDatasetIds } from '../stores/simulation';
import { createTagError } from '../stores/tags';
import { applyViewUpdate, view } from '../stores/views';
import type {
  ActivityDirective,
  ActivityDirectiveId,
  ActivityDirectiveInsertInput,
  ActivityDirectiveSetInput,
  ActivityDirectivesMap,
  ActivityPreset,
  ActivityPresetId,
  ActivityPresetInsertInput,
  ActivityPresetSetInput,
  ActivityType,
  ActivityTypeExpansionRules,
} from '../types/activity';
import type { ActivityMetadata } from '../types/activity-metadata';
import type { BaseUser, User, UserRole } from '../types/app';
import type { ReqAuthResponse, ReqSessionResponse } from '../types/auth';
import type { Constraint, ConstraintInsertInput, ConstraintResult } from '../types/constraint';
import type {
  ExpansionRule,
  ExpansionRuleInsertInput,
  ExpansionRun,
  ExpansionSequence,
  ExpansionSequenceInsertInput,
  ExpansionSequenceToActivityInsertInput,
  ExpansionSet,
  SeqId,
} from '../types/expansion';
import type { Model, ModelInsertInput, ModelSlim } from '../types/model';
import type { DslTypeScriptResponse, TypeScriptFile } from '../types/monaco';
import type {
  ArgumentsMap,
  EffectiveArguments,
  ParameterValidationError,
  ParameterValidationResponse,
} from '../types/parameter';
import type { PermissibleQueriesMap, PermissibleQueryResponse } from '../types/permissions';
import type {
  Plan,
  PlanBranchRequestAction,
  PlanInsertInput,
  PlanMergeConflictingActivity,
  PlanMergeNonConflictingActivity,
  PlanMergeRequestSchema,
  PlanMergeResolution,
  PlanSchedulingSpec,
  PlanSchema,
  PlanSlim,
} from '../types/plan';
import type {
  SchedulingCondition,
  SchedulingConditionInsertInput,
  SchedulingGoal,
  SchedulingGoalInsertInput,
  SchedulingGoalSlim,
  SchedulingResponse,
  SchedulingSpec,
  SchedulingSpecCondition,
  SchedulingSpecConditionInsertInput,
  SchedulingSpecGoal,
  SchedulingSpecGoalInsertInput,
  SchedulingSpecInsertInput,
} from '../types/scheduling';
import type {
  CommandDictionary,
  GetSeqJsonResponse,
  SeqJson,
  UserSequence,
  UserSequenceInsertInput,
} from '../types/sequencing';
import type {
  PlanDataset,
  Profile,
  Resource,
  ResourceType,
  SimulateResponse,
  Simulation,
  SimulationInitialUpdateInput,
  SimulationTemplate,
  SimulationTemplateInsertInput,
  SimulationTemplateSetInput,
  Span,
} from '../types/simulation';
import type {
  ActivityDirectiveTagsInsertInput,
  ConstraintTagsInsertInput,
  ExpansionRuleTagsInsertInput,
  PlanTagsInsertInput,
  SchedulingGoalTagsInsertInput,
  Tag,
  TagsInsertInput,
  TagsSetInput,
} from '../types/tags';
import type { View, ViewDefinition, ViewInsertInput, ViewUpdateInput } from '../types/view';
import { ActivityDeletionAction } from './activities';
import { convertToQuery, parseFloatOrNull, setQueryParam, sleep } from './generic';
import gql, { convertToGQLArray } from './gql';
import {
  showConfirmModal,
  showCreatePlanBranchModal,
  showCreateViewModal,
  showDeleteActivitiesModal,
  showEditViewModal,
  showPlanBranchRequestModal,
  showUploadViewModal,
} from './modal';
import { queryPermissions } from './permissions';
import { reqGateway, reqHasura } from './requests';
import { sampleProfiles } from './resources';
import { Status } from './status';
import { getDoyTime, getDoyTimeFromInterval, getIntervalFromDoyRange } from './time';
import { showFailureToast, showSuccessToast } from './toast';
import { generateDefaultView, validateViewJSONAgainstSchema } from './view';

function throwPermissionError(attemptedAction: string): never {
  throw Error(`You do not have permission to: ${attemptedAction}.`);
}

/**
 * Functions that have side-effects (e.g. HTTP requests, toasts, popovers, store updates, etc.).
 */
const effects = {
  async applyPresetToActivity(
    presetId: ActivityPresetId,
    activityId: ActivityDirectiveId,
    planId: number,
    numOfUserChanges: number,
    user: User | null,
  ): Promise<void> {
    try {
      if (!queryPermissions.APPLY_PRESET_TO_ACTIVITY(user)) {
        throwPermissionError('apply a preset to an activity directive');
      }

      let confirm: boolean = true;

      if (numOfUserChanges > 0) {
        ({ confirm } = await showConfirmModal(
          'Apply Preset',
          `There ${numOfUserChanges > 1 ? 'are' : 'is'} currently ${numOfUserChanges} manually edited parameter${
            numOfUserChanges > 1 ? 's' : ''
          }. This will remove existing edits and apply preset parameters.`,
          'Apply Preset to Activity Directive',
        ));
      }

      if (confirm) {
        const data = await reqHasura(
          gql.APPLY_PRESET_TO_ACTIVITY,
          {
            activityId,
            planId,
            presetId,
          },
          user,
        );
        if (data.apply_preset_to_activity != null) {
          showSuccessToast('Preset Successfully Applied to Activity');
        } else {
          throw Error(`Unable to apply preset with ID: "${presetId}" to directive with ID: "${activityId}"`);
        }
      }
    } catch (e) {
      catchError('Preset Unable To Be Applied To Activity', e as Error);
      showFailureToast('Preset Application Failed');
    }
  },

  async applyTemplateToSimulation(
    template: SimulationTemplate,
    simulation: Simulation,
    numOfUserChanges: number,
    user: User | null,
  ): Promise<void> {
    try {
      if (!queryPermissions.UPDATE_SIMULATION(user)) {
        throwPermissionError('apply a template to a simulation');
      }

      let confirm: boolean = true;
      if (numOfUserChanges > 0) {
        ({ confirm } = await showConfirmModal(
          'Apply Simulation Template',
          `There ${numOfUserChanges > 1 ? 'are' : 'is'} currently ${numOfUserChanges} manually edited parameter${
            numOfUserChanges > 1 ? 's' : ''
          }. This will remove existing edits and apply template parameters.`,
          'Apply Template to Simulation',
        ));
      }

      if (confirm) {
        const newSimulation: Simulation = { ...simulation, arguments: template.arguments, template };

        await effects.updateSimulation(newSimulation, user);
        showSuccessToast('Template Successfully Applied to Simulation');
      }
    } catch (e) {
      catchError('Template Unable To Be Applied To Simulation', e as Error);
      showFailureToast('Template Application Failed');
    }
  },

  async changeUserRole(role: UserRole, user: User | null): Promise<ReqAuthResponse> {
    try {
      const data = await reqGateway<ReqAuthResponse>('/auth/changeRole', 'POST', JSON.stringify({ role }), user, false);
      return data;
    } catch (e) {
      catchError(e as Error);
      return {
        message: 'An unexpected error occurred',
        success: false,
        token: null,
      };
    }
  },

  async checkConstraints(user: User | null): Promise<void> {
    try {
      checkConstraintsStatus.set(Status.Incomplete);
      const currentPlan = get(plan);
      if (currentPlan !== null) {
        const { id: planId } = currentPlan;
        const data = await reqHasura<ConstraintResult[]>(
          gql.CHECK_CONSTRAINTS,
          {
            planId,
          },
          user,
        );

        const { constraintResults } = data;
        if (constraintResults != null) {
          constraintResultsResponse.set(constraintResults);
          checkConstraintsStatus.set(Status.Complete);
          showSuccessToast('Check Constraints Complete');
        } else {
          throw Error(`Unable to check constraints for plan with ID: "${currentPlan.id}"`);
        }
      } else {
        throw Error('Plan is not defined.');
      }
    } catch (e) {
      catchError('Check Constraints Failed', e as Error);
      checkConstraintsStatus.set(Status.Failed);
      showFailureToast('Check Constraints Failed');
    }
  },

  async createActivityDirective(
    argumentsMap: ArgumentsMap,
    start_time_doy: string,
    type: string,
    name: string,
    metadata: ActivityMetadata,
    user: User | null,
  ): Promise<void> {
    try {
      if (!queryPermissions.CREATE_ACTIVITY_DIRECTIVE(user)) {
        throwPermissionError('add a directive to the plan');
      }

      const currentPlan = get(plan);
      if (currentPlan !== null) {
        const start_offset = getIntervalFromDoyRange(currentPlan.start_time_doy, start_time_doy);
        const activityDirectiveInsertInput: ActivityDirectiveInsertInput = {
          anchor_id: null,
          anchored_to_start: true,
          arguments: argumentsMap,
          metadata,
          name,
          plan_id: currentPlan.id,
          start_offset,
          type,
        };
        const data = await reqHasura<ActivityDirective>(
          gql.CREATE_ACTIVITY_DIRECTIVE,
          {
            activityDirectiveInsertInput,
          },
          user,
        );
        const { insert_activity_directive_one: newActivityDirective } = data;
        if (newActivityDirective != null) {
          const { id } = newActivityDirective;

          activityDirectivesMap.update((currentActivityDirectivesMap: ActivityDirectivesMap) => ({
            ...currentActivityDirectivesMap,
            [id]: newActivityDirective,
          }));
          selectedActivityDirectiveId.set(id);
          selectedSpanId.set(null);

          showSuccessToast('Activity Directive Created Successfully');
        } else {
          throw Error(`Unable to create activity directive "${name}" on plan with ID ${currentPlan.id}`);
        }
      } else {
        throw Error('Plan is not defined.');
      }
    } catch (e) {
      catchError('Activity Directive Create Failed', e as Error);
      showFailureToast('Activity Directive Create Failed');
    }
  },

  async createActivityDirectiveTags(
    tags: ActivityDirectiveTagsInsertInput[],
    user: User | null,
  ): Promise<number | null> {
    try {
      if (!queryPermissions.CREATE_ACTIVITY_DIRECTIVE_TAGS(user)) {
        throwPermissionError('create activity directive tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(gql.CREATE_ACTIVITY_DIRECTIVE_TAGS, { tags }, user);
      const { insert_activity_directive_tags } = data;
      if (insert_activity_directive_tags != null) {
        const { affected_rows } = insert_activity_directive_tags;

        if (affected_rows !== tags.length) {
          throw Error('Some activity directive tags were not successfully created');
        }

        showSuccessToast('Activity Directive Updated Successfully');
        return affected_rows;
      } else {
        throw Error('Unable to create activity directive tags');
      }
    } catch (e) {
      catchError('Create Activity Directive Tags Failed', e as Error);
      showFailureToast('Create Activity Directive Tags Failed');
      return null;
    }
  },

  async createActivityPreset(
    argumentsMap: ArgumentsMap,
    associatedActivityType: string,
    name: string,
    modelId: number,
    user: User | null,
  ): Promise<number | null> {
    try {
      if (!queryPermissions.CREATE_ACTIVITY_PRESET(user)) {
        throwPermissionError('create an activity preset');
      }

      const activityPresetInsertInput: ActivityPresetInsertInput = {
        arguments: argumentsMap,
        associated_activity_type: associatedActivityType,
        model_id: modelId,
        name,
      };
      const data = await reqHasura<ActivityPreset>(gql.CREATE_ACTIVITY_PRESET, { activityPresetInsertInput }, user);

      if (data.insert_activity_presets_one != null) {
        const {
          insert_activity_presets_one: { id, name: presetName },
        } = data;
        showSuccessToast(`Activity Preset ${presetName} Created Successfully`);
        return id;
      } else {
        throw Error(`Unable to create activity preset "${name}"`);
      }
    } catch (e) {
      catchError('Activity Preset Create Failed', e as Error);
      showFailureToast('Activity Preset Create Failed');
      return null;
    }
  },

  async createCommandDictionary(files: FileList, user: User | null): Promise<CommandDictionary | null> {
    try {
      if (!queryPermissions.CREATE_COMMAND_DICTIONARY(user)) {
        throwPermissionError('upload a command dictionary');
      }

      const file: File = files[0];
      const dictionary = await file.text();
      const data = await reqHasura<CommandDictionary>(gql.CREATE_COMMAND_DICTIONARY, { dictionary }, user);
      const { createCommandDictionary: newCommandDictionary } = data;
      if (newCommandDictionary != null) {
        return newCommandDictionary;
      } else {
        throw Error('Unable to upload command dictionary');
      }
    } catch (e) {
      catchError('Command Dictionary Upload Failed', e as Error);
      return null;
    }
  },

  async createConstraint(
    definition: string,
    model_id: number | null,
    name: string,
    plan_id: number | null,
    user: User | null,
    description: string,
  ): Promise<number | null> {
    try {
      if (!queryPermissions.CREATE_CONSTRAINT(user)) {
        throwPermissionError('create a constraint');
      }

      const constraintInsertInput: ConstraintInsertInput = {
        definition,
        description,
        model_id: plan_id !== null ? null : model_id,
        name,
        plan_id,
      };
      const data = await reqHasura(gql.CREATE_CONSTRAINT, { constraint: constraintInsertInput }, user);
      const { createConstraint } = data;
      if (createConstraint != null) {
        const { id } = createConstraint;

        showSuccessToast('Constraint Created Successfully');
        return id;
      } else {
        throw Error(`Unable to create constraint "${name}"`);
      }
    } catch (e) {
      catchError('Constraint Creation Failed', e as Error);
      showFailureToast('Constraint Creation Failed');
      return null;
    }
  },

  async createConstraintTags(tags: ConstraintTagsInsertInput[], user: User | null): Promise<number | null> {
    try {
      if (!queryPermissions.CREATE_CONSTRAINT_TAGS(user)) {
        throwPermissionError('create constraint tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(gql.CREATE_CONSTRAINT_TAGS, { tags }, user);
      const { insert_constraint_tags } = data;
      if (insert_constraint_tags != null) {
        const { affected_rows } = insert_constraint_tags;

        if (affected_rows !== tags.length) {
          throw Error('Some constraint tags were not successfully created');
        }
        return affected_rows;
      } else {
        throw Error('Unable to create constraint tags');
      }
    } catch (e) {
      catchError('Create Constraint Tags Failed', e as Error);
      showFailureToast('Create Constraint Tags Failed');
      return null;
    }
  },

  async createExpansionRule(rule: ExpansionRuleInsertInput, user: User | null): Promise<number | null> {
    try {
      createExpansionRuleError.set(null);

      if (!queryPermissions.CREATE_EXPANSION_RULE(user)) {
        throwPermissionError('create an expansion rule');
      }

      savingExpansionRule.set(true);
      const data = await reqHasura<ExpansionRule>(gql.CREATE_EXPANSION_RULE, { rule }, user);
      const { createExpansionRule } = data;
      if (createExpansionRule != null) {
        const { id } = createExpansionRule;
        showSuccessToast('Expansion Rule Created Successfully');
        savingExpansionRule.set(false);
        return id;
      } else {
        throw Error(`Unable to create expansion rule "${rule.name}"`);
      }
    } catch (e) {
      catchError('Expansion Rule Create Failed', e as Error);
      showFailureToast('Expansion Rule Create Failed');
      savingExpansionRule.set(false);
      createExpansionRuleError.set((e as Error).message);
      return null;
    }
  },

  async createExpansionRuleTags(tags: ExpansionRuleTagsInsertInput[], user: User | null): Promise<number | null> {
    try {
      if (!queryPermissions.CREATE_EXPANSION_RULE_TAGS(user)) {
        throwPermissionError('create expansion rule tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(gql.CREATE_EXPANSION_RULE_TAGS, { tags }, user);
      const { insert_expansion_rule_tags } = data;
      if (insert_expansion_rule_tags != null) {
        const { affected_rows } = insert_expansion_rule_tags;

        if (affected_rows !== tags.length) {
          throw Error('Some expansion rule tags were not successfully created');
        }

        return affected_rows;
      } else {
        throw Error(`Unable to create expansion rule tags`);
      }
    } catch (e) {
      catchError('Create Expansion Rule Tags Failed', e as Error);
      showFailureToast('Create Expansion Rule Tags Failed');
      return null;
    }
  },

  async createExpansionSequence(seqId: string, simulationDatasetId: number, user: User | null): Promise<void> {
    try {
      if (!queryPermissions.CREATE_EXPANSION_SEQUENCE(user)) {
        throwPermissionError('create an expansion sequence');
      }

      creatingExpansionSequence.set(true);
      const sequence: ExpansionSequenceInsertInput = {
        metadata: {},
        seq_id: seqId,
        simulation_dataset_id: simulationDatasetId,
      };
      const data = await reqHasura<SeqId>(gql.CREATE_EXPANSION_SEQUENCE, { sequence }, user);
      if (data.createExpansionSequence != null) {
        showSuccessToast('Expansion Sequence Created Successfully');
        creatingExpansionSequence.set(false);
      } else {
        throw Error(`Unable to create expansion sequence with ID: "${seqId}"`);
      }
    } catch (e) {
      catchError('Expansion Sequence Create Failed', e as Error);
      showFailureToast('Expansion Sequence Create Failed');
      creatingExpansionSequence.set(false);
    }
  },

  async createExpansionSet(
    dictionaryId: number,
    modelId: number,
    expansionRuleIds: number[],
    user: User | null,
    name?: string,
    description?: string,
  ): Promise<number | null> {
    try {
      if (!queryPermissions.CREATE_EXPANSION_SET(user)) {
        throwPermissionError('create an expansion set');
      }

      savingExpansionSet.set(true);
      const data = await reqHasura<ExpansionSet>(
        gql.CREATE_EXPANSION_SET,
        {
          dictionaryId,
          expansionRuleIds,
          modelId,
          ...(name && { name }),
          ...(description && { description }),
        },
        user,
      );
      const { createExpansionSet } = data;
      if (createExpansionSet != null) {
        const { id } = createExpansionSet;
        showSuccessToast('Expansion Set Created Successfully');
        savingExpansionSet.set(false);
        return id;
      } else {
        throw Error('Unable to create expansion set');
      }
    } catch (e) {
      catchError('Expansion Set Create Failed', e as Error);
      showFailureToast('Expansion Set Create Failed');
      savingExpansionSet.set(false);
      return null;
    }
  },

  async createModel(
    name: string,
    version: string,
    files: FileList,
    user: User | null,
    description?: string,
  ): Promise<void> {
    try {
      createModelError.set(null);

      if (!queryPermissions.CREATE_MODEL(user)) {
        throwPermissionError('upload a model');
      }

      creatingModel.set(true);

      const file: File = files[0];
      const jar_id = await effects.uploadFile(file, user);

      if (jar_id !== null) {
        const modelInsertInput: ModelInsertInput = {
          description,
          jar_id,
          mission: '',
          name,
          version,
        };
        const data = await reqHasura<Model>(gql.CREATE_MODEL, { model: modelInsertInput }, user);
        const { createModel } = data;
        if (createModel != null) {
          const { id, created_at, owner } = createModel;
          const model: ModelSlim = {
            created_at,
            id,
            jar_id,
            name,
            owner,
            plans: [],
            version,
            ...(description && { description }),
          };

          showSuccessToast('Model Created Successfully');
          createModelError.set(null);
          creatingModel.set(false);
          models.updateValue((currentModels: ModelSlim[]) => [...currentModels, model]);
        } else {
          throw Error(`Unable to create model "${name}"`);
        }
      }
    } catch (e) {
      catchError('Model Create Failed', e as Error);
      showFailureToast('Model Create Failed');
      createModelError.set((e as Error).message);
      creatingModel.set(false);
    }
  },

  async createPlan(
    end_time_doy: string,
    model_id: number,
    name: string,
    start_time_doy: string,
    simulation_template_id: number | null,
    user: User | null,
  ): Promise<PlanSlim | null> {
    try {
      createPlanError.set(null);

      if (!queryPermissions.CREATE_PLAN(user)) {
        throwPermissionError('create a plan');
      }

      creatingPlan.set(true);

      const planInsertInput: PlanInsertInput = {
        duration: getIntervalFromDoyRange(start_time_doy, end_time_doy),
        model_id,
        name,
        start_time: start_time_doy, // Postgres accepts DOY dates for it's 'timestamptz' type.
      };
      const data = await reqHasura<PlanSlim>(
        gql.CREATE_PLAN,
        {
          plan: planInsertInput,
        },
        user,
      );
      const { createPlan } = data;
      if (createPlan != null) {
        const { collaborators, created_at, duration, id, owner, revision, start_time, updated_at, updated_by } =
          createPlan;

        if (!(await effects.initialSimulationUpdate(id, simulation_template_id, start_time_doy, end_time_doy, user))) {
          throw Error('Failed to update simulation.');
        }

        if (
          !(await effects.createSchedulingSpec(
            {
              analysis_only: false,
              horizon_end: end_time_doy,
              horizon_start: start_time_doy,
              plan_id: id,
              plan_revision: revision,
              simulation_arguments: {},
            },
            user,
          ))
        ) {
          throw Error('Failed to create scheduling spec.');
        }

        const plan: PlanSlim = {
          collaborators,
          created_at,
          duration,
          end_time_doy,
          id,
          model_id,
          name,
          owner,
          revision,
          start_time,
          start_time_doy,
          tags: [],
          updated_at,
          updated_by,
        };

        showSuccessToast('Plan Created Successfully');
        createPlanError.set(null);
        creatingPlan.set(false);

        return plan;
      } else {
        throw Error(`Unable to create plan "${name}"`);
      }
    } catch (e) {
      catchError('Plan Create Failed', e as Error);
      showFailureToast('Plan Create Failed');
      createPlanError.set((e as Error).message);
      creatingPlan.set(false);

      return null;
    }
  },

  async createPlanBranch(plan: Plan, user: User | null): Promise<void> {
    try {
      if (!queryPermissions.DUPLICATE_PLAN(user)) {
        throwPermissionError('create a branch');
      }

      const { confirm, value = null } = await showCreatePlanBranchModal(plan);

      if (confirm && value) {
        const { name, plan } = value;
        const data = await reqHasura(gql.DUPLICATE_PLAN, { new_plan_name: name, plan_id: plan.id }, user);
        const { duplicate_plan } = data;
        if (duplicate_plan != null) {
          const { new_plan_id } = duplicate_plan;
          await effects.createSchedulingSpec(
            {
              analysis_only: false,
              horizon_end: plan.end_time_doy,
              horizon_start: plan.start_time_doy,
              plan_id: new_plan_id,
              plan_revision: 0,
              simulation_arguments: {},
            },
            user,
          );
          goto(`${base}/plans/${duplicate_plan.new_plan_id}`);
          showSuccessToast('Branch Created Successfully');
        } else {
          throw Error('');
        }
      }
    } catch (e) {
      catchError('Branch Creation Failed', e as Error);
      showFailureToast('Branch Creation Failed');
    }
  },

  async createPlanBranchRequest(plan: Plan, action: PlanBranchRequestAction, user: User | null): Promise<void> {
    try {
      if (!queryPermissions.CREATE_PLAN_MERGE_REQUEST(user)) {
        throwPermissionError('create a branch merge request');
      }

      const { confirm, value } = await showPlanBranchRequestModal(plan, action);

      if (confirm && value) {
        const { source_plan_id, target_plan_id } = value;
        if (action === 'merge') {
          await effects.createPlanMergeRequest(source_plan_id, target_plan_id, user);
        }
      }
    } catch (e) {
      catchError(e as Error);
    }
  },

  async createPlanMergeRequest(
    source_plan_id: number,
    target_plan_id: number,
    user: User | null,
  ): Promise<number | null> {
    try {
      if (!queryPermissions.CREATE_PLAN_MERGE_REQUEST(user)) {
        throwPermissionError('create a branch merge request');
      }

      const data = await reqHasura<{ merge_request_id: number }>(
        gql.CREATE_PLAN_MERGE_REQUEST,
        {
          source_plan_id,
          target_plan_id,
        },
        user,
      );
      const { create_merge_request } = data;
      if (create_merge_request != null) {
        const { merge_request_id } = create_merge_request;
        showSuccessToast('Merge Request Created Successfully');
        return merge_request_id;
      } else {
        throw Error('Unable to create a branch merge request');
      }
    } catch (e) {
      catchError('Merge Request Create Failed', e as Error);
      showFailureToast('Merge Request Create Failed');
      return null;
    }
  },

  async createPlanTags(tags: PlanTagsInsertInput[], user: User | null, notify: boolean = true): Promise<number | null> {
    try {
      if (!queryPermissions.CREATE_PLAN_TAGS(user)) {
        throwPermissionError('create plan tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(gql.CREATE_PLAN_TAGS, { tags }, user);
      const { insert_plan_tags } = data;
      if (insert_plan_tags != null) {
        const { affected_rows } = insert_plan_tags;

        if (affected_rows !== tags.length) {
          throw Error('Some plan tags were not successfully created');
        }
        if (notify) {
          showSuccessToast('Plan Updated Successfully');
        }
        return affected_rows;
      } else {
        throw Error('Unable to create plan tags');
      }
    } catch (e) {
      catchError('Create Plan Tags Failed', e as Error);
      showFailureToast('Create Plan Tags Failed');
      return null;
    }
  },

  async createSchedulingCondition(
    definition: string,
    name: string,
    modelId: number,
    user: User | null,
    description?: string,
  ): Promise<SchedulingCondition | null> {
    try {
      if (!queryPermissions.CREATE_SCHEDULING_CONDITION(user)) {
        throwPermissionError('create a scheduling condition');
      }

      const conditionInsertInput: SchedulingConditionInsertInput = {
        definition,
        model_id: modelId,
        name,
        ...(description && { description }),
      };
      const data = await reqHasura<SchedulingCondition>(
        gql.CREATE_SCHEDULING_CONDITION,
        { condition: conditionInsertInput },
        user,
      );
      const { createSchedulingCondition: newCondition } = data;

      if (newCondition != null) {
        showSuccessToast('Scheduling Condition Created Successfully');
        return newCondition;
      } else {
        throw Error(`Unable to create scheduling condition "${name}"`);
      }
    } catch (e) {
      catchError('Scheduling Condition Create Failed', e as Error);
      showFailureToast('Scheduling Condition Create Failed');
      return null;
    }
  },

  async createSchedulingGoal(
    definition: string,
    name: string,
    modelId: number,
    user: User | null,
    description?: string,
  ): Promise<SchedulingGoal | null> {
    try {
      if (!queryPermissions.CREATE_SCHEDULING_GOAL(user)) {
        throwPermissionError('create a scheduling goal');
      }

      const goalInsertInput: SchedulingGoalInsertInput = {
        definition,
        model_id: modelId,
        name,
        ...(description && { description }),
      };
      const data = await reqHasura<SchedulingGoal>(gql.CREATE_SCHEDULING_GOAL, { goal: goalInsertInput }, user);
      const { createSchedulingGoal: newGoal } = data;

      if (newGoal != null) {
        showSuccessToast('Scheduling Goal Created Successfully');
        return newGoal;
      } else {
        throw Error(`Unable to create scheduling goal "${name}"`);
      }
    } catch (e) {
      catchError('Scheduling Goal Create Failed', e as Error);
      showFailureToast('Scheduling Goal Create Failed');
      return null;
    }
  },

  async createSchedulingGoalTags(tags: SchedulingGoalTagsInsertInput[], user: User | null): Promise<number | null> {
    try {
      if (!queryPermissions.CREATE_SCHEDULING_GOAL_TAGS(user)) {
        throwPermissionError('create scheduling goal tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(gql.CREATE_SCHEDULING_GOAL_TAGS, { tags }, user);
      const { insert_scheduling_goal_tags } = data;
      if (insert_scheduling_goal_tags != null) {
        const { affected_rows } = insert_scheduling_goal_tags;

        if (affected_rows !== tags.length) {
          throw Error('Some scheduling goal tags were not successfully created');
        }
        return affected_rows;
      } else {
        throw Error('Unable to create scheduling goal tags');
      }
    } catch (e) {
      catchError('Create Scheduling Goal Tags Failed', e as Error);
      showFailureToast('Create Scheduling Goal Tags Failed');
      return null;
    }
  },

  async createSchedulingSpec(
    spec: SchedulingSpecInsertInput,
    user: User | null,
  ): Promise<Pick<SchedulingSpec, 'id'> | null> {
    try {
      if (!queryPermissions.CREATE_SCHEDULING_SPEC(user)) {
        throwPermissionError('create a scheduling spec');
      }

      const data = await reqHasura<Pick<SchedulingSpec, 'id'>>(gql.CREATE_SCHEDULING_SPEC, { spec }, user);
      const { createSchedulingSpec: newSchedulingSpec } = data;
      return newSchedulingSpec;
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async createSchedulingSpecCondition(
    spec_condition: SchedulingSpecConditionInsertInput,
    user: User | null,
  ): Promise<void> {
    try {
      if (!queryPermissions.CREATE_SCHEDULING_SPEC_CONDITION(user)) {
        throwPermissionError('create a scheduling spec condition');
      }

      const data = await reqHasura<SchedulingSpecCondition>(
        gql.CREATE_SCHEDULING_SPEC_CONDITION,
        { spec_condition },
        user,
      );
      if (data.createSchedulingSpecCondition == null) {
        throw Error('Unable to create a scheduling spec condition');
      }
    } catch (e) {
      catchError(e as Error);
    }
  },

  async createSchedulingSpecGoal(spec_goal: SchedulingSpecGoalInsertInput, user: User | null): Promise<number | null> {
    try {
      if (!queryPermissions.CREATE_SCHEDULING_SPEC_GOAL(user)) {
        throwPermissionError('create a scheduling spec goal');
      }

      const data = await reqHasura<SchedulingSpecGoal>(gql.CREATE_SCHEDULING_SPEC_GOAL, { spec_goal }, user);
      const { createSchedulingGoal } = data;
      if (createSchedulingGoal != null) {
        const { specification_id } = createSchedulingGoal;
        return specification_id;
      } else {
        throw Error('Unable to create a scheduling spec goal');
      }
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async createSimulationTemplate(
    argumentsMap: ArgumentsMap,
    name: string,
    modelId: number,
    user: User | null,
  ): Promise<SimulationTemplate | null> {
    try {
      if (!queryPermissions.CREATE_SIMULATION_TEMPLATE(user)) {
        throwPermissionError('create a simulation template');
      }

      const simulationTemplateInsertInput: SimulationTemplateInsertInput = {
        arguments: argumentsMap,
        description: name,
        model_id: modelId,
      };
      const { insert_simulation_template_one: newTemplate } = await reqHasura<SimulationTemplate>(
        gql.CREATE_SIMULATION_TEMPLATE,
        { simulationTemplateInsertInput },
        user,
      );

      if (newTemplate != null) {
        showSuccessToast(`Simulation Template ${name} Created Successfully`);
        return newTemplate;
      } else {
        throw Error(`Unable to create simulation template "${name}"`);
      }
    } catch (e) {
      catchError('Simulation Template Create Failed', e as Error);
      showFailureToast('Simulation Template Create Failed');
      return null;
    }
  },

  async createTag(tag: TagsInsertInput, user: User | null, notify: boolean = true): Promise<Tag | null> {
    try {
      createTagError.set(null);
      if (!queryPermissions.CREATE_TAGS(user)) {
        throwPermissionError('create tags');
      }

      const data = await reqHasura<{ affected_row: number; tag: Tag }>(gql.CREATE_TAG, { tag }, user);
      const { insert_tags_one } = data;
      if (insert_tags_one != null) {
        const { tag: insertedTag } = insert_tags_one;
        if (notify) {
          showSuccessToast('Tag Created Successfully');
        }
        createTagError.set(null);
        return insertedTag;
      } else {
        throw Error(`Unable to create tag "${tag.name}"`);
      }
    } catch (e) {
      createTagError.set((e as Error).message);
      catchError('Create Tags Failed', e as Error);
      showFailureToast('Create Tags Failed');
      return null;
    }
  },

  async createTags(tags: TagsInsertInput[], user: User | null, notify: boolean = true): Promise<Tag[] | null> {
    try {
      if (!queryPermissions.CREATE_TAGS(user)) {
        throwPermissionError('create tags');
      }

      const data = await reqHasura<{ affected_rows: number; returning: Tag[] }>(gql.CREATE_TAGS, { tags }, user);
      const { insert_tags } = data;
      if (insert_tags != null) {
        const { returning } = insert_tags;

        const createdTags = returning.map(({ name }) => name);

        // If there are tags that did not get created
        const leftoverTagNames = tags.filter(({ name }) => !createdTags.includes(name)).map(({ name }) => name);
        if (leftoverTagNames.length > 0) {
          throw new Error(`Some tags were not successfully created: ${leftoverTagNames.join(', ')}`);
        }
        if (notify) {
          showSuccessToast('Tags Created Successfully');
        }
        return returning;
      } else {
        throw Error('Unable to create tags');
      }
    } catch (e) {
      catchError('Create Tags Failed', e as Error);
      showFailureToast('Create Tags Failed');
      return null;
    }
  },

  async createUserSequence(sequence: UserSequenceInsertInput, user: User | null): Promise<number | null> {
    try {
      if (!queryPermissions.CREATE_USER_SEQUENCE(user)) {
        throwPermissionError('create a user sequence');
      }

      const data = await reqHasura<Pick<UserSequence, 'id'>>(gql.CREATE_USER_SEQUENCE, { sequence }, user);
      const { createUserSequence } = data;
      if (createUserSequence != null) {
        const { id } = createUserSequence;
        showSuccessToast('User Sequence Created Successfully');
        return id;
      } else {
        throw Error(`Unable to create user sequence "${sequence.name}"`);
      }
    } catch (e) {
      catchError('User Sequence Create Failed', e as Error);
      showFailureToast('User Sequence Create Failed');
      return null;
    }
  },

  async createView(definition: ViewDefinition, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.CREATE_VIEW(user)) {
        throwPermissionError('create a view');
      }

      const { confirm, value = null } = await showCreateViewModal();

      if (confirm && value) {
        const { name } = value;
        const viewInsertInput: ViewInsertInput = { definition, name };
        const data = await reqHasura<View>(gql.CREATE_VIEW, { view: viewInsertInput }, user);
        const { newView } = data;

        if (newView != null) {
          view.update(() => newView);
          setQueryParam('viewId', `${newView.id}`);
          showSuccessToast('View Created Successfully');
          return true;
        } else {
          throw Error(`Unable to create view "${viewInsertInput.name}"`);
        }
      }
    } catch (e) {
      catchError('View Create Failed', e as Error);
      showFailureToast('View Create Failed');
    }

    return false;
  },

  async deleteActivityDirective(plan_id: number, id: ActivityDirectiveId, user: User | null): Promise<boolean> {
    try {
      if (
        !(
          queryPermissions.DELETE_ACTIVITY_DIRECTIVES(user) &&
          queryPermissions.DELETE_ACTIVITY_DIRECTIVES_REANCHOR_PLAN_START(user) &&
          queryPermissions.DELETE_ACTIVITY_DIRECTIVES_REANCHOR_TO_ANCHOR(user) &&
          queryPermissions.DELETE_ACTIVITY_DIRECTIVES_SUBTREE(user)
        )
      ) {
        throwPermissionError('delete an activity directive');
      }

      return effects.deleteActivityDirectives(plan_id, [id], user);
    } catch (e) {
      catchError('Activity Directive Delete Failed', e as Error);
    }

    return false;
  },

  async deleteActivityDirectiveTags(ids: Tag['id'][], user: User | null): Promise<number | null> {
    try {
      if (!queryPermissions.DELETE_ACTIVITY_DIRECTIVE_TAGS(user)) {
        throwPermissionError('delete activity directive tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(gql.DELETE_ACTIVITY_DIRECTIVE_TAGS, { ids }, user);
      const { delete_activity_directive_tags } = data;
      if (delete_activity_directive_tags != null) {
        const { affected_rows } = delete_activity_directive_tags;

        if (affected_rows !== ids.length) {
          throw Error('Some activity directive tags were not successfully deleted');
        }

        showSuccessToast('Activity Directive Updated Successfully');
        return affected_rows;
      } else {
        throw Error('Unable to delete activity directive tags');
      }
    } catch (e) {
      catchError('Delete Activity Directive Tags Failed', e as Error);
      showFailureToast('Delete Activity Directive Tags Failed');
      return null;
    }
  },

  async deleteActivityDirectives(plan_id: number, ids: ActivityDirectiveId[], user: User | null): Promise<boolean> {
    try {
      if (
        !(
          queryPermissions.DELETE_ACTIVITY_DIRECTIVES(user) &&
          queryPermissions.DELETE_ACTIVITY_DIRECTIVES_REANCHOR_PLAN_START(user) &&
          queryPermissions.DELETE_ACTIVITY_DIRECTIVES_REANCHOR_TO_ANCHOR(user) &&
          queryPermissions.DELETE_ACTIVITY_DIRECTIVES_SUBTREE(user)
        )
      ) {
        throwPermissionError('delete activity directives');
      }

      type SortedDeletions = {
        [key in ActivityDeletionAction]?: ActivityDirectiveId[];
      };

      const { confirm, value } = await showDeleteActivitiesModal(ids);

      if (confirm && value !== undefined) {
        const sortedActions = Object.keys(value)
          .map(Number)
          .reduce((previousValue: SortedDeletions, activityId: ActivityDirectiveId) => {
            const action = value[activityId];
            if (previousValue[action]) {
              return {
                ...previousValue,
                [action]: [...(previousValue[action] ?? []), activityId],
              };
            }
            return {
              ...previousValue,
              [action]: [activityId],
            };
          }, {});

        const reanchorPlanDeletions = sortedActions[ActivityDeletionAction.ANCHOR_PLAN] ?? [];
        const reanchorRootDeletions = sortedActions[ActivityDeletionAction.ANCHOR_ROOT] ?? [];
        const subtreeDeletions = sortedActions[ActivityDeletionAction.DELETE_CHAIN] ?? [];
        const normalDeletions = sortedActions[ActivityDeletionAction.NORMAL] ?? [];

        // The following deletion queries must occur in a specific order to avoid errors from deleting
        // directives that still have other activities dependent on them
        if (reanchorRootDeletions.length) {
          const response = await reqHasura<
            {
              affected_row: ActivityDirective;
              change_type: string;
            }[]
          >(
            gql.DELETE_ACTIVITY_DIRECTIVES_REANCHOR_TO_ANCHOR,
            {
              activity_ids: convertToGQLArray(reanchorRootDeletions),
              plan_id,
            },
            user,
          );

          if (response.delete_activity_by_pk_reanchor_to_anchor_bulk != null) {
            const deletedActivityIds = response.delete_activity_by_pk_reanchor_to_anchor_bulk
              .filter(({ change_type }) => {
                return change_type === 'deleted';
              })
              .map(({ affected_row: { id } }) => id);

            activityDirectivesMap.update((currentActivityDirectivesMap: ActivityDirectivesMap) => {
              deletedActivityIds.forEach(id => delete currentActivityDirectivesMap[id]);
              return { ...currentActivityDirectivesMap };
            });

            // If there are activities that did not get deleted
            const leftoverActivities = reanchorRootDeletions.filter(id => !deletedActivityIds.includes(id));
            if (leftoverActivities.length > 0) {
              throw new Error(`Some activities were not successfully deleted: ${leftoverActivities.join(', ')}`);
            }
          } else {
            throw new Error(
              'Something went wrong when attempting to delete and reanchor directives to their closest ancestor',
            );
          }
        }

        if (reanchorPlanDeletions.length) {
          const response = await reqHasura<
            {
              affected_row: ActivityDirective;
              change_type: string;
            }[]
          >(
            gql.DELETE_ACTIVITY_DIRECTIVES_REANCHOR_PLAN_START,
            {
              activity_ids: convertToGQLArray(reanchorPlanDeletions),
              plan_id,
            },
            user,
          );

          if (response.delete_activity_by_pk_reanchor_plan_start_bulk != null) {
            const deletedActivityIds = response.delete_activity_by_pk_reanchor_plan_start_bulk
              .filter(({ change_type }) => {
                return change_type === 'deleted';
              })
              .map(({ affected_row: { id } }) => id);

            activityDirectivesMap.update((currentActivityDirectivesMap: ActivityDirectivesMap) => {
              deletedActivityIds.forEach(id => delete currentActivityDirectivesMap[id]);
              return { ...currentActivityDirectivesMap };
            });

            // If there are activities that did not get deleted
            const leftoverActivities = reanchorPlanDeletions.filter(id => !deletedActivityIds.includes(id));
            if (leftoverActivities.length > 0) {
              throw new Error(`Some activities were not successfully deleted: ${leftoverActivities.join(', ')}`);
            }
          } else {
            throw new Error('Something went wrong when attempting to delete and reanchor directives to the plan start');
          }
        }

        if (subtreeDeletions.length) {
          const response = await reqHasura<
            {
              affected_row: ActivityDirective;
              change_type: string;
            }[]
          >(
            gql.DELETE_ACTIVITY_DIRECTIVES_SUBTREE,
            {
              activity_ids: convertToGQLArray(subtreeDeletions),
              plan_id,
            },
            user,
          );

          if (response.delete_activity_by_pk_delete_subtree_bulk) {
            const deletedActivityIds = response.delete_activity_by_pk_delete_subtree_bulk
              .filter(({ change_type }) => {
                return change_type === 'deleted';
              })
              .map(({ affected_row: { id } }) => id);

            activityDirectivesMap.update((currentActivityDirectivesMap: ActivityDirectivesMap) => {
              deletedActivityIds.forEach(id => delete currentActivityDirectivesMap[id]);
              return { ...currentActivityDirectivesMap };
            });
            // If there are activities that did not get deleted
            const leftoverActivities = subtreeDeletions.filter(id => !deletedActivityIds.includes(id));
            if (leftoverActivities.length > 0) {
              throw new Error(`Some activities were not successfully deleted: ${leftoverActivities.join(', ')}`);
            }
          } else {
            throw new Error('Something went wrong when attempting to delete directives and their children');
          }
        }

        if (normalDeletions.length) {
          const response = await reqHasura<{ returning: { id: number }[] }>(
            gql.DELETE_ACTIVITY_DIRECTIVES,
            {
              activity_ids: normalDeletions,
              plan_id,
            },
            user,
          );

          if (response.deleteActivityDirectives) {
            const deletedActivityIds = response.deleteActivityDirectives.returning.map(({ id }) => id);
            activityDirectivesMap.update((currentActivityDirectivesMap: ActivityDirectivesMap) => {
              deletedActivityIds.forEach(id => delete currentActivityDirectivesMap[id]);
              return { ...currentActivityDirectivesMap };
            });
            // If there are activities that did not get deleted
            const leftoverActivities = normalDeletions.filter(id => !deletedActivityIds.includes(id));
            if (leftoverActivities.length > 0) {
              throw new Error(`Some activities were not successfully deleted: ${leftoverActivities.join(', ')}`);
            }
          } else {
            throw new Error('Something went wrong when attempting to delete directives');
          }
        }

        showSuccessToast('Activity Directives Deleted Successfully');
        return true;
      }
    } catch (e) {
      catchError('Activity Directives Delete Failed', e as Error);
      showFailureToast('Activity Directives Delete Failed');
    }

    return false;
  },

  async deleteActivityPreset(id: ActivityPresetId, modelName: string, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_ACTIVITY_PRESET(user)) {
        throwPermissionError('delete an activity preset');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `This will permanently delete the preset for the mission model: ${modelName}`,
        'Delete Permanently',
      );

      if (confirm) {
        const data = await reqHasura<{ id: number }>(gql.DELETE_ACTIVITY_PRESET, { id }, user);
        if (data.deleteActivityPreset != null) {
          showSuccessToast('Activity Preset Deleted Successfully');
          return true;
        } else {
          throw Error(`Unable to delete activity preset with ID: "${id}"`);
        }
      }
    } catch (e) {
      catchError('Activity Preset Delete Failed', e as Error);
      showFailureToast('Activity Preset Delete Failed');
    }

    return false;
  },

  async deleteCommandDictionary(id: number, user: User | null): Promise<void> {
    try {
      if (!queryPermissions.DELETE_COMMAND_DICTIONARY(user)) {
        throwPermissionError('delete this command dictionary');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `Are you sure you want to delete the dictionary with ID: "${id}"?`,
        'Delete Command Dictionary',
      );

      if (confirm) {
        const data = await reqHasura<{ id: number }>(gql.DELETE_COMMAND_DICTIONARY, { id }, user);
        if (data.deleteCommandDictionary != null) {
          showSuccessToast('Command Dictionary Deleted Successfully');
          commandDictionaries.filterValueById(id);
        } else {
          throw Error(`Unable to delete command dictionary with ID: "${id}"`);
        }
      }
    } catch (e) {
      catchError('Command Dictionary Delete Failed', e as Error);
      showFailureToast('Command Dictionary Delete Failed');
    }
  },

  async deleteConstraint(constraint: Constraint, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_CONSTRAINT(user)) {
        throwPermissionError('delete this constraint');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `Are you sure you want to delete "${constraint.name}"?`,
        'Delete Constraint',
      );

      if (confirm) {
        const data = await reqHasura<{ id: number }>(gql.DELETE_CONSTRAINT, { id: constraint.id }, user);
        if (data.deleteConstraint != null) {
          showSuccessToast('Constraint Deleted Successfully');
          return true;
        } else {
          throw Error(`Unable to delete constraint "${constraint.name}"`);
        }
      }
    } catch (e) {
      catchError('Constraint Delete Failed', e as Error);
      showFailureToast('Constraint Delete Failed');
    }

    return false;
  },

  async deleteConstraintTags(ids: Tag['id'][], user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_CONSTRAINT_TAGS(user)) {
        throwPermissionError('delete constraint tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(gql.DELETE_CONSTRAINT_TAGS, { ids }, user);
      if (data.delete_constraint_tags != null) {
        if (data.delete_constraint_tags.affected_rows !== ids.length) {
          throw Error('Some constraint tags were not successfully deleted');
        }
        return true;
      } else {
        throw Error('Unable to delete constraint tags');
      }
    } catch (e) {
      catchError('Delete Constraint Tags Failed', e as Error);
      showFailureToast('Delete Constraint Tags Failed');
      return false;
    }
  },

  async deleteExpansionRule(rule: ExpansionRule, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_EXPANSION_RULE(user)) {
        throwPermissionError('delete an expansion rule');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `Are you sure you want to delete "${rule.name}"?`,
        'Delete Expansion Rule',
      );

      if (confirm) {
        const data = await reqHasura(gql.DELETE_EXPANSION_RULE, { id: rule.id }, user);

        if (data.deleteExpansionRule != null) {
          showSuccessToast('Expansion Rule Deleted Successfully');
          return true;
        } else {
          throw Error(`Unable to delete expansion rule "${rule.name}"`);
        }
      }
    } catch (e) {
      catchError('Expansion Rule Delete Failed', e as Error);
      showFailureToast('Expansion Rule Delete Failed');
    }

    return false;
  },

  async deleteExpansionRuleTags(ids: Tag['id'][], user: User | null): Promise<number | null> {
    try {
      if (!queryPermissions.DELETE_EXPANSION_RULE_TAGS(user)) {
        throwPermissionError('delete expansion rule tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(gql.DELETE_EXPANSION_RULE_TAGS, { ids }, user);
      const { delete_expansion_rule_tags } = data;
      if (delete_expansion_rule_tags != null) {
        const { affected_rows } = delete_expansion_rule_tags;
        if (affected_rows !== ids.length) {
          throw Error('Some expansion rule tags were not successfully deleted');
        }
        return affected_rows;
      } else {
        throw Error('Unable to delete expansion rule tags');
      }
    } catch (e) {
      catchError('Delete Expansion Rule Tags Failed', e as Error);
      showFailureToast('Delete Expansion Rule Tags Failed');
      return null;
    }
  },

  async deleteExpansionSequence(sequence: ExpansionSequence, user: User | null): Promise<void> {
    try {
      if (!queryPermissions.DELETE_EXPANSION_SEQUENCE(user)) {
        throwPermissionError('delete an expansion sequence');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `Are you sure you want to delete expansion sequence with sequence ID: "${sequence.seq_id}"?`,
        'Delete Expansion Sequence',
      );

      if (confirm) {
        const { seq_id: seqId, simulation_dataset_id: simulationDatasetId } = sequence;
        const data = await reqHasura<SeqId>(gql.DELETE_EXPANSION_SEQUENCE, { seqId, simulationDatasetId }, user);
        if (data.deleteExpansionSequence != null) {
          showSuccessToast('Expansion Sequence Deleted Successfully');
        } else {
          throw Error(`Unable to delete expansion sequence with ID: "${seqId}"`);
        }
      }
    } catch (e) {
      catchError('Expansion Sequence Delete Failed', e as Error);
      showFailureToast('Expansion Sequence Delete Failed');
    }
  },

  async deleteExpansionSequenceToActivity(
    simulation_dataset_id: number,
    simulated_activity_id: number,
    user: User | null,
  ): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_EXPANSION_SEQUENCE_TO_ACTIVITY(user)) {
        throwPermissionError('delete an expansion sequence from an activity');
      }

      const data = await reqHasura<SeqId>(
        gql.DELETE_EXPANSION_SEQUENCE_TO_ACTIVITY,
        {
          simulated_activity_id,
          simulation_dataset_id,
        },
        user,
      );
      if (data.expansionSequence != null) {
        showSuccessToast('Expansion Sequence Deleted From Activity Successfully');
        return true;
      } else {
        throw Error(
          `Unable to remove the associated expansion sequence from the dataset ${simulation_dataset_id} and the activity ${simulated_activity_id}`,
        );
      }
    } catch (e) {
      catchError('Delete Expansion Sequence From Activity Failed', e as Error);
      showFailureToast('Delete Expansion Sequence From Activity Failed');
      return false;
    }
  },

  async deleteExpansionSet(set: ExpansionSet, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_EXPANSION_SET(user)) {
        throwPermissionError('delete an expansion set');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `Are you sure you want to delete "${set.name}"?`,
        'Delete Expansion Set',
      );

      if (confirm) {
        const data = await reqHasura<{ id: number }>(gql.DELETE_EXPANSION_SET, { id: set.name }, user);
        if (data.deleteExpansionSet != null) {
          showSuccessToast('Expansion Set Deleted Successfully');
          return true;
        } else {
          throw Error(`Unable to delete expansion set "${set.name}"`);
        }
      }

      return false;
    } catch (e) {
      catchError('Expansion Set Delete Failed', e as Error);
      showFailureToast('Expansion Set Delete Failed');
      return false;
    }
  },

  async deleteFile(id: number, user: User | null): Promise<boolean> {
    try {
      await reqGateway(`/file/${id}`, 'DELETE', null, user, false);
      return true;
    } catch (e) {
      catchError(e as Error);
      return false;
    }
  },

  async deleteModel(model: ModelSlim, user: User | null): Promise<void> {
    try {
      if (!queryPermissions.DELETE_MODEL(user)) {
        throwPermissionError('delete this model');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `Are you sure you want to delete "${model.name}" version ${model.version}?`,
        'Delete Model',
      );

      if (confirm) {
        const { id, jar_id } = model;
        await effects.deleteFile(jar_id, user);
        const data = await reqHasura<{ id: number }>(gql.DELETE_MODEL, { id }, user);
        if (data.deleteModel != null) {
          showSuccessToast('Model Deleted Successfully');
          models.filterValueById(id);
        } else {
          throw Error(`Unable to delete model "${model.name}"`);
        }
      }
    } catch (e) {
      catchError('Model Delete Failed', e as Error);
      showFailureToast('Model Delete Failed');
    }
  },

  async deletePlan(plan: PlanSlim, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_PLAN(user)) {
        throwPermissionError('delete this plan');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `Are you sure you want to delete "${plan.name}"?`,
        'Delete Plan',
      );

      if (confirm) {
        const data = await reqHasura(gql.DELETE_PLAN, { id: plan.id }, user);
        if (data.deletePlan != null) {
          showSuccessToast('Plan Deleted Successfully');
          return true;
        } else {
          throw Error(`Unable to delete the plan with "${plan.name}"`);
        }
      }

      return false;
    } catch (e) {
      catchError('Plan Delete Failed', e as Error);
      showFailureToast('Plan Delete Failed');
      return false;
    }
  },

  async deletePlanTags(ids: Tag['id'][], user: User | null): Promise<number | null> {
    try {
      if (!queryPermissions.DELETE_PLAN_TAGS(user)) {
        throwPermissionError('delete plan tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(gql.DELETE_PLAN_TAGS, { ids }, user);
      const { delete_plan_tags } = data;
      if (delete_plan_tags != null) {
        const { affected_rows } = delete_plan_tags;
        if (affected_rows !== ids.length) {
          throw Error('Some plan tags were not successfully deleted');
        }
        showSuccessToast('Plan Updated Successfully');
        return affected_rows;
      } else {
        throw Error('Unable to delete plan tags');
      }
    } catch (e) {
      catchError('Delete Plan Tags Failed', e as Error);
      showFailureToast('Delete Plan Tags Failed');
      return null;
    }
  },

  async deleteSchedulingCondition(condition: SchedulingCondition, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_SCHEDULING_CONDITION(user)) {
        throwPermissionError('delete this scheduling condition');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `Are you sure you want to delete "${condition.name}"?`,
        'Delete Scheduling Condition',
      );

      if (confirm) {
        const data = await reqHasura<{ id: number }>(gql.DELETE_SCHEDULING_CONDITION, { id: condition.id }, user);
        if (data.deleteSchedulingCondition != null) {
          showSuccessToast('Scheduling Condition Deleted Successfully');
          return true;
        } else {
          throw Error(`Unable to delete scheduling condition "${condition.name}"`);
        }
      } else {
        return false;
      }
    } catch (e) {
      catchError('Scheduling Condition Delete Failed', e as Error);
      showFailureToast('Scheduling Condition Delete Failed');
      return false;
    }
  },

  async deleteSchedulingGoal(goal: SchedulingGoalSlim, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_SCHEDULING_GOAL(user)) {
        throwPermissionError('delete this scheduling goal');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `Are you sure you want to delete "${goal.name}"?`,
        'Delete Scheduling Goal',
      );

      if (confirm) {
        const data = await reqHasura<{ id: number }>(gql.DELETE_SCHEDULING_GOAL, { id: goal.id }, user);

        if (data.deleteSchedulingGoal) {
          showSuccessToast('Scheduling Goal Deleted Successfully');
          return true;
        } else {
          throw Error(`Unable to delete scheduling goal "${goal.name}"`);
        }
      } else {
        return false;
      }
    } catch (e) {
      catchError('Scheduling Goal Delete Failed', e as Error);
      showFailureToast('Scheduling Goal Delete Failed');
      return false;
    }
  },

  async deleteSchedulingGoalTags(ids: Tag['id'][], user: User | null): Promise<number | null> {
    try {
      if (!queryPermissions.DELETE_SCHEDULING_GOAL_TAGS(user)) {
        throwPermissionError('delete scheduling goal tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(gql.DELETE_SCHEDULING_GOAL_TAGS, { ids }, user);
      const { delete_scheduling_goal_tags } = data;
      if (delete_scheduling_goal_tags != null) {
        const { affected_rows } = delete_scheduling_goal_tags;
        if (affected_rows !== ids.length) {
          throw Error('Some scheduling goal tags were not successfully created');
        }
        return affected_rows;
      } else {
        throw Error('Unable to delete scheduling goal tags');
      }
    } catch (e) {
      catchError('Delete Scheduling Goal Tags Failed', e as Error);
      showFailureToast('Delete Scheduling Goal Tags Failed');
      return null;
    }
  },

  async deleteSchedulingSpecGoal(goal_id: number, specification_id: number, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_SCHEDULING_SPEC_GOAL(user)) {
        throwPermissionError('delete this scheduling goal');
      }

      const data = await reqHasura<{ goal_id: number; specification_id: number }>(
        gql.DELETE_SCHEDULING_SPEC_GOAL,
        { goal_id, specification_id },
        user,
      );
      if (data.deleteSchedulingSpecGoal != null) {
        return true;
      } else {
        throw Error(`Unable to delete scheduling goal with ID: "${goal_id}"`);
      }
    } catch (e) {
      catchError('Scheduling Goal Delete Failed', e as Error);
      showFailureToast('Scheduling Goal Delete Failed');
      return false;
    }
  },

  async deleteSimulationTemplate(id: number, modelName: string, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_SIMULATION_TEMPLATE(user)) {
        throwPermissionError('delete this simulation template');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `This will permanently delete the template for the mission model: ${modelName}`,
        'Delete Permanently',
      );

      if (confirm) {
        const data = await reqHasura<{ id: number }>(gql.DELETE_SIMULATION_TEMPLATE, { id }, user);
        if (data.deleteSimulationTemplate != null) {
          showSuccessToast('Simulation Template Deleted Successfully');
          return true;
        } else {
          throw Error(`Unable to delete simulation template with ID: "${id}"`);
        }
      }
    } catch (e) {
      catchError('Simulation Template Delete Failed', e as Error);
      showFailureToast('Simulation Template Delete Failed');
    }

    return false;
  },

  async deleteTag(tag: Tag, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_TAGS(user)) {
        throwPermissionError('delete tags');
      }

      await reqHasura<{ id: number }>(gql.DELETE_TAG, { id: tag.id }, user);
      showSuccessToast('Tag Deleted Successfully');
      return true;
    } catch (e) {
      catchError('Delete Tag Failed', e as Error);
      showFailureToast('Delete Tag Failed');
      return false;
    }
  },

  async deleteUserSequence(sequence: UserSequence, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_USER_SEQUENCE(user)) {
        throwPermissionError('delete this user sequence');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `Are you sure you want to delete "${sequence.name}"?`,
        'Delete User Sequence',
      );

      if (confirm) {
        const data = await reqHasura<{ id: number }>(gql.DELETE_USER_SEQUENCE, { id: sequence.id }, user);
        if (data.deleteUserSequence != null) {
          showSuccessToast('User Sequence Deleted Successfully');
          return true;
        } else {
          throw Error(`Unable to delete user sequence "${sequence.name}"`);
        }
      }

      return false;
    } catch (e) {
      catchError('User Sequence Delete Failed', e as Error);
      showFailureToast('User Sequence Delete Failed');
      return false;
    }
  },

  async deleteView(view: View, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_VIEW(user)) {
        throwPermissionError('delete this view');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `Are you sure you want to delete "${view.name}"?`,
        'Delete View',
      );

      if (confirm) {
        const data = await reqHasura<{ id: number }>(gql.DELETE_VIEW, { id: view.id }, user);
        if (data.deletedView != null) {
          return true;
        } else {
          throw Error(`Unable to delete view "${view.name}"`);
        }
      }
    } catch (e) {
      catchError(e as Error);
    }

    return false;
  },

  async deleteViews(ids: number[], user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_VIEWS(user)) {
        throwPermissionError('delete these views');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        'Are you sure you want to delete the selected views?',
        'Delete Views',
      );

      if (confirm) {
        const data = await reqHasura<{ returning: { id: number }[] }>(gql.DELETE_VIEWS, { ids }, user);
        if (data.delete_view != null) {
          const deletedViewIds = data.delete_view.returning.map(({ id }) => id);
          const leftoverViewIds = ids.filter(id => !deletedViewIds.includes(id));
          if (leftoverViewIds.length > 0) {
            throw new Error(`Some views were not successfully deleted: ${leftoverViewIds.join(', ')}`);
          }
          return true;
        } else {
          throw Error('Unable to delete views');
        }
      }
    } catch (e) {
      catchError(e as Error);
    }

    return false;
  },

  async editView(definition: ViewDefinition, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.UPDATE_VIEW(user)) {
        throwPermissionError('edit this view');
      }

      const { confirm, value = null } = await showEditViewModal();
      if (confirm && value) {
        const { id, name } = value;
        const viewUpdateInput: ViewUpdateInput = { definition, name };
        const data = await reqHasura<View>(gql.UPDATE_VIEW, { id, view: viewUpdateInput }, user);
        const { updatedView } = data;

        if (updatedView != null) {
          const { name: updatedName, updated_at } = updatedView;
          applyViewUpdate({ name: updatedName, updated_at });
          showSuccessToast('View Edited Successfully');
          return true;
        } else {
          throw Error(`Unable to edit view "${name}"`);
        }
      }
    } catch (e) {
      catchError('View Edit Failed', e as Error);
      showFailureToast('View Edit Failed');
    }

    return false;
  },

  async expand(expansionSetId: number, simulationDatasetId: number, user: User | null): Promise<void> {
    try {
      planExpansionStatus.set(Status.Incomplete);

      if (!queryPermissions.EXPAND(user)) {
        throwPermissionError('expand this plan');
      }

      const data = await reqHasura<{ id: number }>(gql.EXPAND, { expansionSetId, simulationDatasetId }, user);
      if (data.expand != null) {
        planExpansionStatus.set(Status.Complete);
        showSuccessToast('Plan Expanded Successfully');
      } else {
        throw Error('Unable to expand plan');
      }
    } catch (e) {
      catchError('Plan Expansion Failed', e as Error);
      planExpansionStatus.set(Status.Failed);
      showFailureToast('Plan Expansion Failed');
    }
  },

  async getActivityTypes(modelId: number, user: User | null): Promise<ActivityType[]> {
    try {
      const query = convertToQuery(gql.SUB_ACTIVITY_TYPES);
      const data = await reqHasura<ActivityType[]>(query, { modelId }, user);
      const { activity_type: activityTypes } = data;
      if (activityTypes != null) {
        return activityTypes;
      } else {
        throw Error('Unable to retrieve activity types');
      }
    } catch (e) {
      catchError(e as Error);
      return [];
    }
  },

  async getActivityTypesExpansionRules(
    modelId: number | null | undefined,
    user: User | null,
  ): Promise<ActivityTypeExpansionRules[]> {
    if (modelId !== null && modelId !== undefined) {
      try {
        const data = await reqHasura<ActivityTypeExpansionRules[]>(
          gql.GET_ACTIVITY_TYPES_EXPANSION_RULES,
          { modelId },
          user,
        );
        const { activity_types } = data;
        if (activity_types != null) {
          return activity_types;
        } else {
          throw Error('Unable to retrieve activity types');
        }
      } catch (e) {
        catchError(e as Error);
        return [];
      }
    } else {
      return [];
    }
  },

  async getConstraint(id: number, user: User | null): Promise<Constraint | null> {
    try {
      const data = await reqHasura<Constraint>(gql.GET_CONSTRAINT, { id }, user);
      const { constraint } = data;
      return constraint;
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getEffectiveActivityArguments(
    modelId: number,
    activityTypeName: string,
    argumentsMap: ArgumentsMap,
    user: User | null,
  ): Promise<EffectiveArguments | null> {
    try {
      const data = await reqHasura<EffectiveArguments>(
        gql.GET_EFFECTIVE_ACTIVITY_ARGUMENTS,
        {
          activityTypeName,
          arguments: argumentsMap,
          modelId,
        },
        user,
      );
      const { effectiveActivityArguments } = data;
      return effectiveActivityArguments;
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getEffectiveModelArguments(
    modelId: number,
    argumentsMap: ArgumentsMap,
    user: User | null,
  ): Promise<EffectiveArguments | null> {
    try {
      const data = await reqHasura<EffectiveArguments>(
        gql.GET_EFFECTIVE_MODEL_ARGUMENTS,
        {
          arguments: argumentsMap,
          modelId,
        },
        user,
      );
      const { effectiveModelArguments } = data;
      return effectiveModelArguments;
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getExpansionRule(id: number, user: User | null): Promise<ExpansionRule | null> {
    try {
      const data = await reqHasura(gql.GET_EXPANSION_RULE, { id }, user);
      const { expansionRule } = data;
      return expansionRule;
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getExpansionRuleTags(user: User | null): Promise<Tag[] | null> {
    try {
      const data = await reqHasura(convertToQuery(gql.SUB_EXPANSION_RULE_TAGS), {}, user);
      const { expansionRuleTags } = data;
      return expansionRuleTags;
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getExpansionRuns(user: User | null): Promise<ExpansionRun[]> {
    try {
      const data = await reqHasura(gql.GET_EXPANSION_RUNS, {}, user);
      const { expansionRuns } = data;
      return expansionRuns;
    } catch (e) {
      catchError(e as Error);
      return [];
    }
  },

  async getExpansionSequenceId(
    simulated_activity_id: number,
    simulation_dataset_id: number,
    user: User | null,
  ): Promise<string | null> {
    try {
      const data = await reqHasura<SeqId>(
        gql.GET_EXPANSION_SEQUENCE_ID,
        {
          simulated_activity_id,
          simulation_dataset_id,
        },
        user,
      );
      const { expansionSequence } = data;

      if (expansionSequence) {
        const { seq_id } = expansionSequence;
        return seq_id;
      } else {
        return null;
      }
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getExpansionSequenceSeqJson(
    seqId: string,
    simulationDatasetId: number,
    user: User | null,
  ): Promise<string | null> {
    try {
      const data = await reqHasura<GetSeqJsonResponse>(
        gql.GET_EXPANSION_SEQUENCE_SEQ_JSON,
        {
          seqId,
          simulationDatasetId,
        },
        user,
      );
      const { getSequenceSeqJson } = data;
      if (getSequenceSeqJson != null) {
        const { errors, seqJson, status } = getSequenceSeqJson;

        if (status === 'FAILURE') {
          const [firstError] = errors;
          const { message } = firstError;
          return message;
        } else {
          return JSON.stringify(seqJson, null, 2);
        }
      } else {
        throw Error(`Unable to get expansion sequence seq json for seq ID "${seqId}"`);
      }
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getModels(user: User | null): Promise<ModelSlim[]> {
    try {
      const data = await reqHasura<ModelSlim[]>(gql.GET_MODELS, {}, user);
      const { models = [] } = data;
      if (models != null) {
        return models;
      } else {
        throw Error('Unable to retrieve models');
      }
    } catch (e) {
      catchError(e as Error);
      return [];
    }
  },

  async getParsedAmpcsCommandDictionary(
    commandDictionaryId: number | null | undefined,
    user: User | null,
  ): Promise<AmpcsCommandDictionary | null> {
    if (commandDictionaryId !== null && commandDictionaryId !== undefined) {
      try {
        const data = await reqHasura<[{ parsed_json: AmpcsCommandDictionary }]>(
          gql.GET_PARSED_COMMAND_DICTIONARY,
          { commandDictionaryId },
          user,
        );
        const { command_dictionary } = data;

        if (!Array.isArray(command_dictionary) || !command_dictionary.length) {
          catchError(`Unable to find command dictionary with id ${commandDictionaryId}`);
          return null;
        } else {
          const [{ parsed_json }] = command_dictionary;
          return parsed_json;
        }
      } catch (e) {
        catchError(e as Error);
        return null;
      }
    } else {
      return null;
    }
  },

  async getPlan(id: number, user: User | null): Promise<Plan | null> {
    try {
      const data = await reqHasura<PlanSchema>(gql.GET_PLAN, { id }, user);
      const { plan: planSchema } = data;

      if (planSchema) {
        const { start_time, duration } = planSchema;
        const plan: Plan = {
          ...planSchema,
          end_time_doy: getDoyTimeFromInterval(start_time, duration),
          start_time_doy: getDoyTime(new Date(start_time)),
        };
        return plan;
      } else {
        return null;
      }
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getPlanMergeConflictingActivities(
    merge_request_id: number,
    user: User | null,
  ): Promise<PlanMergeConflictingActivity[]> {
    try {
      const query = convertToQuery(gql.SUB_PLAN_MERGE_CONFLICTING_ACTIVITIES);
      const data = await reqHasura<PlanMergeConflictingActivity[]>(query, { merge_request_id }, user);
      const { conflictingActivities } = data;
      if (conflictingActivities != null) {
        return conflictingActivities;
      } else {
        throw Error('Unable to retrieve conflicting activities');
      }
    } catch (e) {
      catchError(e as Error);
      return [];
    }
  },

  async getPlanMergeNonConflictingActivities(
    merge_request_id: number,
    user: User | null,
  ): Promise<PlanMergeNonConflictingActivity[]> {
    try {
      const data = await reqHasura<PlanMergeNonConflictingActivity[]>(
        gql.GET_PLAN_MERGE_NON_CONFLICTING_ACTIVITIES,
        {
          merge_request_id,
        },
        user,
      );
      const { nonConflictingActivities } = data;
      if (nonConflictingActivities != null) {
        return nonConflictingActivities;
      } else {
        throw Error('Unable to retrieve non-conflicting activities');
      }
    } catch (e) {
      catchError(e as Error);
      return [];
    }
  },

  async getPlanMergeRequestInProgress(planId: number, user: User | null): Promise<PlanMergeRequestSchema | null> {
    try {
      const query = convertToQuery(gql.SUB_PLAN_MERGE_REQUEST_IN_PROGRESS);
      const data = await reqHasura<PlanMergeRequestSchema[]>(query, { planId }, user);
      const { merge_requests } = data;
      if (merge_requests != null) {
        const [merge_request] = merge_requests; // Query uses 'limit: 1' so merge_requests.length === 1.
        return merge_request;
      } else {
        throw Error('Unable to get merge requests in progress');
      }
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getPlanRevision(planId: number, user: User | null): Promise<number | null> {
    try {
      const query = convertToQuery(gql.SUB_PLAN_REVISION);
      const data = await reqHasura<Pick<Plan, 'revision'>>(query, { planId }, user);
      const { plan } = data;
      if (plan != null) {
        const { revision } = plan;
        return revision;
      } else {
        throw Error('Unable to retrieve plan revision');
      }
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getPlanTags(planId: number, user: User | null): Promise<Tag[]> {
    try {
      const data = await reqHasura(convertToQuery(gql.SUB_PLAN_TAGS), { planId }, user);
      const { tags } = data;
      return tags;
    } catch (e) {
      catchError(e as Error);
      return [];
    }
  },

  async getPlansAndModels(user: User | null): Promise<{ models: ModelSlim[]; plans: PlanSlim[] }> {
    try {
      const data = (await reqHasura(gql.GET_PLANS_AND_MODELS, {}, user)) as {
        models: ModelSlim[];
        plans: PlanSlim[];
      };
      const { models, plans } = data;

      return {
        models,
        plans: plans.map(plan => {
          return {
            ...plan,
            end_time_doy: getDoyTimeFromInterval(plan.start_time, plan.duration),
            start_time_doy: getDoyTime(new Date(plan.start_time)),
          };
        }),
      };
    } catch (e) {
      catchError(e as Error);
      return { models: [], plans: [] };
    }
  },

  async getPlansAndModelsForConstraints(user: User | null): Promise<{
    modelMap: Record<number, ModelSlim>;
    models: ModelSlim[];
    planMap: Record<number, PlanSlim>;
    plans: PlanSlim[];
  }> {
    try {
      const { models, plans } = await effects.getPlansAndModels(user);
      const planMap: Record<number, PlanSlim> = plans.reduce((prevMap: Record<number, PlanSlim>, plan: PlanSlim) => {
        return {
          ...prevMap,
          [plan.id]: plan,
        };
      }, {});
      const modelMap: Record<number, ModelSlim> = models.reduce(
        (prevMap: Record<number, ModelSlim>, model: ModelSlim) => {
          return {
            ...prevMap,
            [model.id]: model,
          };
        },
        {},
      );

      return { modelMap, models, planMap, plans };
    } catch (e) {
      catchError(e as Error);
      return { modelMap: {}, models: [], planMap: {}, plans: [] };
    }
  },

  async getPlansAndModelsForScheduling(user: User | null): Promise<{
    models: ModelSlim[];
    plans: PlanSchedulingSpec[];
  }> {
    try {
      const data = (await reqHasura(gql.GET_PLANS_AND_MODELS_FOR_SCHEDULING, {}, user)) as {
        models: ModelSlim[];
        plans: PlanSchedulingSpec[];
      };

      const { models, plans } = data;
      return { models, plans };
    } catch (e) {
      catchError(e as Error);
      return { models: [], plans: [] };
    }
  },

  async getResourceTypes(model_id: number, user: User | null, limit: number | null = null): Promise<ResourceType[]> {
    try {
      const data = await reqHasura<ResourceType[]>(gql.GET_RESOURCE_TYPES, { limit, model_id }, user);
      const { resource_types } = data;
      if (resource_types != null) {
        return resource_types;
      } else {
        throw Error('Unable to retrieve resource types');
      }
    } catch (e) {
      catchError(e as Error);
      return [];
    }
  },

  async getResources(datasetId: number, startTimeYmd: string, user: User | null): Promise<Resource[]> {
    try {
      const data = await reqHasura<Profile[]>(gql.GET_PROFILES, { datasetId }, user);
      const { profile: profiles } = data;
      return sampleProfiles(profiles, startTimeYmd);
    } catch (e) {
      catchError(e as Error);
      return [];
    }
  },

  async getResourcesExternal(planId: number, startTimeYmd: string, user: User | null): Promise<Resource[]> {
    try {
      const data = await reqHasura<PlanDataset[]>(gql.GET_PROFILES_EXTERNAL, { planId }, user);
      const { plan_dataset: plan_datasets } = data;
      if (plan_datasets != null) {
        let resources: Resource[] = [];
        for (const dataset of plan_datasets) {
          const {
            dataset: { profiles },
            offset_from_plan_start,
          } = dataset;
          const sampledResources: Resource[] = sampleProfiles(profiles, startTimeYmd, offset_from_plan_start);
          resources = [...resources, ...sampledResources];
        }

        return resources;
      } else {
        throw Error('Unable to get external resources');
      }
    } catch (e) {
      catchError(e as Error);
      return [];
    }
  },

  async getSchedulingCondition(id: number | null | undefined, user: User | null): Promise<SchedulingCondition | null> {
    if (id !== null && id !== undefined) {
      try {
        const data = await reqHasura<SchedulingCondition>(gql.GET_SCHEDULING_CONDITION, { id }, user);
        const { condition } = data;
        return condition;
      } catch (e) {
        catchError(e as Error);
        return null;
      }
    } else {
      return null;
    }
  },

  async getSchedulingGoal(id: number | null | undefined, user: User | null): Promise<SchedulingGoal | null> {
    if (id !== null && id !== undefined) {
      try {
        const data = await reqHasura<SchedulingGoal>(gql.GET_SCHEDULING_GOAL, { id }, user);
        const { goal } = data;
        return goal;
      } catch (e) {
        catchError(e as Error);
        return null;
      }
    } else {
      return null;
    }
  },

  async getSchedulingSpecConditionsForCondition(
    condition_id: number | null,
    user: User | null,
  ): Promise<SchedulingSpecCondition[] | null> {
    if (condition_id !== null) {
      try {
        const data = await reqHasura<SchedulingSpecCondition[]>(
          gql.GET_SCHEDULING_SPEC_CONDITIONS_FOR_CONDITION,
          {
            condition_id,
          },
          user,
        );
        const { scheduling_specification_conditions } = data;
        return scheduling_specification_conditions;
      } catch (e) {
        catchError(e as Error);
        return null;
      }
    } else {
      return null;
    }
  },

  async getSchedulingSpecGoalsForGoal(goal_id: number | null, user: User | null): Promise<SchedulingSpecGoal[] | null> {
    if (goal_id !== null) {
      try {
        const data = await reqHasura<SchedulingSpecGoal[]>(gql.GET_SCHEDULING_SPEC_GOALS_FOR_GOAL, { goal_id }, user);
        const { scheduling_specification_goals } = data;
        return scheduling_specification_goals;
      } catch (e) {
        catchError(e as Error);
        return null;
      }
    } else {
      return null;
    }
  },

  async getSpans(datasetId: number, user: User | null): Promise<Span[]> {
    try {
      const data = await reqHasura<Span[]>(gql.GET_SPANS, { datasetId }, user);
      const { span: spans } = data;
      if (spans != null) {
        return spans;
      } else {
        throw Error('Unable to get spans');
      }
    } catch (e) {
      catchError(e as Error);
      return [];
    }
  },

  async getTags(user: User | null): Promise<Tag[]> {
    try {
      const query = convertToQuery(gql.SUB_TAGS);
      const data = await reqHasura<Tag[]>(query, {}, user);
      const { tags } = data;
      if (tags != null) {
        return tags;
      } else {
        throw Error('Unable to get tags');
      }
    } catch (e) {
      catchError(e as Error);
      return [];
    }
  },

  async getTsFilesActivityType(
    activityTypeName: string | null | undefined,
    modelId: number | null | undefined,
    user: User | null,
  ): Promise<TypeScriptFile[]> {
    if (activityTypeName !== null && activityTypeName !== undefined && modelId !== null && modelId !== undefined) {
      try {
        const data = await reqHasura<DslTypeScriptResponse>(
          gql.GET_TYPESCRIPT_ACTIVITY_TYPE,
          {
            activityTypeName,
            modelId,
          },
          user,
        );
        const { dslTypeScriptResponse } = data;
        if (dslTypeScriptResponse != null) {
          const { reason, status, typescriptFiles } = dslTypeScriptResponse;

          if (status === 'success') {
            return typescriptFiles;
          } else {
            catchError(reason);
            return [];
          }
        } else {
          throw Error(`Unable to get TypeScript activity type "${activityTypeName}"`);
        }
      } catch (e) {
        catchError(e as Error);
        return [];
      }
    } else {
      return [];
    }
  },

  async getTsFilesCommandDictionary(
    commandDictionaryId: number | null | undefined,
    user: User | null,
  ): Promise<TypeScriptFile[]> {
    if (commandDictionaryId !== null && commandDictionaryId !== undefined) {
      try {
        const data = await reqHasura<DslTypeScriptResponse>(
          gql.GET_TYPESCRIPT_COMMAND_DICTIONARY,
          { commandDictionaryId },
          user,
        );
        const { dslTypeScriptResponse } = data;
        if (dslTypeScriptResponse != null) {
          const { reason, status, typescriptFiles } = dslTypeScriptResponse;

          if (status === 'success') {
            return typescriptFiles;
          } else {
            catchError(reason);
            return [];
          }
        } else {
          throw Error(`Unable to get TypeScript command dictionary with ID: "${commandDictionaryId}"`);
        }
      } catch (e) {
        catchError(e as Error);
        return [];
      }
    } else {
      return [];
    }
  },

  async getTsFilesConstraints(model_id: number, plan_id: number | null, user: User | null): Promise<TypeScriptFile[]> {
    if (model_id !== null && model_id !== undefined) {
      try {
        const data = await reqHasura<DslTypeScriptResponse>(
          gql.GET_TYPESCRIPT_CONSTRAINTS,
          { model_id, plan_id },
          user,
        );
        const { dslTypeScriptResponse } = data;
        if (dslTypeScriptResponse != null) {
          const { reason, status, typescriptFiles } = dslTypeScriptResponse;

          if (status === 'success') {
            return typescriptFiles;
          } else {
            catchError(reason);
            return [];
          }
        } else {
          throw Error('Unable to retrieve TypeScript constraint files');
        }
      } catch (e) {
        catchError(e as Error);
        return [];
      }
    } else {
      return [];
    }
  },

  async getTsFilesScheduling(model_id: number | null | undefined, user: User | null): Promise<TypeScriptFile[]> {
    if (model_id !== null && model_id !== undefined) {
      try {
        const data = await reqHasura<DslTypeScriptResponse>(gql.GET_TYPESCRIPT_SCHEDULING, { model_id }, user);
        const { dslTypeScriptResponse } = data;
        if (dslTypeScriptResponse != null) {
          const { reason, status, typescriptFiles } = dslTypeScriptResponse;

          if (status === 'success') {
            return typescriptFiles;
          } else {
            catchError(reason);
            return [];
          }
        } else {
          throw Error('Unable to retrieve TypeScript scheduling files');
        }
      } catch (e) {
        catchError(e as Error);
        return [];
      }
    } else {
      return [];
    }
  },

  async getUserQueries(user: User | null): Promise<PermissibleQueriesMap | null> {
    try {
      const data = await reqHasura<PermissibleQueryResponse | null>(gql.GET_PERMISSIBLE_QUERIES, {}, user, undefined);
      if (data != null) {
        const { queries } = data;

        if (queries != null) {
          const mutationQueries = queries.mutationType?.fields ?? [];
          const viewQueries = queries.queryType?.fields ?? [];

          return [...viewQueries, ...mutationQueries].reduce((queriesMap, permissibleQuery) => {
            return {
              ...queriesMap,
              [permissibleQuery.name]: true,
            };
          }, {});
        } else {
          throw Error('Unable to retrieve user permissions');
        }
      }

      return {};
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getUserSequence(id: number, user: User | null): Promise<UserSequence | null> {
    try {
      const data = await reqHasura<UserSequence>(gql.GET_USER_SEQUENCE, { id }, user);
      const { userSequence } = data;
      return userSequence;
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getUserSequenceFromSeqJson(seqJson: SeqJson, user: User | null): Promise<string> {
    try {
      const data = await reqHasura<string>(gql.GET_USER_SEQUENCE_FROM_SEQ_JSON, { seqJson }, user);
      const { sequence } = data;
      if (sequence != null) {
        return sequence;
      } else {
        throw Error('Unable to retrieve user sequence');
      }
    } catch (e) {
      return (e as Error).message;
    }
  },

  async getUserSequenceSeqJson(
    commandDictionaryId: number | null,
    sequenceDefinition: string | null,
    user: User | null,
    signal: AbortSignal | undefined = undefined,
  ): Promise<string> {
    try {
      const data = await reqHasura<GetSeqJsonResponse>(
        gql.GET_USER_SEQUENCE_SEQ_JSON,
        { commandDictionaryId, sequenceDefinition },
        user,
        signal,
      );
      const { getUserSequenceSeqJson } = data;
      if (getUserSequenceSeqJson != null) {
        const { errors, seqJson, status } = getUserSequenceSeqJson;

        if (status === 'FAILURE') {
          const [firstError] = errors;
          const { message } = firstError;
          return message;
        } else {
          return JSON.stringify(seqJson, null, 2);
        }
      } else {
        throw Error('Unable to retrieve user sequence JSON');
      }
    } catch (e) {
      return (e as Error).message;
    }
  },

  async getView(
    query: URLSearchParams | null,
    user: User | null,
    activityTypes: ActivityType[] = [],
    resourceTypes: ResourceType[] = [],
  ): Promise<View | null> {
    try {
      if (query !== null) {
        const viewId = query.has('viewId') ? query.get('viewId') : null;
        const viewIdAsNumber = parseFloatOrNull(viewId);

        if (viewIdAsNumber !== null) {
          const data = await reqHasura<View>(gql.GET_VIEW, { id: viewIdAsNumber }, user);
          const { view } = data;

          if (view !== null) {
            return view;
          }
        }
      }

      return generateDefaultView(activityTypes, resourceTypes);
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async initialSimulationUpdate(
    plan_id: number,
    simulation_template_id: number | null = null,
    simulation_start_time: string | null = null,
    simulation_end_time: string | null = null,
    user: User | null,
  ): Promise<boolean> {
    try {
      if (!queryPermissions.INITIAL_SIMULATION_UPDATE(user)) {
        throwPermissionError('update a simulation');
      }

      const simulationInput: SimulationInitialUpdateInput = {
        arguments: {} as ArgumentsMap,
        simulation_end_time,
        simulation_start_time,
        simulation_template_id,
      };
      const data = await reqHasura<{ returning: { id: number }[] }>(
        gql.INITIAL_SIMULATION_UPDATE,
        { plan_id: plan_id, simulation: simulationInput },
        user,
      );
      if (data.update_simulation != null) {
        return true;
      } else {
        throw Error('Unable to update simulation');
      }
    } catch (e) {
      catchError(e as Error);
      return false;
    }
  },

  async insertExpansionSequenceToActivity(
    simulation_dataset_id: number,
    simulated_activity_id: number,
    seq_id: string,
    user: User | null,
  ): Promise<string | null> {
    try {
      if (!queryPermissions.INSERT_EXPANSION_SEQUENCE_TO_ACTIVITY(user)) {
        throwPermissionError('add an expansion sequence to an activity');
      }

      const input: ExpansionSequenceToActivityInsertInput = { seq_id, simulated_activity_id, simulation_dataset_id };
      const data = await reqHasura<{ seq_id: string }>(gql.INSERT_EXPANSION_SEQUENCE_TO_ACTIVITY, { input }, user);
      const { sequence } = data;

      if (sequence != null) {
        showSuccessToast('Expansion Sequence Added To Activity Successfully');
        const { seq_id } = sequence;
        return seq_id;
      } else {
        return null;
      }
    } catch (e) {
      catchError('Add Expansion Sequence To Activity Failed', e as Error);
      showFailureToast('Add Expansion Sequence To Activity Failed');
      return null;
    }
  },

  async loadViewFromFile(files: FileList): Promise<{ definition: ViewDefinition | null; errors?: string[] }> {
    try {
      const file: File = files[0];

      const viewFileString: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          resolve(reader.result as string);
        };

        reader.onerror = reject;

        reader.readAsText(file);
      });

      const viewJSON = JSON.parse(viewFileString);
      const { errors, valid } = await effects.validateViewJSON(viewJSON);

      if (valid) {
        return { definition: viewJSON };
      } else {
        return {
          definition: null,
          errors,
        };
      }
    } catch (e) {
      catchError(e as Error);
    }

    return {
      definition: null,
      errors: [],
    };
  },

  async login(username: string, password: string): Promise<ReqAuthResponse> {
    try {
      const data = await reqGateway<ReqAuthResponse>(
        '/auth/login',
        'POST',
        JSON.stringify({ password, username }),
        null,
        false,
      );
      return data;
    } catch (e) {
      catchError(e as Error);
      return {
        message: 'An unexpected error occurred',
        success: false,
        token: null,
      };
    }
  },

  async planMergeBegin(merge_request_id: number, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.PLAN_MERGE_BEGIN(user)) {
        throwPermissionError('begin a merge');
      }

      const data = await reqHasura<{ merge_request_id: number }>(gql.PLAN_MERGE_BEGIN, { merge_request_id }, user);
      if (data.begin_merge != null) {
        return true;
      } else {
        throw Error('Unable to begin plan merge');
      }
    } catch (error) {
      showFailureToast('Begin Merge Failed');
      catchError('Begin Merge Failed', error as Error);
      return false;
    }
  },

  async planMergeCancel(merge_request_id: number, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.PLAN_MERGE_CANCEL(user)) {
        throwPermissionError('cancel this merge request');
      }

      const data = await reqHasura<{ merge_request_id: number }>(gql.PLAN_MERGE_CANCEL, { merge_request_id }, user);
      if (data.cancel_merge != null) {
        showSuccessToast('Canceled Merge Request');
        return true;
      } else {
        throw Error('Unable to cancel merge request');
      }
    } catch (error) {
      catchError('Cancel Merge Request Failed', error as Error);
      showFailureToast('Cancel Merge Request Failed');
      return false;
    }
  },

  async planMergeCommit(merge_request_id: number, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.PLAN_MERGE_COMMIT(user)) {
        throwPermissionError('approve this merge request');
      }

      const data = await reqHasura<{ merge_request_id: number }>(gql.PLAN_MERGE_COMMIT, { merge_request_id }, user);
      if (data.commit_merge != null) {
        showSuccessToast('Approved Merge Request Changes');
        return true;
      } else {
        throw Error('Unable to approve merge request');
      }
    } catch (error) {
      catchError('Approve Merge Request Changes Failed', error as Error);
      showFailureToast('Approve Merge Request Changes Failed');
      return false;
    }
  },

  async planMergeDeny(merge_request_id: number, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.PLAN_MERGE_DENY(user)) {
        throwPermissionError('deny this merge request');
      }

      const data = await reqHasura<{ merge_request_id: number }>(gql.PLAN_MERGE_DENY, { merge_request_id }, user);
      if (data.deny_merge != null) {
        showSuccessToast('Denied Merge Request Changes');
        return true;
      } else {
        throw Error('Unable to deny merge request');
      }
    } catch (error) {
      catchError('Deny Merge Request Changes Failed', error as Error);
      showFailureToast('Deny Merge Request Changes Failed');
      return false;
    }
  },

  async planMergeRequestWithdraw(merge_request_id: number, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.PLAN_MERGE_REQUEST_WITHDRAW(user)) {
        throwPermissionError('withdraw this merge request');
      }

      const data = await reqHasura<{ merge_request_id: number }>(
        gql.PLAN_MERGE_REQUEST_WITHDRAW,
        { merge_request_id },
        user,
      );
      if (data.withdraw_merge_request != null) {
        showSuccessToast('Withdrew Merge Request');
        return true;
      } else {
        throw Error('Unable to withdraw merge request');
      }
    } catch (error) {
      showFailureToast('Withdraw Merge Request Failed');
      catchError('Withdraw Merge Request Failed', error as Error);
      return false;
    }
  },

  async planMergeResolveAllConflicts(
    merge_request_id: number,
    resolution: PlanMergeResolution,
    user: User | null,
  ): Promise<void> {
    try {
      if (!queryPermissions.PLAN_MERGE_RESOLVE_ALL_CONFLICTS(user)) {
        throwPermissionError('resolve merge request conflicts');
      }

      const data = await reqHasura(gql.PLAN_MERGE_RESOLVE_ALL_CONFLICTS, { merge_request_id, resolution }, user);
      if (data.set_resolution_bulk == null) {
        throw Error('Unable to resolve all merge request conflicts');
      }
    } catch (e) {
      showFailureToast('Resolve All Merge Request Conflicts Failed');
      catchError('Resolve All Merge Request Conflicts Failed', e as Error);
    }
  },

  async planMergeResolveConflict(
    merge_request_id: number,
    activity_id: ActivityDirectiveId,
    resolution: PlanMergeResolution,
    user: User | null,
  ): Promise<void> {
    try {
      if (!queryPermissions.PLAN_MERGE_RESOLVE_CONFLICT(user)) {
        throwPermissionError('resolve merge request conflicts');
      }

      const data = await reqHasura(
        gql.PLAN_MERGE_RESOLVE_CONFLICT,
        { activity_id, merge_request_id, resolution },
        user,
      );
      if (data.set_resolution == null) {
        throw Error('Unable to resolve merge request conflict');
      }
    } catch (e) {
      showFailureToast('Resolve Merge Request Conflict Failed');
      catchError('Resolve Merge Request Conflict Failed', e as Error);
    }
  },

  async removePresetFromActivityDirective(
    plan_id: number,
    activity_directive_id: ActivityDirectiveId,
    preset_id: ActivityPresetId,
    user: User | null,
  ): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_PRESET_TO_DIRECTIVE(user)) {
        throwPermissionError('remove the preset from this activity directive');
      }

      const data = await reqHasura<{ preset_id: number }>(
        gql.DELETE_PRESET_TO_DIRECTIVE,
        { activity_directive_id, plan_id, preset_id },
        user,
      );
      if (data.delete_preset_to_directive_by_pk != null) {
        showSuccessToast('Removed Activity Preset Successfully');
        return true;
      } else {
        throw Error(
          `Unable to remove activity preset with ID: "${preset_id}" from directive with ID: "${activity_directive_id}"`,
        );
      }
    } catch (e) {
      catchError('Activity Preset Removal Failed', e as Error);
      showFailureToast('Activity Preset Removal Failed');
      return false;
    }
  },

  async schedule(analysis_only: boolean = false, user: User | null): Promise<void> {
    try {
      if (!queryPermissions.UPDATE_SCHEDULING_SPEC(user)) {
        throwPermissionError(`run ${analysis_only ? 'scheduling analysis' : 'scheduling'}`);
      }

      const currentPlan = get(plan);
      const specificationId = get(selectedSpecId);
      if (currentPlan !== null && specificationId !== null) {
        const plan_revision = await effects.getPlanRevision(currentPlan.id, user);
        if (plan_revision !== null) {
          await effects.updateSchedulingSpec(specificationId, { analysis_only, plan_revision }, user);
        } else {
          throw Error(`Plan revision for plan ${currentPlan.id} was not found.`);
        }

        let incomplete = true;
        schedulingStatus.set(Status.Incomplete);
        do {
          const data = await reqHasura<SchedulingResponse>(gql.SCHEDULE, { specificationId }, user);
          const { schedule } = data;
          if (schedule != null) {
            const { reason, status } = schedule;

            if (status === 'complete') {
              schedulingStatus.set(Status.Complete);
              incomplete = false;
              showSuccessToast(`Scheduling ${analysis_only ? 'Analysis ' : ''}Complete`);
            } else if (status === 'failed') {
              schedulingStatus.set(Status.Failed);
              catchSchedulingError(reason);
              incomplete = false;

              showFailureToast(`Scheduling ${analysis_only ? 'Analysis ' : ''}Failed`);
              catchError(`Scheduling ${analysis_only ? 'Analysis ' : ''}Failed`);
            } else if (status === 'incomplete') {
              schedulingStatus.set(Status.Incomplete);
            }

            await sleep(500); // Sleep half-second before re-scheduling.
          } else {
            throw Error('Unable to schedule');
          }
        } while (incomplete);
      } else {
        throw Error('Plan is not defined.');
      }
    } catch (e) {
      catchError(e as Error);
      schedulingStatus.set(Status.Failed);
    }
  },

  async session(user: BaseUser | null): Promise<ReqSessionResponse> {
    try {
      const data = await reqGateway<ReqSessionResponse>('/auth/session', 'GET', null, user, false);
      return data;
    } catch (e) {
      catchError(e as Error);
      return { message: 'An unexpected error occurred', success: false };
    }
  },

  async simulate(user: User | null): Promise<void> {
    try {
      if (!queryPermissions.SIMULATE(user)) {
        throwPermissionError('simulate this plan');
      }

      const currentPlan = get(plan);
      if (currentPlan !== null) {
        const data = await reqHasura<SimulateResponse>(gql.SIMULATE, { planId: currentPlan.id }, user);
        const { simulate } = data;
        if (simulate != null) {
          const { simulationDatasetId: newSimulationDatasetId } = simulate;
          simulationDatasetId.set(newSimulationDatasetId);
          simulationDatasetIds.updateValue((ids: number[]) => {
            if (!ids.includes(newSimulationDatasetId)) {
              return [newSimulationDatasetId, ...ids];
            }
            return ids;
          });
        } else {
          throw Error('Unable to simulate this plan');
        }
      } else {
        throw Error('Plan is not defined.');
      }
    } catch (e) {
      catchError(e as Error);
    }
  },

  async updateActivityDirective(
    plan_id: number,
    id: ActivityDirectiveId,
    partialActivityDirective: Partial<ActivityDirective>,
    user: User | null,
  ): Promise<void> {
    try {
      if (!queryPermissions.UPDATE_ACTIVITY_DIRECTIVE(user)) {
        throwPermissionError('update this activity directive');
      }

      const activityDirectiveSetInput: ActivityDirectiveSetInput = {};

      if (partialActivityDirective.arguments) {
        activityDirectiveSetInput.arguments = partialActivityDirective.arguments;
      }

      if (partialActivityDirective.anchor_id !== undefined) {
        activityDirectiveSetInput.anchor_id = partialActivityDirective.anchor_id;
      }

      if (partialActivityDirective.anchored_to_start !== undefined) {
        activityDirectiveSetInput.anchored_to_start = partialActivityDirective.anchored_to_start;
      }

      if (partialActivityDirective.start_offset) {
        activityDirectiveSetInput.start_offset = partialActivityDirective.start_offset;
      }

      if (partialActivityDirective.name) {
        activityDirectiveSetInput.name = partialActivityDirective.name;
      }

      if (partialActivityDirective.metadata) {
        activityDirectiveSetInput.metadata = partialActivityDirective.metadata;
      }

      const data = await reqHasura<ActivityDirective>(
        gql.UPDATE_ACTIVITY_DIRECTIVE,
        {
          activityDirectiveSetInput,
          id,
          plan_id,
        },
        user,
      );
      if (data.update_activity_directive_by_pk) {
        const { update_activity_directive_by_pk: updatedDirective } = data;
        activityDirectivesMap.update((currentActivityDirectivesMap: ActivityDirectivesMap) => ({
          ...currentActivityDirectivesMap,
          [id]: updatedDirective,
        }));
        showSuccessToast('Activity Directive Updated Successfully');
      } else {
        throw Error(`Unable to update directive with ID: "${id}"`);
      }
    } catch (e) {
      catchError('Activity Directive Update Failed', e as Error);
      showFailureToast('Activity Directive Update Failed');
    }
  },

  async updateActivityPreset(
    id: ActivityPresetId,
    partialActivityPreset: ActivityPresetSetInput,
    user: User | null,
  ): Promise<void> {
    try {
      if (!queryPermissions.UPDATE_ACTIVITY_PRESET(user)) {
        throwPermissionError('update this activity preset');
      }

      const activityPresetSetInput: ActivityPresetSetInput = {};

      if (partialActivityPreset.arguments) {
        activityPresetSetInput.arguments = partialActivityPreset.arguments;
      }
      if (partialActivityPreset.associated_activity_type) {
        activityPresetSetInput.associated_activity_type = partialActivityPreset.associated_activity_type;
      }
      if (partialActivityPreset.model_id) {
        activityPresetSetInput.model_id = partialActivityPreset.model_id;
      }
      if (partialActivityPreset.name) {
        activityPresetSetInput.name = partialActivityPreset.name;
      }

      const { update_activity_presets_by_pk } = await reqHasura<ActivityPreset>(
        gql.UPDATE_ACTIVITY_PRESET,
        { activityPresetSetInput, id },
        user,
      );

      if (update_activity_presets_by_pk != null) {
        const { name: presetName } = update_activity_presets_by_pk;
        showSuccessToast(`Activity Preset ${presetName} Updated Successfully`);
      } else {
        throw Error(`Unable to update activity preset with ID: "${id}"`);
      }
    } catch (e) {
      catchError('Activity Preset Update Failed', e as Error);
      showFailureToast('Activity Preset Update Failed');
    }
  },

  async updateConstraint(
    id: number,
    definition: string,
    model_id: number | null,
    name: string,
    plan_id: number | null,
    user: User | null,
    description?: string,
  ): Promise<void> {
    try {
      if (!queryPermissions.UPDATE_CONSTRAINT(user)) {
        throwPermissionError('update this constraint');
      }

      const constraint: Partial<Constraint> = {
        definition,
        model_id: plan_id !== null ? null : model_id,
        name,
        plan_id,
        ...(description && { description }),
      };
      const data = await reqHasura(gql.UPDATE_CONSTRAINT, { constraint, id }, user);
      if (data.updateConstraint != null) {
        showSuccessToast('Constraint Updated Successfully');
      } else {
        throw Error(`Unable to update constraint with ID: "${id}"`);
      }
    } catch (e) {
      catchError('Constraint Update Failed', e as Error);
      showFailureToast('Constraint Update Failed');
    }
  },

  async updateExpansionRule(id: number, rule: Partial<ExpansionRule>, user: User | null): Promise<string | null> {
    try {
      savingExpansionRule.set(true);
      createExpansionRuleError.set(null);

      if (!queryPermissions.UPDATE_EXPANSION_RULE(user)) {
        throwPermissionError('update this expansion rule');
      }

      const data = await reqHasura(gql.UPDATE_EXPANSION_RULE, { id, rule }, user);
      const { updateExpansionRule } = data;
      if (updateExpansionRule != null) {
        const { updated_at } = updateExpansionRule;
        showSuccessToast('Expansion Rule Updated Successfully');
        savingExpansionRule.set(false);
        return updated_at;
      } else {
        throw Error(`Unable to update expansion rule with ID: "${id}"`);
      }
    } catch (e) {
      catchError('Expansion Rule Update Failed', e as Error);
      showFailureToast('Expansion Rule Update Failed');
      savingExpansionRule.set(false);
      createExpansionRuleError.set((e as Error).message);
      return null;
    }
  },

  async updateSchedulingCondition(
    id: number,
    condition: Partial<SchedulingCondition>,
    user: User | null,
  ): Promise<Pick<SchedulingCondition, 'id' | 'last_modified_by' | 'modified_date'> | null> {
    try {
      if (!queryPermissions.UPDATE_SCHEDULING_CONDITION(user)) {
        throwPermissionError('update this scheduling condition');
      }

      const data = await reqHasura(gql.UPDATE_SCHEDULING_CONDITION, { condition, id }, user);
      const { updateSchedulingCondition: updatedCondition } = data;

      if (updatedCondition != null) {
        showSuccessToast('Scheduling Condition Updated Successfully');
        return updatedCondition;
      } else {
        throw Error(`Unable to update scheduling condition with ID: "${id}"`);
      }
    } catch (e) {
      catchError('Scheduling Condition Update Failed', e as Error);
      showFailureToast('Scheduling Condition Update Failed');
      return null;
    }
  },

  async updateSchedulingGoal(
    id: number,
    goal: Partial<SchedulingGoal>,
    user: User | null,
  ): Promise<Pick<SchedulingGoal, 'id' | 'last_modified_by' | 'modified_date'> | null> {
    try {
      if (!queryPermissions.UPDATE_SCHEDULING_GOAL(user)) {
        throwPermissionError('update this scheduling goal');
      }

      const data = await reqHasura(gql.UPDATE_SCHEDULING_GOAL, { goal, id }, user);
      const { updateSchedulingGoal: updatedGoal } = data;

      if (updatedGoal != null) {
        showSuccessToast('Scheduling Goal Updated Successfully');
        return updatedGoal;
      } else {
        throw Error(`Unable to update scheduling goal with ID: "${id}"`);
      }
    } catch (e) {
      catchError('Scheduling Goal Update Failed', e as Error);
      showFailureToast('Scheduling Goal Update Failed');
      return null;
    }
  },

  async updateSchedulingSpec(id: number, spec: Partial<SchedulingSpec>, user: User | null): Promise<void> {
    try {
      if (!queryPermissions.UPDATE_SCHEDULING_SPEC(user)) {
        throwPermissionError('update this scheduling spec');
      }

      const data = await reqHasura(gql.UPDATE_SCHEDULING_SPEC, { id, spec }, user);
      if (data.updateSchedulingSpec == null) {
        throw Error(`Unable to update scheduling spec with ID: "${id}"`);
      }
    } catch (e) {
      catchError(e as Error);
    }
  },

  async updateSchedulingSpecCondition(
    condition_id: number,
    specification_id: number,
    spec_condition: Partial<SchedulingSpecCondition>,
    user: User | null,
  ): Promise<void> {
    try {
      if (!queryPermissions.UPDATE_SCHEDULING_SPEC_CONDITION_ID(user)) {
        throwPermissionError('update this scheduling spec condition');
      }

      const data = await reqHasura(
        gql.UPDATE_SCHEDULING_SPEC_CONDITION,
        { condition_id, spec_condition, specification_id },
        user,
      );
      if (data.updateSchedulingSpecCondition != null) {
        showSuccessToast('Scheduling Spec Condition Updated Successfully');
      } else {
        throw Error(`Unable to update scheduling spec condition with ID: "${condition_id}"`);
      }
    } catch (e) {
      catchError('Scheduling Spec Condition Update Failed', e as Error);
      showFailureToast('Scheduling Spec Condition Update Failed');
    }
  },

  async updateSchedulingSpecConditionId(
    condition_id: number,
    specification_id: number,
    new_specification_id: number,
    user: User | null,
  ): Promise<void> {
    try {
      if (!queryPermissions.UPDATE_SCHEDULING_SPEC_CONDITION_ID(user)) {
        throwPermissionError('update this scheduling spec condition');
      }

      const data = await reqHasura(
        gql.UPDATE_SCHEDULING_SPEC_CONDITION_ID,
        {
          condition_id,
          new_specification_id,
          specification_id,
        },
        user,
      );
      if (data.updateSchedulingSpecConditionId != null) {
        showSuccessToast('Scheduling Spec Condition Updated Successfully');
      } else {
        throw Error(`Unable to update scheduling spec condition with ID: "${condition_id}"`);
      }
    } catch (e) {
      catchError('Scheduling Spec Condition Update Failed', e as Error);
      showFailureToast('Scheduling Spec Condition Update Failed');
    }
  },

  async updateSchedulingSpecGoal(
    goal_id: number,
    specification_id: number,
    spec_goal: Partial<SchedulingSpecGoal>,
    user: User | null,
  ): Promise<void> {
    try {
      if (!queryPermissions.UPDATE_SCHEDULING_SPEC_GOAL(user)) {
        throwPermissionError('update this scheduling spec goal');
      }

      const data = await reqHasura(gql.UPDATE_SCHEDULING_SPEC_GOAL, { goal_id, spec_goal, specification_id }, user);
      if (data.updateSchedulingSpecGoal != null) {
        showSuccessToast('Scheduling Spec Goal Updated Successfully');
      } else {
        throw Error(`Unable to update scheduling spec goal with ID: "${goal_id}"`);
      }
    } catch (e) {
      catchError('Scheduling Spec Goal Update Failed', e as Error);
      showFailureToast('Scheduling Spec Goal Update Failed');
    }
  },

  async updateSimulation(simulationSetInput: Simulation, user: User | null, newFiles: File[] = []): Promise<void> {
    try {
      if (!queryPermissions.UPDATE_SIMULATION(user)) {
        throwPermissionError('update this simulation');
      }

      const data = await reqHasura<Pick<Simulation, 'id'>>(
        gql.UPDATE_SIMULATION,
        {
          id: simulationSetInput.id,
          simulation: {
            arguments: simulationSetInput.arguments,
            simulation_end_time: simulationSetInput?.simulation_end_time ?? null,
            simulation_start_time: simulationSetInput?.simulation_start_time ?? null,
            simulation_template_id: simulationSetInput?.template?.id ?? null,
          },
        },
        user,
      );
      if (data.updateSimulation !== null) {
        await effects.uploadFiles(newFiles, user);
        showSuccessToast('Simulation Updated Successfully');
      } else {
        throw Error(`Unable to update simulation with ID: "${simulationSetInput.id}"`);
      }
    } catch (e) {
      catchError('Simulation Update Failed', e as Error);
      showFailureToast('Simulation Update Failed');
    }
  },

  async updateSimulationTemplate(
    id: number,
    partialSimulationTemplate: SimulationTemplateSetInput,
    user: User | null,
  ): Promise<void> {
    try {
      if (!queryPermissions.UPDATE_SIMULATION_TEMPLATE(user)) {
        throwPermissionError('update this simulation template');
      }

      const simulationTemplateSetInput: SimulationTemplateSetInput = {
        ...(partialSimulationTemplate.arguments && { arguments: partialSimulationTemplate.arguments }),
        ...(partialSimulationTemplate.description && { description: partialSimulationTemplate.description }),
        ...(partialSimulationTemplate.model_id && { model_id: partialSimulationTemplate.model_id }),
      };

      const { update_simulation_template_by_pk } = await reqHasura<SimulationTemplate>(
        gql.UPDATE_SIMULATION_TEMPLATE,
        {
          id,
          simulationTemplateSetInput,
        },
        user,
      );

      if (update_simulation_template_by_pk != null) {
        const { description: templateDescription } = update_simulation_template_by_pk;
        showSuccessToast(`Simulation Template ${templateDescription} Updated Successfully`);
      } else {
        throw Error(`Unable to update simulation template with ID: "${id}"`);
      }
    } catch (e) {
      catchError('Simulation Template Update Failed', e as Error);
      showFailureToast('Simulation Template Update Failed');
    }
  },

  async updateTag(
    id: number,
    tagSetInput: TagsSetInput,
    user: User | null,
    notify: boolean = true,
  ): Promise<Tag | null> {
    try {
      createTagError.set(null);
      if (!queryPermissions.UPDATE_TAG(user)) {
        throwPermissionError('update tag');
      }
      const data = await reqHasura<Tag>(gql.UPDATE_TAG, { id, tagSetInput }, user);
      const { update_tags_by_pk: updatedTag } = data;
      if (notify) {
        showSuccessToast('Tag Updated Successfully');
      }
      createTagError.set(null);
      return updatedTag;
    } catch (e) {
      createTagError.set((e as Error).message);
      catchError('Update Tags Failed', e as Error);
      showFailureToast('Update Tags Failed');
      return null;
    }
  },

  async updateUserSequence(id: number, sequence: Partial<UserSequence>, user: User | null): Promise<string | null> {
    try {
      if (!queryPermissions.UPDATE_USER_SEQUENCE(user)) {
        throwPermissionError('update this user sequence');
      }

      const data = await reqHasura<Pick<UserSequence, 'id' | 'updated_at'>>(
        gql.UPDATE_USER_SEQUENCE,
        { id, sequence },
        user,
      );
      const { updateUserSequence } = data;
      if (updateUserSequence != null) {
        const { updated_at } = updateUserSequence;
        showSuccessToast('User Sequence Updated Successfully');
        return updated_at;
      } else {
        throw Error(`Unable to update user sequence with ID: "${id}"`);
      }
    } catch (e) {
      catchError('User Sequence Update Failed', e as Error);
      showFailureToast('User Sequence Update Failed');
      return null;
    }
  },

  async updateView(id: number, view: Partial<View>, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.UPDATE_VIEW(user)) {
        throwPermissionError('update this view');
      }

      const data = await reqHasura<Pick<View, 'id'>>(gql.UPDATE_VIEW, { id, view }, user);
      if (data.updatedView) {
        showSuccessToast('View Updated Successfully');
        return true;
      } else {
        throw Error(`Unable to update view with ID: "${id}"`);
      }
    } catch (e) {
      catchError('View Update Failed', e as Error);
      showFailureToast('View Update Failed');
      return false;
    }
  },

  async uploadFile(file: File, user: User | null): Promise<number | null> {
    try {
      const body = new FormData();
      body.append('file', file, file.name);
      const data = await reqGateway<{ id: number }>('/file', 'POST', body, user, true);
      const { id } = data;
      return id;
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async uploadFiles(files: File[], user: User | null): Promise<boolean> {
    try {
      for (const file of files) {
        await effects.uploadFile(file, user);
      }
      return true;
    } catch (e) {
      catchError(e as Error);
      return false;
    }
  },

  async uploadView(user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.CREATE_VIEW(user)) {
        throwPermissionError('upload a new view');
      }

      const { confirm, value = null } = await showUploadViewModal();
      if (confirm && value) {
        const { name, definition } = value;

        const viewInsertInput: ViewInsertInput = { definition, name };
        const data = await reqHasura<View>(gql.CREATE_VIEW, { view: viewInsertInput }, user);
        const { newView } = data;

        if (newView != null) {
          view.update(() => newView);
          setQueryParam('viewId', `${newView.id}`);
          return true;
        } else {
          throw Error('Unable to upload view');
        }
      }
    } catch (e) {
      catchError('View Upload Failed', e as Error);
      showFailureToast('View Upload Failed');
    }

    return false;
  },

  async validateActivityArguments(
    activityTypeName: string,
    modelId: number,
    argumentsMap: ArgumentsMap,
    user: User | null,
  ): Promise<ParameterValidationResponse> {
    try {
      const data = await reqHasura<ParameterValidationResponse>(
        gql.VALIDATE_ACTIVITY_ARGUMENTS,
        {
          activityTypeName,
          arguments: argumentsMap,
          modelId,
        },
        user,
      );

      const { validateActivityArguments } = data;
      if (validateActivityArguments != null) {
        return validateActivityArguments;
      } else {
        throw Error('Unable to validate activity arguments');
      }
    } catch (e) {
      catchError(e as Error);
      const { message } = e as Error;
      return { errors: [{ message } as ParameterValidationError], success: false };
    }
  },

  async validateViewJSON(unValidatedView: unknown): Promise<{ errors?: string[]; valid: boolean }> {
    try {
      const { errors, valid } = validateViewJSONAgainstSchema(unValidatedView);
      return {
        errors:
          errors?.map(error => {
            if (typeof error === 'string') {
              return error;
            }
            return JSON.stringify(error);
          }) ?? [],
        valid,
      };
    } catch (e) {
      catchError(e as Error);
      const { message } = e as Error;
      return { errors: [message], valid: false };
    }
  },
};

export default effects;
