import { get } from 'svelte/store';
import { activitiesMap, selectedActivityId } from '../stores/activities';
import { checkConstraintsStatus, constraintViolationsMap } from '../stores/constraints';
import {
  createDictionaryError,
  creatingDictionary,
  creatingExpansionSequence,
  expandingPlan,
  savingExpansionRule,
  savingExpansionSet,
} from '../stores/expansion';
import { createModelError, createPlanError, creatingModel, creatingPlan, models, plan } from '../stores/plan';
import { schedulingStatus, selectedSpecId } from '../stores/scheduling';
import { commandDictionaries } from '../stores/sequencing';
import { simulationDatasetId, simulationDatasetIds } from '../stores/simulation';
import { view } from '../stores/views';
import { convertToQuery, formatHasuraStringArray, parseFloatOrNull, setQueryParam, sleep } from './generic';
import gql from './gql';
import { showConfirmModal, showCreateViewModal } from './modal';
import { reqGateway, reqHasura } from './requests';
import { Status } from './status';
import { getDoyTime, getDoyTimeFromDuration, getIntervalFromDoyRange } from './time';
import { showFailureToast, showSuccessToast } from './toast';

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
      console.log(e);
      checkConstraintsStatus.set(Status.Failed);
      showFailureToast('Check Constraints Failed');
    }
  },

  async createActivityDirective(
    argumentsMap: ArgumentsMap,
    start_time: string,
    type: string,
    name: string,
    tags: string[],
    metadata: ActivityMetadata,
  ): Promise<void> {
    try {
      const currentPlan = get<Plan>(plan);
      const start_offset = getIntervalFromDoyRange(currentPlan.start_time, start_time);
      const tagsString = formatHasuraStringArray(tags);
      const activityDirectiveInsertInput: ActivityDirectiveInsertInput = {
        arguments: argumentsMap,
        metadata,
        name,
        plan_id: currentPlan.id,
        start_offset,
        tags: tagsString,
        type,
      };
      const data = await reqHasura(gql.CREATE_ACTIVITY_DIRECTIVE, { activityDirectiveInsertInput });
      const { createActivityDirective } = data;
      const { id, name: newName } = createActivityDirective;

      const activity: Activity = {
        arguments: argumentsMap,
        attributes: null,
        child_ids: [],
        created_at: null,
        duration: null,
        id,
        last_modified_at: null,
        metadata,
        name: newName,
        parent_id: null,
        simulated_activity_id: null,
        simulation_dataset_id: null,
        source_scheduling_goal_id: null,
        start_time,
        tags,
        type,
        unfinished: false,
      };

      activitiesMap.updateValue((currentActivitiesMap: ActivitiesMap) => ({ ...currentActivitiesMap, [id]: activity }));
      selectedActivityId.set(id);

      showSuccessToast('Activity Directive Created Successfully');
    } catch (e) {
      console.log(e);
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
      console.log(e);
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
      console.log(e);
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
      console.log(e);
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
      console.log(e);
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
      console.log(e);
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
      const model: ModelList = { id, jar_id, name, version };

      showSuccessToast('Model Created Successfully');
      createModelError.set(null);
      creatingModel.set(false);
      models.updateValue((currentModels: ModelList[]) => [...currentModels, model]);
    } catch (e) {
      console.log(e);
      showFailureToast('Model Create Failed');
      createModelError.set(e.message);
      creatingModel.set(false);
    }
  },

  async createPlan(
    end_time: string,
    model_id: number,
    name: string,
    start_time: string,
    simulation_template_id: number | null,
  ): Promise<PlanList | null> {
    try {
      createPlanError.set(null);
      creatingPlan.set(true);

      const planInsertInput: PlanInsertInput = {
        duration: getIntervalFromDoyRange(start_time, end_time),
        model_id,
        name,
        start_time,
      };
      const data = await reqHasura(gql.CREATE_PLAN, { plan: planInsertInput });
      const { createPlan } = data;
      const { id, revision } = createPlan;

      await effects.createSimulation(id, simulation_template_id);
      await effects.createSchedulingSpec({
        analysis_only: false,
        horizon_end: end_time,
        horizon_start: start_time,
        plan_id: id,
        plan_revision: revision,
        simulation_arguments: {},
      });

      const plan: PlanList = {
        end_time,
        id,
        model_id,
        name,
        revision,
        start_time,
      };

      showSuccessToast('Plan Created Successfully');
      createPlanError.set(null);
      creatingPlan.set(false);

      return plan;
    } catch (e) {
      console.log(e);
      showFailureToast('Plan Create Failed');
      createPlanError.set(e.message);
      creatingPlan.set(false);

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
      console.log(e);
      showFailureToast('Scheduling Goal Create Failed');
      return null;
    }
  },

  async createSchedulingSpec(spec: SchedulingSpecInsertInput): Promise<void> {
    try {
      await reqHasura(gql.CREATE_SCHEDULING_SPEC, { spec });
    } catch (e) {
      console.log(e);
    }
  },

  async createSchedulingSpecGoal(spec_goal: SchedulingSpecGoalInsertInput): Promise<void> {
    try {
      await reqHasura(gql.CREATE_SCHEDULING_SPEC_GOAL, { spec_goal });
    } catch (e) {
      console.log(e);
    }
  },

  async createSimulation(
    plan_id: number,
    simulation_template_id: number | null = null,
    simulationArguments: ArgumentsMap = {},
  ): Promise<boolean> {
    try {
      const simulationInsertInput: SimulationInsertInput = {
        arguments: simulationArguments,
        plan_id,
        simulation_template_id,
      };
      await reqHasura(gql.CREATE_SIMULATION, { simulation: simulationInsertInput });
      return true;
    } catch (e) {
      console.log(e);
      return false;
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
      console.log(e);
      showFailureToast('User Sequence Create Failed');
      return null;
    }
  },

  async createView(owner: string, definition: ViewDefinition): Promise<void> {
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
      }
    } catch (e) {
      console.log(e);
      showFailureToast('View Create Failed');
    }
  },

  async deleteActivityDirective(id: number): Promise<boolean> {
    try {
      const { confirm } = await showConfirmModal(
        'Delete',
        'Are you sure you want to delete this activity directive?',
        'Delete Activity',
      );

      if (confirm) {
        await reqHasura(gql.DELETE_ACTIVITY_DIRECTIVE, { id });
        activitiesMap.updateValue((currentActivitiesMap: ActivitiesMap) => {
          delete currentActivitiesMap[id];
          return { ...currentActivitiesMap };
        });
        showSuccessToast('Activity Directive Deleted Successfully');
        return true;
      }
    } catch (e) {
      console.log(e);
      showFailureToast('Activity Directive Delete Failed');
      return false;
    }
  },

  async deleteActivityDirectives(ids: number[]): Promise<boolean> {
    try {
      const { confirm } = await showConfirmModal(
        'Delete',
        'Are you sure you want to delete the selected activity directives?',
        'Delete Activities',
      );

      if (confirm) {
        await reqHasura(gql.DELETE_ACTIVITY_DIRECTIVES, { ids });
        activitiesMap.updateValue((currentActivitiesMap: ActivitiesMap) => {
          ids.forEach(id => {
            delete currentActivitiesMap[id];
          });
          return { ...currentActivitiesMap };
        });
        showSuccessToast('Activity Directives Deleted Successfully');
        return true;
      }
    } catch (e) {
      console.log(e);
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
      console.log(e);
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
      console.log(e);
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
      console.log(e);
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
      console.log(e);
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
      console.log(e);
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
      console.log(e);
      showFailureToast('Expansion Set Delete Failed');
      return false;
    }
  },

  async deleteFile(id: number): Promise<boolean> {
    try {
      await reqGateway(`/file/${id}`, 'DELETE', null, null, false);
      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  },

  async deleteModel(model: ModelList): Promise<void> {
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
      console.log(e);
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
      console.log(e);
      showFailureToast('Plan Delete Failed');
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
      console.log(e);
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
      console.log(e);
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
      console.log(e);
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
      console.log(e);
      return false;
    }
  },

  async expand(expansionSetId: number, simulationDatasetId: number): Promise<void> {
    try {
      expandingPlan.set(true);
      await reqHasura(gql.EXPAND, { expansionSetId, simulationDatasetId });
      showSuccessToast('Plan Expanded Successfully');
      expandingPlan.set(false);
    } catch (e) {
      console.log(e);
      showFailureToast('Plan Expansion Failed');
      expandingPlan.set(false);
    }
  },

  async getActivityTypesExpansionRules(modelId: number | null | undefined): Promise<ActivityTypeExpansionRules[]> {
    if (modelId !== null && modelId !== undefined) {
      try {
        const data = await reqHasura<ActivityTypeExpansionRules[]>(gql.GET_ACTIVITY_TYPES_EXPANSION_RULES, { modelId });
        const { activity_types } = data;
        return activity_types;
      } catch (e) {
        console.log(e);
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
      console.log(e);
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
      console.log(e);
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
      console.log(e);
      return null;
    }
  },

  async getExpansionRule(id: number): Promise<ExpansionRule> {
    try {
      const data = await reqHasura(gql.GET_EXPANSION_RULE, { id });
      const { expansionRule } = data;
      return expansionRule;
    } catch (e) {
      console.log(e);
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
      console.log(e);
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
      console.log(e);
      return null;
    }
  },

  async getModels(): Promise<ModelList[]> {
    try {
      const data = await reqHasura(gql.GET_MODELS);
      const { models = [] } = data;
      return models;
    } catch (e) {
      console.log(e);
      return [];
    }
  },

  async getPlan(id: number): Promise<Plan | null> {
    try {
      const data = await reqHasura(gql.GET_PLAN, { id });
      const { plan } = data;

      if (plan) {
        return {
          ...plan,
          end_time: getDoyTimeFromDuration(plan.start_time, plan.duration),
          start_time: getDoyTime(new Date(plan.start_time)),
          start_time_ymd: plan.start_time,
        };
      } else {
        return null;
      }
    } catch (e) {
      console.log(e);
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
      console.log(e);
      return null;
    }
  },

  async getPlansAndModels(): Promise<{ models: ModelList[]; plans: PlanList[] }> {
    try {
      const data = await reqHasura(gql.GET_PLANS_AND_MODELS);
      const { models, plans } = data;

      return {
        models,
        plans: plans.map((plan: any) => {
          return {
            ...plan,
            end_time: getDoyTimeFromDuration(plan.start_time, plan.duration),
            start_time: getDoyTime(new Date(plan.start_time)),
          };
        }),
      };
    } catch (e) {
      console.log(e);
      return { models: [], plans: [] };
    }
  },

  async getSchedulingGoal(id: number | null | undefined): Promise<SchedulingGoal | null> {
    if (id !== null && id !== undefined) {
      try {
        const data = await reqHasura<SchedulingGoal>(gql.GET_SCHEDULING_GOAL, { id });
        const { goal } = data;
        return goal;
      } catch (e) {
        console.log(e);
        return null;
      }
    } else {
      return null;
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
          console.log(reason);
          return [];
        }
      } catch (e) {
        console.log(e);
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
          console.log(reason);
          return [];
        }
      } catch (e) {
        console.log(e);
        return [];
      }
    } else {
      return [];
    }
  },

  async getTsFilesConstraints(model_id: number): Promise<TypeScriptFile[]> {
    if (model_id !== null && model_id !== undefined) {
      try {
        const data = await reqHasura<DslTypeScriptResponse>(gql.GET_TYPESCRIPT_CONSTRAINTS, { model_id });
        const { dslTypeScriptResponse } = data;
        const { reason, status, typescriptFiles } = dslTypeScriptResponse;

        if (status === 'success') {
          return typescriptFiles;
        } else {
          console.log(reason);
          return [];
        }
      } catch (e) {
        console.log(e);
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
          console.log(reason);
          return [];
        }
      } catch (e) {
        console.log(e);
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
      console.log(e);
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

  async getView(owner: string, query: URLSearchParams | null): Promise<View | null> {
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

      const data = await reqHasura<View[]>(gql.GET_VIEWS_LATEST, { owner });
      const { views } = data;

      if (views.length) {
        return views[0];
      } else {
        return null;
      }
    } catch (e) {
      console.log(e);
      return null;
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
      console.log(e);
      showFailureToast('Add Expansion Sequence To Activity Failed');
      return null;
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
      console.log(e);
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
      console.log(e);
      return { message: 'An unexpected error occurred', success: false };
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
          console.log(reason);
          incomplete = false;
          showFailureToast(`Scheduling ${analysis_only ? 'Analysis ' : ''}Failed`);
        } else if (status === 'incomplete') {
          schedulingStatus.set(Status.Incomplete);
        }

        await sleep(500); // Sleep half-second before re-scheduling.
      } while (incomplete);
    } catch (e) {
      console.log(e);
      schedulingStatus.set(Status.Failed);
    }
  },

  async session(ssoToken: string): Promise<ReqSessionResponse> {
    try {
      const data = await reqGateway<ReqSessionResponse>('/auth/session', 'GET', null, ssoToken, false);
      return data;
    } catch (e) {
      console.log(e);
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
      console.log(e);
    }
  },

  async updateActivityDirective(id: number, activity: Partial<Activity>, doRequest: boolean = true): Promise<void> {
    if (doRequest) {
      const activityDirectiveSetInput: ActivityDirectiveSetInput = {};

      if (activity.arguments) {
        activityDirectiveSetInput.arguments = activity.arguments;
      }

      if (activity.start_time) {
        const planStartTime = get<Plan>(plan).start_time;
        activityDirectiveSetInput.start_offset = getIntervalFromDoyRange(planStartTime, activity.start_time);
      }

      if (activity.tags) {
        activityDirectiveSetInput.tags = formatHasuraStringArray(activity.tags);
      }

      if (activity.name) {
        activityDirectiveSetInput.name = activity.name;
      }

      if (activity.metadata) {
        activityDirectiveSetInput.metadata = activity.metadata;
      }

      try {
        await reqHasura(gql.UPDATE_ACTIVITY_DIRECTIVE, { activityDirectiveSetInput, id });
        showSuccessToast('Activity Directive Updated Successfully');
      } catch (e) {
        console.log(e);
        showFailureToast('Activity Directive Update Failed');
      }
    }

    activitiesMap.updateValue((currentActivitiesMap: ActivitiesMap) => ({
      ...currentActivitiesMap,
      [id]: {
        ...currentActivitiesMap[id],
        ...activity,
      },
    }));
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
      console.log(e);
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
      console.log(e);
      showFailureToast('Expansion Rule Update Failed');
      savingExpansionRule.set(false);
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
      console.log(e);
      showFailureToast('Scheduling Goal Update Failed');
      return null;
    }
  },

  async updateSchedulingSpec(id: number, spec: Partial<SchedulingSpec>): Promise<void> {
    try {
      await reqHasura(gql.UPDATE_SCHEDULING_SPEC, { id, spec });
    } catch (e) {
      console.log(e);
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
      console.log(e);
      showFailureToast('Scheduling Spec Goal Update Failed');
    }
  },

  async updateSimulation(simulationSetInput: Simulation, newFiles: File[] = []): Promise<void> {
    try {
      await reqHasura<Pick<Simulation, 'id'>>(gql.UPDATE_SIMULATION, {
        id: simulationSetInput.id,
        simulation: {
          arguments: simulationSetInput.arguments,
          simulation_template_id: simulationSetInput?.template?.id ?? null,
        },
      });
      await effects.uploadFiles(newFiles);
      showSuccessToast('Simulation Updated Successfully');
    } catch (e) {
      console.log(e);
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
      console.log(e);
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
      console.log(e);
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
      console.log(e);
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
      console.log(e);
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
      console.log(e);
      const { message } = e;
      return { errors: [message], success: false };
    }
  },
};

export default effects;
