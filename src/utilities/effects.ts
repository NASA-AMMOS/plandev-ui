import { goto } from '$app/navigation';
import { base } from '$app/paths';
import type { ErrorObject } from 'ajv';
import { get } from 'svelte/store';
import { activityDirectivesMap, selectedActivityDirectiveId } from '../stores/activities';
import { checkConstraintsStatus, constraintViolationsMap } from '../stores/constraints';
import { catchError, catchSchedulingError } from '../stores/errors';
import {
  createDictionaryError,
  creatingDictionary,
  creatingExpansionSequence,
  planExpansionStatus,
  savingExpansionRule,
  savingExpansionSet,
} from '../stores/expansion';
import { createModelError, createPlanError, creatingModel, creatingPlan, models, plan } from '../stores/plan';
import { schedulingStatus, selectedSpecId } from '../stores/scheduling';
import { commandDictionaries } from '../stores/sequencing';
import { selectedSpanId, simulationDatasetId, simulationDatasetIds } from '../stores/simulation';
import { applyViewUpdate, view } from '../stores/views';
import type {
  ActivityDirective,
  ActivityDirectiveId,
  ActivityDirectiveInsertInput,
  ActivityDirectiveSetInput,
  ActivityDirectivesMap,
  ActivityType,
  ActivityTypeExpansionRules,
} from '../types/activity';
import type { ActivityMetadata } from '../types/activity-metadata';
import type { ReqLoginResponse, ReqLogoutResponse, ReqSessionResponse } from '../types/auth';
import type { Constraint, ConstraintInsertInput, ConstraintViolationsMap } from '../types/constraint';
import type {
  ExpansionRule,
  ExpansionRuleInsertInput,
  ExpansionSequence,
  ExpansionSequenceInsertInput,
  ExpansionSequenceToActivityInsertInput,
  SeqId,
} from '../types/expansion';
import type { ModelInsertInput, ModelSlim } from '../types/model';
import type { DslTypeScriptResponse, TypeScriptFile } from '../types/monaco';
import type { ArgumentsMap, EffectiveArguments, ParameterValidationResponse } from '../types/parameter';
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
  Span,
} from '../types/simulation';
import type { View, ViewDefinition, ViewInsertInput } from '../types/view';
import { convertToQuery, formatHasuraStringArray, parseFloatOrNull, setQueryParam, sleep } from './generic';
import gql from './gql';
import {
  showConfirmModal,
  showCreatePlanBranchModal,
  showCreateViewModal,
  showEditViewModal,
  showPlanBranchRequestModal,
  showUploadViewModal,
} from './modal';
import { reqGateway, reqHasura } from './requests';
import { sampleProfiles } from './resources';
import { Status } from './status';
import { getDoyTime, getDoyTimeFromInterval, getIntervalFromDoyRange } from './time';
import { showFailureToast, showSuccessToast } from './toast';
import { generateDefaultView } from './view';

/**
 * Functions that have side-effects (e.g. HTTP requests, toasts, popovers, store updates, etc.).
 */
const effects = {
  async checkConstraints(): Promise<void> {
    try {
      checkConstraintsStatus.set(Status.Incomplete);
      const { id: planId } = get(plan);
      const data = await reqHasura<{ violationsMap: ConstraintViolationsMap }>(gql.CHECK_CONSTRAINTS, { planId });
      const { checkConstraintsResponse } = data;
      const { violationsMap } = checkConstraintsResponse;

      constraintViolationsMap.set(violationsMap);
      checkConstraintsStatus.set(Status.Complete);
      showSuccessToast('Check Constraints Complete');
    } catch (e) {
      catchError('Check Constraints Failed', e);
      checkConstraintsStatus.set(Status.Failed);
      showFailureToast('Check Constraints Failed');
    }
  },

  async createActivityDirective(
    argumentsMap: ArgumentsMap,
    start_time_doy: string,
    type: string,
    name: string,
    tags: string[],
    metadata: ActivityMetadata,
  ): Promise<void> {
    try {
      const currentPlan = get<Plan>(plan);
      const start_offset = getIntervalFromDoyRange(currentPlan.start_time_doy, start_time_doy);
      const tagsString = formatHasuraStringArray(tags);
      const activityDirectiveInsertInput: ActivityDirectiveInsertInput = {
        anchor_id: null,
        anchored_to_start: true,
        arguments: argumentsMap,
        metadata,
        name,
        plan_id: currentPlan.id,
        start_offset,
        tags: tagsString,
        type,
      };
      const data = await reqHasura<ActivityDirective>(gql.CREATE_ACTIVITY_DIRECTIVE, { activityDirectiveInsertInput });
      const { insert_activity_directive_one: newActivityDirective } = data;
      const { id } = newActivityDirective;

      activityDirectivesMap.update((currentActivityDirectivesMap: ActivityDirectivesMap) => ({
        ...currentActivityDirectivesMap,
        [id]: newActivityDirective,
      }));
      selectedActivityDirectiveId.set(id);
      selectedSpanId.set(null);

      showSuccessToast('Activity Directive Created Successfully');
    } catch (e) {
      catchError('Activity Directive Create Failed', e);
      showFailureToast('Activity Directive Create Failed');
    }
  },

  async createCommandDictionary(files: FileList): Promise<void> {
    try {
      createDictionaryError.set(null);
      creatingDictionary.set(true);

      const file: File = files[0];
      const dictionary = await file.text();
      const data = await reqHasura<CommandDictionary>(gql.CREATE_COMMAND_DICTIONARY, { dictionary });
      const { createCommandDictionary: newCommandDictionary } = data;

      showSuccessToast('Command Dictionary Created Successfully');
      createDictionaryError.set(null);
      creatingDictionary.set(false);
      commandDictionaries.updateValue((dictionaries: CommandDictionary[]) => [newCommandDictionary, ...dictionaries]);
    } catch (e) {
      catchError('Command Dictionary Create Failed', e);
      showFailureToast('Command Dictionary Create Failed');
      createDictionaryError.set(e.message);
      creatingDictionary.set(false);
    }
  },

  async createConstraint(
    definition: string,
    description: string,
    model_id: number | null,
    name: string,
    plan_id: number | null,
    summary: string,
  ): Promise<number | null> {
    try {
      const constraintInsertInput: ConstraintInsertInput = {
        definition,
        description,
        model_id: plan_id !== null ? null : model_id,
        name,
        plan_id,
        summary,
      };
      const data = await reqHasura(gql.CREATE_CONSTRAINT, { constraint: constraintInsertInput });
      const { createConstraint } = data;
      const { id } = createConstraint;

      showSuccessToast('Constraint Created Successfully');
      return id;
    } catch (e) {
      catchError('Constraint Creation Failed', e);
      showFailureToast('Constraint Creation Failed');
      return null;
    }
  },

  async createExpansionRule(rule: ExpansionRuleInsertInput): Promise<number | null> {
    try {
      savingExpansionRule.set(true);
      const data = await reqHasura(gql.CREATE_EXPANSION_RULE, { rule });
      const { createExpansionRule } = data;
      const { id } = createExpansionRule;
      showSuccessToast('Expansion Rule Created Successfully');
      savingExpansionRule.set(false);
      return id;
    } catch (e) {
      catchError('Expansion Rule Create Failed', e);
      showFailureToast('Expansion Rule Create Failed');
      savingExpansionRule.set(false);
      return null;
    }
  },

  async createExpansionSequence(seqId: string, simulationDatasetId: number): Promise<void> {
    try {
      creatingExpansionSequence.set(true);
      const sequence: ExpansionSequenceInsertInput = {
        metadata: {},
        seq_id: seqId,
        simulation_dataset_id: simulationDatasetId,
      };
      await reqHasura<SeqId>(gql.CREATE_EXPANSION_SEQUENCE, { sequence });
      showSuccessToast('Expansion Sequence Created Successfully');
      creatingExpansionSequence.set(false);
    } catch (e) {
      catchError('Expansion Sequence Create Failed', e);
      showFailureToast('Expansion Sequence Create Failed');
      creatingExpansionSequence.set(false);
    }
  },

  async createExpansionSet(dictionaryId: number, modelId: number, expansionRuleIds: number[]): Promise<number | null> {
    try {
      savingExpansionSet.set(true);
      const data = await reqHasura(gql.CREATE_EXPANSION_SET, { dictionaryId, expansionRuleIds, modelId });
      const { createExpansionSet } = data;
      const { id } = createExpansionSet;
      showSuccessToast('Expansion Set Created Successfully');
      savingExpansionSet.set(false);
      return id;
    } catch (e) {
      catchError('Expansion Set Create Failed', e);
      showFailureToast('Expansion Set Create Failed');
      savingExpansionSet.set(false);
      return null;
    }
  },

  async createModel(name: string, version: string, files: FileList): Promise<void> {
    try {
      createModelError.set(null);
      creatingModel.set(true);

      const file: File = files[0];
      const jar_id = await effects.uploadFile(file);
      const modelInsertInput: ModelInsertInput = {
        jar_id,
        mission: '',
        name,
        version,
      };
      const data = await reqHasura(gql.CREATE_MODEL, { model: modelInsertInput });
      const { createModel } = data;
      const { id } = createModel;
      const model: ModelSlim = { id, jar_id, name, version };

      showSuccessToast('Model Created Successfully');
      createModelError.set(null);
      creatingModel.set(false);
      models.updateValue((currentModels: ModelSlim[]) => [...currentModels, model]);
    } catch (e) {
      catchError('Model Create Failed', e);
      showFailureToast('Model Create Failed');
      createModelError.set(e.message);
      creatingModel.set(false);
    }
  },

  async createPlan(
    end_time_doy: string,
    model_id: number,
    name: string,
    start_time_doy: string,
    simulation_template_id: number | null,
  ): Promise<PlanSlim | null> {
    try {
      createPlanError.set(null);
      creatingPlan.set(true);

      const planInsertInput: PlanInsertInput = {
        duration: getIntervalFromDoyRange(start_time_doy, end_time_doy),
        model_id,
        name,
        start_time: start_time_doy, // Postgres accepts DOY dates for it's 'timestamptz' type.
      };
      const data = await reqHasura<Pick<PlanSchema, 'id' | 'revision' | 'start_time'>>(gql.CREATE_PLAN, {
        plan: planInsertInput,
      });
      const { createPlan } = data;
      const { id, revision, start_time } = createPlan;

      await effects.initialSimulationUpdate(id, simulation_template_id, start_time_doy, end_time_doy);
      await effects.createSchedulingSpec({
        analysis_only: false,
        horizon_end: end_time_doy,
        horizon_start: start_time_doy,
        plan_id: id,
        plan_revision: revision,
        simulation_arguments: {},
      });

      const plan: PlanSlim = {
        end_time_doy,
        id,
        model_id,
        name,
        revision,
        start_time,
        start_time_doy,
      };

      showSuccessToast('Plan Created Successfully');
      createPlanError.set(null);
      creatingPlan.set(false);

      return plan;
    } catch (e) {
      catchError('Plan Create Failed', e);
      showFailureToast('Plan Create Failed');
      createPlanError.set(e.message);
      creatingPlan.set(false);

      return null;
    }
  },

  async createPlanBranch(plan: Plan): Promise<void> {
    try {
      const { confirm, value = null } = await showCreatePlanBranchModal(plan);

      if (confirm && value) {
        const { name, plan } = value;
        const data = await reqHasura(gql.DUPLICATE_PLAN, { new_plan_name: name, plan_id: plan.id });
        const { duplicate_plan } = data;
        const { new_plan_id } = duplicate_plan;
        await effects.createSchedulingSpec({
          analysis_only: false,
          horizon_end: plan.end_time_doy,
          horizon_start: plan.start_time_doy,
          plan_id: new_plan_id,
          plan_revision: 0,
          simulation_arguments: {},
        });
        goto(`${base}/plans/${duplicate_plan.new_plan_id}`);
        showSuccessToast('Branch Created Successfully');
      }
    } catch (e) {
      catchError('Branch Creation Failed', e);
      showFailureToast('Branch Creation Failed');
    }
  },

  async createPlanBranchRequest(
    plan: Plan,
    action: PlanBranchRequestAction,
    requester_username: string,
  ): Promise<void> {
    try {
      const { confirm, value } = await showPlanBranchRequestModal(plan, action);

      if (confirm) {
        const { source_plan_id, target_plan_id } = value;
        if (action === 'merge') {
          await effects.createPlanMergeRequest(requester_username, source_plan_id, target_plan_id);
        }
      }
    } catch (e) {
      catchError(e);
    }
  },

  async createPlanMergeRequest(
    requester_username: string,
    source_plan_id: number,
    target_plan_id: number,
  ): Promise<number | null> {
    try {
      const data = await reqHasura<{ merge_request_id: number }>(gql.CREATE_PLAN_MERGE_REQUEST, {
        requester_username,
        source_plan_id,
        target_plan_id,
      });
      const { create_merge_request } = data;
      const { merge_request_id } = create_merge_request;
      showSuccessToast('Merge Request Created Successfully');
      return merge_request_id;
    } catch (e) {
      catchError('Merge Request Create Failed', e);
      showFailureToast('Merge Request Create Failed');
      return null;
    }
  },

  async createSchedulingCondition(
    definition: string,
    description: string,
    name: string,
    userId: string,
    modelId: number,
  ): Promise<SchedulingCondition | null> {
    try {
      const conditionInsertInput: SchedulingConditionInsertInput = {
        author: userId,
        definition,
        description,
        last_modified_by: userId,
        model_id: modelId,
        name,
      };
      const data = await reqHasura<SchedulingCondition>(gql.CREATE_SCHEDULING_CONDITION, {
        condition: conditionInsertInput,
      });
      const { createSchedulingCondition: newCondition } = data;

      showSuccessToast('Scheduling Condition Created Successfully');
      return newCondition;
    } catch (e) {
      catchError('Scheduling Condition Create Failed', e);
      showFailureToast('Scheduling Condition Create Failed');
      return null;
    }
  },

  async createSchedulingGoal(
    definition: string,
    description: string,
    name: string,
    userId: string,
    modelId: number,
  ): Promise<SchedulingGoal | null> {
    try {
      const goalInsertInput: SchedulingGoalInsertInput = {
        author: userId,
        definition,
        description,
        last_modified_by: userId,
        model_id: modelId,
        name,
      };
      const data = await reqHasura<SchedulingGoal>(gql.CREATE_SCHEDULING_GOAL, { goal: goalInsertInput });
      const { createSchedulingGoal: newGoal } = data;

      showSuccessToast('Scheduling Goal Created Successfully');
      return newGoal;
    } catch (e) {
      catchError('Scheduling Goal Create Failed', e);
      showFailureToast('Scheduling Goal Create Failed');
      return null;
    }
  },

  async createSchedulingSpec(spec: SchedulingSpecInsertInput): Promise<Pick<SchedulingSpec, 'id'>> {
    try {
      const data = await reqHasura<Pick<SchedulingSpec, 'id'>>(gql.CREATE_SCHEDULING_SPEC, { spec });
      const { createSchedulingSpec: newSchedulingSpec } = data;
      return newSchedulingSpec;
    } catch (e) {
      catchError(e);
    }
  },

  async createSchedulingSpecCondition(spec_condition: SchedulingSpecConditionInsertInput): Promise<void> {
    try {
      await reqHasura(gql.CREATE_SCHEDULING_SPEC_CONDITION, { spec_condition });
    } catch (e) {
      catchError(e);
    }
  },

  async createSchedulingSpecGoal(spec_goal: SchedulingSpecGoalInsertInput): Promise<void> {
    try {
      await reqHasura(gql.CREATE_SCHEDULING_SPEC_GOAL, { spec_goal });
    } catch (e) {
      catchError(e);
    }
  },

  async createUserSequence(sequence: UserSequenceInsertInput): Promise<number | null> {
    try {
      const data = await reqHasura<Pick<UserSequence, 'id'>>(gql.CREATE_USER_SEQUENCE, { sequence });
      const { createUserSequence } = data;
      const { id } = createUserSequence;
      showSuccessToast('User Sequence Created Successfully');
      return id;
    } catch (e) {
      catchError('User Sequence Create Failed', e);
      showFailureToast('User Sequence Create Failed');
      return null;
    }
  },

  async createView(owner: string, definition: ViewDefinition): Promise<boolean> {
    try {
      const { confirm, value = null } = await showCreateViewModal();

      if (confirm && value) {
        const { name } = value;
        const viewInsertInput: ViewInsertInput = { definition, name, owner };
        const data = await reqHasura<View>(gql.CREATE_VIEW, { view: viewInsertInput });
        const { newView } = data;

        view.update(() => newView);
        setQueryParam('viewId', `${newView.id}`);
        showSuccessToast('View Created Successfully');
        return true;
      }
    } catch (e) {
      catchError('View Create Failed', e);
      showFailureToast('View Create Failed');
      return false;
    }
  },

  async deleteActivityDirective(plan_id: number, id: ActivityDirectiveId): Promise<boolean> {
    try {
      const { confirm } = await showConfirmModal(
        'Delete',
        'Are you sure you want to delete this activity directive?',
        'Delete Activity Directive',
      );

      if (confirm) {
        await reqHasura(gql.DELETE_ACTIVITY_DIRECTIVE, { id, plan_id });
        activityDirectivesMap.update((currentActivityDirectivesMap: ActivityDirectivesMap) => {
          delete currentActivityDirectivesMap[id];
          return { ...currentActivityDirectivesMap };
        });
        showSuccessToast('Activity Directive Deleted Successfully');
        return true;
      }
    } catch (e) {
      catchError('Activity Directive Delete Failed', e);
      showFailureToast('Activity Directive Delete Failed');
      return false;
    }
  },

  async deleteActivityDirectives(plan_id: number, ids: ActivityDirectiveId[]): Promise<boolean> {
    try {
      const { confirm } = await showConfirmModal(
        'Delete',
        'Are you sure you want to delete the selected activity directives?',
        'Delete Activities',
      );

      if (confirm) {
        await reqHasura(gql.DELETE_ACTIVITY_DIRECTIVES, { ids, plan_id });
        activityDirectivesMap.update((currentActivityDirectivesMap: ActivityDirectivesMap) => {
          ids.forEach(id => delete currentActivityDirectivesMap[id]);
          return { ...currentActivityDirectivesMap };
        });
        showSuccessToast('Activity Directives Deleted Successfully');
        return true;
      }
    } catch (e) {
      catchError('Activity Directives Delete Failed', e);
      showFailureToast('Activity Directives Delete Failed');
      return false;
    }
  },

  async deleteCommandDictionary(id: number): Promise<void> {
    try {
      const { confirm } = await showConfirmModal(
        'Delete',
        'Are you sure you want to delete this dictionary?',
        'Delete Command Dictionary',
      );

      if (confirm) {
        await reqHasura(gql.DELETE_COMMAND_DICTIONARY, { id });
        showSuccessToast('Command Dictionary Deleted Successfully');
        commandDictionaries.filterValueById(id);
      }
    } catch (e) {
      catchError('Command Dictionary Delete Failed', e);
      showFailureToast('Command Dictionary Delete Failed');
    }
  },

  async deleteConstraint(id: number): Promise<boolean> {
    try {
      const { confirm } = await showConfirmModal(
        'Delete',
        'Are you sure you want to delete this constraint?',
        'Delete Constraint',
      );

      if (confirm) {
        await reqHasura(gql.DELETE_CONSTRAINT, { id });
        showSuccessToast('Constraint Deleted Successfully');
        return true;
      }
    } catch (e) {
      catchError('Constraint Delete Failed', e);
      showFailureToast('Constraint Delete Failed');
      return false;
    }
  },

  async deleteExpansionRule(id: number): Promise<boolean> {
    try {
      const { confirm } = await showConfirmModal(
        'Delete',
        'Are you sure you want to delete this expansion rule?',
        'Delete Expansion Rule',
      );

      if (confirm) {
        await reqHasura(gql.DELETE_EXPANSION_RULE, { id });
        showSuccessToast('Expansion Rule Deleted Successfully');
        return true;
      }

      return false;
    } catch (e) {
      catchError('Expansion Rule Delete Failed', e);
      showFailureToast('Expansion Rule Delete Failed');
      return false;
    }
  },

  async deleteExpansionSequence(sequence: ExpansionSequence): Promise<void> {
    try {
      const { confirm } = await showConfirmModal(
        'Delete',
        'Are you sure you want to delete this expansion sequence?',
        'Delete Expansion Sequence',
      );

      if (confirm) {
        const { seq_id: seqId, simulation_dataset_id: simulationDatasetId } = sequence;
        await reqHasura(gql.DELETE_EXPANSION_SEQUENCE, { seqId, simulationDatasetId });
        showSuccessToast('Expansion Sequence Deleted Successfully');
      }
    } catch (e) {
      catchError('Expansion Sequence Delete Failed', e);
      showFailureToast('Expansion Sequence Delete Failed');
    }
  },

  async deleteExpansionSequenceToActivity(
    simulation_dataset_id: number,
    simulated_activity_id: number,
  ): Promise<boolean> {
    try {
      await reqHasura<SeqId>(gql.DELETE_EXPANSION_SEQUENCE_TO_ACTIVITY, {
        simulated_activity_id,
        simulation_dataset_id,
      });
      showSuccessToast('Expansion Sequence Deleted From Activity Successfully');
      return true;
    } catch (e) {
      catchError('Delete Expansion Sequence From Activity Failed', e);
      showFailureToast('Delete Expansion Sequence From Activity Failed');
      return false;
    }
  },

  async deleteExpansionSet(id: number): Promise<boolean> {
    try {
      const { confirm } = await showConfirmModal(
        'Delete',
        'Are you sure you want to delete this expansion set?',
        'Delete Expansion Set',
      );

      if (confirm) {
        await reqHasura(gql.DELETE_EXPANSION_SET, { id });
        showSuccessToast('Expansion Set Deleted Successfully');
        return true;
      }

      return false;
    } catch (e) {
      catchError('Expansion Set Delete Failed', e);
      showFailureToast('Expansion Set Delete Failed');
      return false;
    }
  },

  async deleteFile(id: number): Promise<boolean> {
    try {
      await reqGateway(`/file/${id}`, 'DELETE', null, null, false);
      return true;
    } catch (e) {
      catchError(e);
      return false;
    }
  },

  async deleteModel(model: ModelSlim): Promise<void> {
    try {
      const { confirm } = await showConfirmModal(
        'Delete',
        'Are you sure you want to delete this model?',
        'Delete Model',
      );

      if (confirm) {
        const { id, jar_id } = model;
        await effects.deleteFile(jar_id);
        await reqHasura(gql.DELETE_MODEL, { id });
        showSuccessToast('Model Deleted Successfully');
        models.filterValueById(id);
      }
    } catch (e) {
      catchError('Model Delete Failed', e);
      showFailureToast('Model Delete Failed');
    }
  },

  async deletePlan(id: number): Promise<boolean> {
    try {
      const { confirm } = await showConfirmModal('Delete', 'Are you sure you want to delete this plan?', 'Delete Plan');

      if (confirm) {
        await reqHasura(gql.DELETE_PLAN, { id });
        showSuccessToast('Plan Deleted Successfully');
        return true;
      }

      return false;
    } catch (e) {
      catchError('Plan Delete Failed', e);
      showFailureToast('Plan Delete Failed');
      return false;
    }
  },

  async deleteSchedulingCondition(id: number): Promise<boolean> {
    try {
      const { confirm } = await showConfirmModal(
        'Delete',
        'Are you sure you want to delete this scheduling condition?',
        'Delete Scheduling Condition',
      );

      if (confirm) {
        await reqHasura(gql.DELETE_SCHEDULING_CONDITION, { id });
        showSuccessToast('Scheduling Condition Deleted Successfully');
        return true;
      } else {
        return false;
      }
    } catch (e) {
      catchError('Scheduling Condition Delete Failed', e);
      showFailureToast('Scheduling Condition Delete Failed');
      return false;
    }
  },

  async deleteSchedulingGoal(id: number): Promise<boolean> {
    try {
      const { confirm } = await showConfirmModal(
        'Delete',
        'Are you sure you want to delete this scheduling goal?',
        'Delete Scheduling Goal',
      );

      if (confirm) {
        await reqHasura(gql.DELETE_SCHEDULING_GOAL, { id });
        showSuccessToast('Scheduling Goal Deleted Successfully');
        return true;
      } else {
        return false;
      }
    } catch (e) {
      catchError('Scheduling Goal Delete Failed', e);
      showFailureToast('Scheduling Goal Delete Failed');
      return false;
    }
  },

  async deleteSchedulingSpecGoal(goal_id: number, specification_id: number): Promise<boolean> {
    try {
      await reqHasura(gql.DELETE_SCHEDULING_SPEC_GOAL, { goal_id, specification_id });
      return true;
    } catch (e) {
      catchError('Scheduling Goal Spec Delete Failed', e);
      showFailureToast('Scheduling Goal Delete Failed');
      return false;
    }
  },

  async deleteUserSequence(id: number): Promise<boolean> {
    try {
      const { confirm } = await showConfirmModal(
        'Delete',
        'Are you sure you want to delete this user sequence?',
        'Delete User Sequence',
      );

      if (confirm) {
        await reqHasura(gql.DELETE_USER_SEQUENCE, { id });
        showSuccessToast('User Sequence Deleted Successfully');
        return true;
      }

      return false;
    } catch (e) {
      catchError('User Sequence Delete Failed', e);
      showFailureToast('User Sequence Delete Failed');
      return false;
    }
  },

  async deleteView(id: number): Promise<boolean> {
    try {
      const { confirm } = await showConfirmModal('Delete', 'Are you sure you want to delete this view?', 'Delete View');

      if (confirm) {
        await reqHasura(gql.DELETE_VIEW, { id });
        return true;
      }
    } catch (e) {
      catchError(e);
      return false;
    }
  },

  async deleteViews(ids: number[]): Promise<boolean> {
    try {
      const { confirm } = await showConfirmModal(
        'Delete',
        'Are you sure you want to delete the selected views?',
        'Delete Views',
      );

      if (confirm) {
        await reqHasura(gql.DELETE_VIEWS, { ids });
        return true;
      }
    } catch (e) {
      catchError(e);
      return false;
    }
  },

  async editView(owner: string, definition: ViewDefinition): Promise<boolean> {
    try {
      const { confirm, value = null } = await showEditViewModal();
      if (confirm && value) {
        const { id, name } = value;
        const viewUpdateInput: ViewInsertInput = { definition, name, owner };
        const data = await reqHasura<View>(gql.UPDATE_VIEW, { id, view: viewUpdateInput });
        const {
          updatedView: { name: updatedName, updated_at },
        } = data;

        applyViewUpdate({ name: updatedName, updated_at });
        showSuccessToast('View Edited Successfully');
        return true;
      }
    } catch (e) {
      catchError('View Edit Failed', e);
      showFailureToast('View Edit Failed');
      return false;
    }
  },

  async expand(expansionSetId: number, simulationDatasetId: number): Promise<void> {
    try {
      planExpansionStatus.set(Status.Incomplete);
      await reqHasura(gql.EXPAND, { expansionSetId, simulationDatasetId });
      planExpansionStatus.set(Status.Complete);
      showSuccessToast('Plan Expanded Successfully');
    } catch (e) {
      catchError('Plan Expansion Failed', e);
      planExpansionStatus.set(Status.Failed);
      showFailureToast('Plan Expansion Failed');
    }
  },

  async getActivityTypes(modelId: number): Promise<ActivityType[]> {
    try {
      const query = convertToQuery(gql.SUB_ACTIVITY_TYPES);
      const data = await reqHasura<ActivityType[]>(query, { modelId });
      const { activity_type: activityTypes } = data;
      return activityTypes;
    } catch (e) {
      catchError(e);
      return [];
    }
  },

  async getActivityTypesExpansionRules(modelId: number | null | undefined): Promise<ActivityTypeExpansionRules[]> {
    if (modelId !== null && modelId !== undefined) {
      try {
        const data = await reqHasura<ActivityTypeExpansionRules[]>(gql.GET_ACTIVITY_TYPES_EXPANSION_RULES, { modelId });
        const { activity_types } = data;
        return activity_types;
      } catch (e) {
        catchError(e);
        return [];
      }
    } else {
      return [];
    }
  },

  async getConstraint(id: number): Promise<Constraint | null> {
    try {
      const data = await reqHasura<Constraint>(gql.GET_CONSTRAINT, { id });
      const { constraint } = data;
      return constraint;
    } catch (e) {
      catchError(e);
      return null;
    }
  },

  async getEffectiveActivityArguments(
    modelId: number,
    activityTypeName: string,
    argumentsMap: ArgumentsMap,
  ): Promise<EffectiveArguments | null> {
    try {
      const data = await reqHasura<EffectiveArguments>(gql.GET_EFFECTIVE_ACTIVITY_ARGUMENTS, {
        activityTypeName,
        arguments: argumentsMap,
        modelId,
      });
      const { effectiveActivityArguments } = data;
      return effectiveActivityArguments;
    } catch (e) {
      catchError(e);
      return null;
    }
  },

  async getEffectiveModelArguments(modelId: number, argumentsMap: ArgumentsMap): Promise<EffectiveArguments | null> {
    try {
      const data = await reqHasura<EffectiveArguments>(gql.GET_EFFECTIVE_MODEL_ARGUMENTS, {
        arguments: argumentsMap,
        modelId,
      });
      const { effectiveModelArguments } = data;
      return effectiveModelArguments;
    } catch (e) {
      catchError(e);
      return null;
    }
  },

  async getExpansionRule(id: number): Promise<ExpansionRule> {
    try {
      const data = await reqHasura(gql.GET_EXPANSION_RULE, { id });
      const { expansionRule } = data;
      return expansionRule;
    } catch (e) {
      catchError(e);
      return null;
    }
  },

  async getExpansionSequenceId(simulated_activity_id: number, simulation_dataset_id: number): Promise<string | null> {
    try {
      const data = await reqHasura<SeqId>(gql.GET_EXPANSION_SEQUENCE_ID, {
        simulated_activity_id,
        simulation_dataset_id,
      });
      const { expansionSequence } = data;

      if (expansionSequence) {
        const { seq_id } = expansionSequence;
        return seq_id;
      } else {
        return null;
      }
    } catch (e) {
      catchError(e);
      return null;
    }
  },

  async getExpansionSequenceSeqJson(seqId: string, simulationDatasetId: number): Promise<string> {
    try {
      const data = await reqHasura<GetSeqJsonResponse>(gql.GET_EXPANSION_SEQUENCE_SEQ_JSON, {
        seqId,
        simulationDatasetId,
      });
      const { getSequenceSeqJson } = data;
      const { errors, seqJson, status } = getSequenceSeqJson;

      if (status === 'FAILURE') {
        const [firstError] = errors;
        const { message } = firstError;
        return message;
      } else {
        return JSON.stringify(seqJson, null, 2);
      }
    } catch (e) {
      catchError(e);
      return null;
    }
  },

  async getModels(): Promise<ModelSlim[]> {
    try {
      const data = await reqHasura<ModelSlim[]>(gql.GET_MODELS);
      const { models = [] } = data;
      return models;
    } catch (e) {
      catchError(e);
      return [];
    }
  },

  async getPlan(id: number): Promise<Plan | null> {
    try {
      const data = await reqHasura<PlanSchema>(gql.GET_PLAN, { id });
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
      catchError(e);
      return null;
    }
  },

  async getPlanMergeConflictingActivities(merge_request_id: number): Promise<PlanMergeConflictingActivity[]> {
    try {
      const query = convertToQuery(gql.SUB_PLAN_MERGE_CONFLICTING_ACTIVITIES);
      const data = await reqHasura<PlanMergeConflictingActivity[]>(query, { merge_request_id });
      const { conflictingActivities } = data;
      return conflictingActivities;
    } catch (e) {
      catchError(e);
      return [];
    }
  },

  async getPlanMergeNonConflictingActivities(merge_request_id: number): Promise<PlanMergeNonConflictingActivity[]> {
    try {
      const data = await reqHasura<PlanMergeNonConflictingActivity[]>(gql.GET_PLAN_MERGE_NON_CONFLICTING_ACTIVITIES, {
        merge_request_id,
      });
      const { nonConflictingActivities } = data;
      return nonConflictingActivities;
    } catch (e) {
      catchError(e);
      return [];
    }
  },

  async getPlanMergeRequestInProgress(planId: number): Promise<PlanMergeRequestSchema | null> {
    try {
      const query = convertToQuery(gql.SUB_PLAN_MERGE_REQUEST_IN_PROGRESS);
      const data = await reqHasura<PlanMergeRequestSchema[]>(query, { planId });
      const { merge_requests } = data;
      const [merge_request] = merge_requests; // Query uses 'limit: 1' so merge_requests.length === 1.
      return merge_request;
    } catch (e) {
      catchError(e);
      return null;
    }
  },

  async getPlanRevision(planId: number): Promise<number | null> {
    try {
      const query = convertToQuery(gql.SUB_PLAN_REVISION);
      const data = await reqHasura<Pick<Plan, 'revision'>>(query, { planId });
      const { plan } = data;
      const { revision } = plan;
      return revision;
    } catch (e) {
      catchError(e);
      return null;
    }
  },

  async getPlansAndModels(): Promise<{ models: ModelSlim[]; plans: PlanSlim[] }> {
    try {
      const data = (await reqHasura(gql.GET_PLANS_AND_MODELS)) as {
        models: ModelSlim[];
        plans: Pick<Plan, 'duration' | 'id' | 'model_id' | 'name' | 'revision' | 'start_time'>[];
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
      catchError(e);
      return { models: [], plans: [] };
    }
  },

  async getPlansAndModelsForScheduling(): Promise<{
    models: ModelSlim[];
    plans: PlanSchedulingSpec[];
  }> {
    try {
      const data = (await reqHasura(gql.GET_PLANS_AND_MODELS_FOR_SCHEDULING)) as {
        models: ModelSlim[];
        plans: PlanSchedulingSpec[];
      };

      const { models, plans } = data;
      return { models, plans };
    } catch (e) {
      catchError(e);
      return { models: [], plans: [] };
    }
  },

  async getResourceTypes(missionModelId: number): Promise<ResourceType[]> {
    try {
      const data = await reqHasura<ResourceType[]>(gql.GET_RESOURCE_TYPES, { missionModelId });
      const { resourceTypes } = data;
      return resourceTypes;
    } catch (e) {
      catchError(e);
      return [];
    }
  },

  async getResources(datasetId: number, planStartTime: string, planDuration: string): Promise<Resource[]> {
    try {
      const data = await reqHasura<Profile[]>(gql.GET_PROFILES, { datasetId });
      const { profile: profiles } = data;
      return sampleProfiles(profiles, planStartTime, planDuration);
    } catch (e) {
      catchError(e);
      return [];
    }
  },

  async getResourcesExternal(planId: number, planStartTime: string, planDuration: string): Promise<Resource[]> {
    try {
      const data = await reqHasura<PlanDataset[]>(gql.GET_PROFILES_EXTERNAL, { planId });
      const { plan_dataset: plan_datasets } = data;
      let resources: Resource[] = [];

      for (const dataset of plan_datasets) {
        const {
          dataset: { profiles },
          offset_from_plan_start,
        } = dataset;
        const sampledResources: Resource[] = sampleProfiles(
          profiles,
          planStartTime,
          planDuration,
          offset_from_plan_start,
        );
        resources = [...resources, ...sampledResources];
      }

      return resources;
    } catch (e) {
      catchError(e);
      return [];
    }
  },

  async getSchedulingCondition(id: number | null | undefined): Promise<SchedulingCondition | null> {
    if (id !== null && id !== undefined) {
      try {
        const data = await reqHasura<SchedulingCondition>(gql.GET_SCHEDULING_CONDITION, { id });
        const { condition } = data;
        return condition;
      } catch (e) {
        catchError(e);
        return null;
      }
    } else {
      return null;
    }
  },

  async getSchedulingGoal(id: number | null | undefined): Promise<SchedulingGoal | null> {
    if (id !== null && id !== undefined) {
      try {
        const data = await reqHasura<SchedulingGoal>(gql.GET_SCHEDULING_GOAL, { id });
        const { goal } = data;
        return goal;
      } catch (e) {
        catchError(e);
        return null;
      }
    } else {
      return null;
    }
  },

  async getSchedulingSpecConditionsForCondition(
    condition_id: number | null,
  ): Promise<SchedulingSpecCondition[] | null> {
    if (condition_id !== null) {
      try {
        const data = await reqHasura<SchedulingSpecCondition[]>(gql.GET_SCHEDULING_SPEC_CONDITIONS_FOR_CONDITION, {
          condition_id,
        });
        const { scheduling_specification_conditions } = data;
        return scheduling_specification_conditions;
      } catch (e) {
        catchError(e);
        return null;
      }
    } else {
      return null;
    }
  },

  async getSchedulingSpecGoalsForGoal(goal_id: number | null): Promise<SchedulingSpecGoal[] | null> {
    if (goal_id !== null) {
      try {
        const data = await reqHasura<SchedulingSpecGoal[]>(gql.GET_SCHEDULING_SPEC_GOALS_FOR_GOAL, { goal_id });
        const { scheduling_specification_goals } = data;
        return scheduling_specification_goals;
      } catch (e) {
        catchError(e);
        return null;
      }
    } else {
      return null;
    }
  },

  async getSpans(datasetId: number): Promise<Span[]> {
    try {
      const data = await reqHasura<Span[]>(gql.GET_SPANS, { datasetId });
      const { span: spans } = data;
      return spans;
    } catch (e) {
      catchError(e);
      return [];
    }
  },

  async getTsFilesActivityType(
    activityTypeName: string | null | undefined,
    modelId: number | null | undefined,
  ): Promise<TypeScriptFile[]> {
    if (activityTypeName !== null && activityTypeName !== undefined && modelId !== null && modelId !== undefined) {
      try {
        const data = await reqHasura<DslTypeScriptResponse>(gql.GET_TYPESCRIPT_ACTIVITY_TYPE, {
          activityTypeName,
          modelId,
        });
        const { dslTypeScriptResponse } = data;
        const { reason, status, typescriptFiles } = dslTypeScriptResponse;

        if (status === 'success') {
          return typescriptFiles;
        } else {
          catchError(reason);
          return [];
        }
      } catch (e) {
        catchError(e);
        return [];
      }
    } else {
      return [];
    }
  },

  async getTsFilesCommandDictionary(commandDictionaryId: number | null | undefined): Promise<TypeScriptFile[]> {
    if (commandDictionaryId !== null && commandDictionaryId !== undefined) {
      try {
        const data = await reqHasura<DslTypeScriptResponse>(gql.GET_TYPESCRIPT_COMMAND_DICTIONARY, {
          commandDictionaryId,
        });
        const { dslTypeScriptResponse } = data;
        const { reason, status, typescriptFiles } = dslTypeScriptResponse;

        if (status === 'success') {
          return typescriptFiles;
        } else {
          catchError(reason);
          return [];
        }
      } catch (e) {
        catchError(e);
        return [];
      }
    } else {
      return [];
    }
  },

  async getTsFilesConstraints(model_id: number, plan_id: number | null): Promise<TypeScriptFile[]> {
    if (model_id !== null && model_id !== undefined) {
      try {
        const data = await reqHasura<DslTypeScriptResponse>(gql.GET_TYPESCRIPT_CONSTRAINTS, { model_id, plan_id });
        const { dslTypeScriptResponse } = data;
        const { reason, status, typescriptFiles } = dslTypeScriptResponse;

        if (status === 'success') {
          return typescriptFiles;
        } else {
          catchError(reason);
          return [];
        }
      } catch (e) {
        catchError(e);
        return [];
      }
    } else {
      return [];
    }
  },

  async getTsFilesScheduling(model_id: number | null | undefined): Promise<TypeScriptFile[]> {
    if (model_id !== null && model_id !== undefined) {
      try {
        const data = await reqHasura<DslTypeScriptResponse>(gql.GET_TYPESCRIPT_SCHEDULING, { model_id });
        const { dslTypeScriptResponse } = data;
        const { reason, status, typescriptFiles } = dslTypeScriptResponse;

        if (status === 'success') {
          return typescriptFiles;
        } else {
          catchError(reason);
          return [];
        }
      } catch (e) {
        catchError(e);
        return [];
      }
    } else {
      return [];
    }
  },

  async getUserSequence(id: number): Promise<UserSequence | null> {
    try {
      const data = await reqHasura<UserSequence>(gql.GET_USER_SEQUENCE, { id });
      const { userSequence } = data;
      return userSequence;
    } catch (e) {
      catchError(e);
      return null;
    }
  },

  async getUserSequenceFromSeqJson(seqJson: SeqJson): Promise<string> {
    try {
      const data = await reqHasura<string>(gql.GET_USER_SEQUENCE_FROM_SEQ_JSON, { seqJson });
      const { sequence } = data;
      return sequence;
    } catch (e) {
      return e.message;
    }
  },

  async getUserSequenceSeqJson(
    commandDictionaryId: number | null,
    sequenceDefinition: string | null,
    signal: AbortSignal = undefined,
  ): Promise<string> {
    try {
      const data = await reqHasura<GetSeqJsonResponse>(
        gql.GET_USER_SEQUENCE_SEQ_JSON,
        { commandDictionaryId, sequenceDefinition },
        signal,
      );
      const { getUserSequenceSeqJson } = data;
      const { errors, seqJson, status } = getUserSequenceSeqJson;

      if (status === 'FAILURE') {
        const [firstError] = errors;
        const { message } = firstError;
        return message;
      } else {
        return JSON.stringify(seqJson, null, 2);
      }
    } catch (e) {
      return e.message;
    }
  },

  async getView(
    query: URLSearchParams | null,
    activityTypes: ActivityType[] = [],
    resourceTypes: ResourceType[] = [],
  ): Promise<View | null> {
    try {
      if (query !== null) {
        const viewId = query.has('viewId') ? query.get('viewId') : null;
        const viewIdAsNumber = parseFloatOrNull(viewId);

        if (viewIdAsNumber !== null) {
          const data = await reqHasura<View>(gql.GET_VIEW, { id: viewIdAsNumber });
          const { view } = data;

          if (view !== null) {
            return view;
          }
        }
      }

      return generateDefaultView(activityTypes, resourceTypes);
    } catch (e) {
      catchError(e);
      return null;
    }
  },

  async initialSimulationUpdate(
    plan_id: number,
    simulation_template_id: number | null = null,
    simulation_start_time: string | null = null,
    simulation_end_time: string | null = null,
  ): Promise<boolean> {
    try {
      const simulationInput: SimulationInitialUpdateInput = {
        arguments: {} as ArgumentsMap,
        simulation_end_time,
        simulation_start_time,
        simulation_template_id,
      };
      await reqHasura(gql.INITIAL_SIMULATION_UPDATE, { plan_id: plan_id, simulation: simulationInput });
      return true;
    } catch (e) {
      catchError(e);
      return false;
    }
  },

  async insertExpansionSequenceToActivity(
    simulation_dataset_id: number,
    simulated_activity_id: number,
    seq_id: string,
  ): Promise<string | null> {
    try {
      const input: ExpansionSequenceToActivityInsertInput = { seq_id, simulated_activity_id, simulation_dataset_id };
      const data = await reqHasura<{ seq_id: string }>(gql.INSERT_EXPANSION_SEQUENCE_TO_ACTIVITY, { input });
      const { sequence } = data;

      if (sequence) {
        showSuccessToast('Expansion Sequence Added To Activity Successfully');
        const { seq_id } = sequence;
        return seq_id;
      } else {
        return null;
      }
    } catch (e) {
      catchError('Add Expansion Sequence To Activity Failed', e);
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
      catchError(e);
    }
  },

  async login(username: string, password: string): Promise<ReqLoginResponse> {
    try {
      const data = await reqGateway<ReqLoginResponse>(
        '/auth/login',
        'POST',
        JSON.stringify({ password, username }),
        null,
        false,
      );
      return data;
    } catch (e) {
      catchError(e);
      return {
        message: 'An unexpected error occurred',
        ssoToken: null,
        success: false,
        username: null,
      };
    }
  },

  async logout(ssoToken: string): Promise<ReqLogoutResponse> {
    try {
      const data = await reqGateway<ReqLogoutResponse>('/auth/logout', 'DELETE', null, ssoToken, false);
      return data;
    } catch (e) {
      catchError(e);
      return { message: 'An unexpected error occurred', success: false };
    }
  },

  async planMergeBegin(merge_request_id: number, reviewer_username: string): Promise<boolean> {
    try {
      await reqHasura(gql.PLAN_MERGE_BEGIN, { merge_request_id, reviewer_username });
      return true;
    } catch (error) {
      showFailureToast('Begin Merge Failed');
      catchError('Begin Merge Failed', error);
      return false;
    }
  },

  async planMergeCancel(merge_request_id: number): Promise<boolean> {
    try {
      await reqHasura(gql.PLAN_MERGE_CANCEL, { merge_request_id });
      showSuccessToast('Canceled Merge Request');
      return true;
    } catch (error) {
      catchError('Cancel Merge Request Failed', error);
      showFailureToast('Cancel Merge Request Failed');
      return false;
    }
  },

  async planMergeCommit(merge_request_id: number): Promise<boolean> {
    try {
      await reqHasura(gql.PLAN_MERGE_COMMIT, { merge_request_id });
      showSuccessToast('Approved Merge Request Changes');
      return true;
    } catch (error) {
      catchError('Approve Merge Request Changes Failed', error);
      showFailureToast('Approve Merge Request Changes Failed');
      return false;
    }
  },

  async planMergeDeny(merge_request_id: number): Promise<boolean> {
    try {
      await reqHasura(gql.PLAN_MERGE_DENY, { merge_request_id });
      showSuccessToast('Denied Merge Request Changes');
      return true;
    } catch (error) {
      catchError('Deny Merge Request Changes Failed', error);
      showFailureToast('Deny Merge Request Changes Failed');
      return false;
    }
  },

  async planMergeRequestWithdraw(merge_request_id: number): Promise<boolean> {
    try {
      await reqHasura(gql.PLAN_MERGE_REQUEST_WITHDRAW, { merge_request_id });
      showSuccessToast('Withdrew Merge Request');
      return true;
    } catch (error) {
      showFailureToast('Withdraw Merge Request Failed');
      catchError('Withdraw Merge Request Failed', error);
      return false;
    }
  },

  async planMergeResolveAllConflicts(merge_request_id: number, resolution: PlanMergeResolution): Promise<void> {
    try {
      await reqHasura(gql.PlAN_MERGE_RESOLVE_ALL_CONFLICTS, { merge_request_id, resolution });
    } catch (e) {
      showFailureToast('Resolve All Merge Request Conflicts Failed');
      catchError('Resolve All Merge Request Conflicts Failed', e);
    }
  },

  async planMergeResolveConflict(
    merge_request_id: number,
    activity_id: ActivityDirectiveId,
    resolution: PlanMergeResolution,
  ): Promise<void> {
    try {
      await reqHasura(gql.PLAN_MERGE_RESOLVE_CONFLICT, { activity_id, merge_request_id, resolution });
    } catch (e) {
      showFailureToast('Resolve Merge Request Conflict Failed');
      catchError('Resolve Merge Request Conflict Failed', e);
    }
  },

  async schedule(analysis_only: boolean = false): Promise<void> {
    try {
      const { id: planId } = get(plan);
      const specificationId = get(selectedSpecId);

      const plan_revision = await effects.getPlanRevision(planId);
      await effects.updateSchedulingSpec(specificationId, { analysis_only, plan_revision });

      let incomplete = true;
      schedulingStatus.set(Status.Incomplete);

      do {
        const data = await reqHasura<SchedulingResponse>(gql.SCHEDULE, { specificationId });
        const { schedule } = data;
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
      } while (incomplete);
    } catch (e) {
      catchError(e);
      schedulingStatus.set(Status.Failed);
    }
  },

  async session(ssoToken: string): Promise<ReqSessionResponse> {
    try {
      const data = await reqGateway<ReqSessionResponse>('/auth/session', 'GET', null, ssoToken, false);
      return data;
    } catch (e) {
      catchError(e);
      return { message: 'An unexpected error occurred', success: false };
    }
  },

  async simulate(): Promise<void> {
    try {
      const { id: planId } = get(plan);
      const data = await reqHasura<SimulateResponse>(gql.SIMULATE, { planId });
      const { simulate } = data;
      const { simulationDatasetId: newSimulationDatasetId } = simulate;
      simulationDatasetId.set(newSimulationDatasetId);
      simulationDatasetIds.updateValue((ids: number[]) => {
        if (!ids.includes(newSimulationDatasetId)) {
          return [newSimulationDatasetId, ...ids];
        }
        return ids;
      });
    } catch (e) {
      catchError(e);
    }
  },

  async updateActivityDirective(
    plan_id: number,
    id: ActivityDirectiveId,
    partialActivityDirective: Partial<ActivityDirective>,
  ): Promise<void> {
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

    if (partialActivityDirective.tags) {
      activityDirectiveSetInput.tags = formatHasuraStringArray(partialActivityDirective.tags);
    }

    if (partialActivityDirective.name) {
      activityDirectiveSetInput.name = partialActivityDirective.name;
    }

    if (partialActivityDirective.metadata) {
      activityDirectiveSetInput.metadata = partialActivityDirective.metadata;
    }

    try {
      const data = await reqHasura<ActivityDirective>(gql.UPDATE_ACTIVITY_DIRECTIVE, {
        activityDirectiveSetInput,
        id,
        plan_id,
      });
      const { update_activity_directive_by_pk: updatedDirective } = data;
      activityDirectivesMap.update((currentActivityDirectivesMap: ActivityDirectivesMap) => ({
        ...currentActivityDirectivesMap,
        [id]: updatedDirective,
      }));
      showSuccessToast('Activity Directive Updated Successfully');
    } catch (e) {
      catchError('Activity Directive Update Failed', e);
      showFailureToast('Activity Directive Update Failed');
    }
  },

  async updateConstraint(
    id: number,
    definition: string,
    description: string,
    model_id: number,
    name: string,
    plan_id: number,
    summary: string,
  ): Promise<void> {
    try {
      const constraint: Partial<Constraint> = {
        definition,
        description,
        model_id: plan_id !== null ? null : model_id,
        name,
        plan_id,
        summary,
      };
      await reqHasura(gql.UPDATE_CONSTRAINT, { constraint, id });
      showSuccessToast('Constraint Updated Successfully');
    } catch (e) {
      catchError('Constraint Update Failed', e);
      showFailureToast('Constraint Update Failed');
    }
  },

  async updateExpansionRule(id: number, rule: Partial<ExpansionRule>): Promise<string | null> {
    try {
      savingExpansionRule.set(true);
      const data = await reqHasura(gql.UPDATE_EXPANSION_RULE, { id, rule });
      const { updateExpansionRule } = data;
      const { updated_at } = updateExpansionRule;
      showSuccessToast('Expansion Rule Updated Successfully');
      savingExpansionRule.set(false);
      return updated_at;
    } catch (e) {
      catchError('Expansion Rule Update Failed', e);
      showFailureToast('Expansion Rule Update Failed');
      savingExpansionRule.set(false);
      return null;
    }
  },

  async updateSchedulingCondition(
    id: number,
    condition: Partial<SchedulingCondition>,
  ): Promise<Pick<SchedulingCondition, 'id' | 'last_modified_by' | 'modified_date'> | null> {
    try {
      const data = await reqHasura(gql.UPDATE_SCHEDULING_CONDITION, { condition, id });
      const { updateSchedulingCondition: updatedCondition } = data;

      showSuccessToast('Scheduling Condition Updated Successfully');
      return updatedCondition;
    } catch (e) {
      catchError('Scheduling Condition Update Failed', e);
      showFailureToast('Scheduling Condition Update Failed');
      return null;
    }
  },

  async updateSchedulingGoal(
    id: number,
    goal: Partial<SchedulingGoal>,
  ): Promise<Pick<SchedulingGoal, 'id' | 'last_modified_by' | 'modified_date'> | null> {
    try {
      const data = await reqHasura(gql.UPDATE_SCHEDULING_GOAL, { goal, id });
      const { updateSchedulingGoal: updatedGoal } = data;

      showSuccessToast('Scheduling Goal Updated Successfully');
      return updatedGoal;
    } catch (e) {
      catchError('Scheduling Goal Update Failed', e);
      showFailureToast('Scheduling Goal Update Failed');
      return null;
    }
  },

  async updateSchedulingSpec(id: number, spec: Partial<SchedulingSpec>): Promise<void> {
    try {
      await reqHasura(gql.UPDATE_SCHEDULING_SPEC, { id, spec });
    } catch (e) {
      catchError(e);
    }
  },

  async updateSchedulingSpecCondition(
    condition_id: number,
    specification_id: number,
    spec_condition: Partial<SchedulingSpecCondition>,
  ): Promise<void> {
    try {
      await reqHasura(gql.UPDATE_SCHEDULING_SPEC_CONDITION, { condition_id, spec_condition, specification_id });
      showSuccessToast('Scheduling Spec Condition Updated Successfully');
    } catch (e) {
      catchError('Scheduling Spec Condition Update Failed', e);
      showFailureToast('Scheduling Spec Condition Update Failed');
    }
  },

  async updateSchedulingSpecConditionId(
    condition_id: number,
    specification_id: number,
    new_specification_id: number,
  ): Promise<void> {
    try {
      await reqHasura(gql.UPDATE_SCHEDULING_SPEC_CONDITION_ID, {
        condition_id,
        new_specification_id,
        specification_id,
      });
      showSuccessToast('Scheduling Spec Condition Updated Successfully');
    } catch (e) {
      catchError('Scheduling Spec Condition Update Failed', e);
      showFailureToast('Scheduling Spec Condition Update Failed');
    }
  },

  async updateSchedulingSpecGoal(
    goal_id: number,
    specification_id: number,
    spec_goal: Partial<SchedulingSpecGoal>,
  ): Promise<void> {
    try {
      await reqHasura(gql.UPDATE_SCHEDULING_SPEC_GOAL, { goal_id, spec_goal, specification_id });
      showSuccessToast('Scheduling Spec Goal Updated Successfully');
    } catch (e) {
      catchError('Scheduling Spec Goal Update Failed', e);
      showFailureToast('Scheduling Spec Goal Update Failed');
    }
  },

  async updateSimulation(simulationSetInput: Simulation, newFiles: File[] = []): Promise<void> {
    try {
      await reqHasura<Pick<Simulation, 'id'>>(gql.UPDATE_SIMULATION, {
        id: simulationSetInput.id,
        simulation: {
          arguments: simulationSetInput.arguments,
          simulation_end_time: simulationSetInput?.simulation_end_time ?? null,
          simulation_start_time: simulationSetInput?.simulation_start_time ?? null,
          simulation_template_id: simulationSetInput?.template?.id ?? null,
        },
      });
      await effects.uploadFiles(newFiles);
      showSuccessToast('Simulation Updated Successfully');
    } catch (e) {
      catchError('Simulation Update Failed', e);
      showFailureToast('Simulation Update Failed');
    }
  },

  async updateUserSequence(id: number, sequence: Partial<UserSequence>): Promise<string | null> {
    try {
      const data = await reqHasura<Pick<UserSequence, 'id' | 'updated_at'>>(gql.UPDATE_USER_SEQUENCE, { id, sequence });
      const { updateUserSequence } = data;
      const { updated_at } = updateUserSequence;
      showSuccessToast('User Sequence Updated Successfully');
      return updated_at;
    } catch (e) {
      catchError('User Sequence Update Failed', e);
      showFailureToast('User Sequence Update Failed');
      return null;
    }
  },

  async updateView(id: number, view: Partial<View>): Promise<boolean> {
    try {
      await reqHasura<Pick<View, 'id'>>(gql.UPDATE_VIEW, { id, view });
      showSuccessToast('View Updated Successfully');
      return true;
    } catch (e) {
      catchError('View Update Failed', e);
      showFailureToast('View Update Failed');
      return false;
    }
  },

  async uploadFile(file: File): Promise<number | null> {
    try {
      const body = new FormData();
      body.append('file', file, file.name);
      const data = await reqGateway<{ id: number }>('/file', 'POST', body, null, true);
      const { id } = data;
      return id;
    } catch (e) {
      catchError(e);
      return null;
    }
  },

  async uploadFiles(files: File[]): Promise<boolean> {
    try {
      for (const file of files) {
        await effects.uploadFile(file);
      }
      return true;
    } catch (e) {
      catchError(e);
      return false;
    }
  },

  async uploadView(owner: string): Promise<boolean> {
    try {
      const { confirm, value = null } = await showUploadViewModal();
      if (confirm && value) {
        const { name, definition } = value;

        const viewInsertInput: ViewInsertInput = { definition, name, owner };
        const data = await reqHasura<View>(gql.CREATE_VIEW, { view: viewInsertInput });
        const { newView } = data;

        view.update(() => newView);
        setQueryParam('viewId', `${newView.id}`);
        return true;
      }
    } catch (e) {
      catchError('View Upload Failed', e);
      showFailureToast('View Upload Failed');
      return false;
    }
  },

  async validateActivityArguments(
    activityTypeName: string,
    modelId: number,
    argumentsMap: ArgumentsMap,
  ): Promise<ParameterValidationResponse> {
    try {
      const data = await reqHasura<ParameterValidationResponse>(gql.VALIDATE_ACTIVITY_ARGUMENTS, {
        activityTypeName,
        arguments: argumentsMap,
        modelId,
      });

      const { validateActivityArguments } = data;
      return validateActivityArguments;
    } catch (e) {
      catchError(e);
      const { message } = e;
      return { errors: [message], success: false };
    }
  },

  async validateViewJSON(unValidatedView: unknown): Promise<{ errors?: string[]; valid: boolean }> {
    try {
      const response = await fetch(`${base}/view/validate`, {
        body: JSON.stringify(unValidatedView),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const { errors = [], valid } = (await response.json()) as { errors?: ErrorObject[]; valid: boolean };
      return {
        errors: errors.map(({ message }) => message),
        valid,
      };
    } catch (e) {
      catchError(e);
      const { message } = e;
      return { errors: [message], valid: false };
    }
  },
};

export default effects;
