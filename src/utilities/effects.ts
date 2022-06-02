import { isNil, keyBy } from 'lodash-es';
import { get } from 'svelte/store';
import { activitiesMap, selectedActivityId } from '../stores/activities';
import { modelConstraints, planConstraints, selectedConstraint, violations } from '../stores/constraints';
import {
  createDictionaryError,
  creatingDictionary,
  dictionaries,
  savingExpansionRule,
  savingExpansionSet,
} from '../stores/expansion';
import {
  createModelError,
  createPlanError,
  creatingModel,
  creatingPlan,
  models,
  plan,
  planStartTimeMs,
} from '../stores/plan';
import { resources } from '../stores/resources';
import { schedulingStatus, selectedGoalId, selectedSpecId } from '../stores/scheduling';
import { simulation, simulationStatus } from '../stores/simulation';
import { view } from '../stores/views';
import { toActivity } from './activities';
import { setQueryParam, sleep } from './generic';
import gql from './gql';
import { showConfirmModal } from './modal';
import { reqGateway, reqHasura } from './requests';
import { Status } from './status';
import { getDoyTime, getDoyTimeFromDuration, getIntervalFromDoyRange } from './time';
import { showFailureToast, showSuccessToast } from './toast';
import { offsetViolationWindows } from './violations';

/**
 * Functions that have side-effects (e.g. HTTP requests, toasts, popovers, store updates, etc.).
 */
const effects = {
  async createActivity(argumentsMap: ArgumentsMap, start_time: string, type: string): Promise<void> {
    try {
      const currentPlan = get<Plan>(plan);
      const start_offset = getIntervalFromDoyRange(currentPlan.start_time, start_time);
      const activityInsertInput: ActivityInsertInput = {
        arguments: argumentsMap,
        plan_id: currentPlan.id,
        start_offset,
        type,
      };
      const data = await reqHasura(gql.CREATE_ACTIVITY, { activity: activityInsertInput });
      const { createActivity } = data;
      const { id } = createActivity;
      const activity: Activity = {
        arguments: argumentsMap,
        children: [],
        duration: 0,
        id,
        parent: null,
        start_time,
        type,
      };

      activitiesMap.update(activities => ({ ...activities, [id]: activity }));
      selectedActivityId.set(id);
      simulationStatus.update(Status.Dirty);

      showSuccessToast('Activity Created Successfully');
    } catch (e) {
      console.log(e);
      showFailureToast('Activity Create Failed');
    }
  },

  async createCommandDictionary(files: FileList): Promise<void> {
    try {
      createDictionaryError.set(null);
      creatingDictionary.set(true);

      const file: File = files[0];
      const dictionary = await file.text();
      await reqHasura(gql.CREATE_COMMAND_DICTIONARY, { dictionary });

      showSuccessToast('Command Dictionary Created Successfully');
      createDictionaryError.set(null);
      creatingDictionary.set(false);
    } catch (e) {
      console.log(e);
      showFailureToast('Command Dictionary Create Failed');
      createDictionaryError.set(e.message);
      creatingDictionary.set(false);
    }
  },

  async createConstraint(
    constraintType: ConstraintType,
    definition: string,
    description: string,
    name: string,
    summary: string,
  ): Promise<void> {
    try {
      const { id: planId, model } = get(plan);
      const model_id = constraintType === 'model' ? model.id : null;
      const plan_id = constraintType === 'plan' ? planId : null;
      const constraintInsertInput: ConstraintInsertInput = {
        definition,
        description,
        model_id,
        name,
        plan_id,
        summary,
      };
      const data = await reqHasura(gql.CREATE_CONSTRAINT, { constraint: constraintInsertInput });
      const { createConstraint } = data;
      const { id } = createConstraint;
      const constraint: Constraint = { ...constraintInsertInput, id };

      if (constraintType === 'model') {
        modelConstraints.update(constraints => [...constraints, constraint]);
      } else if (constraintType === 'plan') {
        planConstraints.update(constraints => [...constraints, constraint]);
      }
      selectedConstraint.set(constraint);
      simulationStatus.update(Status.Dirty);
      showSuccessToast('Constraint Created Successfully');
    } catch (e) {
      console.log(e);
      showFailureToast('Constraint Creation Failed');
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

  async createSchedulingGoal(definition: string, description: string, name: string, userId: string): Promise<void> {
    try {
      const { model } = get(plan);
      const goalInsertInput: SchedulingGoalInsertInput = {
        author: userId,
        definition,
        description,
        last_modified_by: userId,
        model_id: model.id,
        name,
      };
      const data = await reqHasura<SchedulingGoal>(gql.CREATE_SCHEDULING_GOAL, { goal: goalInsertInput });
      const { createSchedulingGoal: newGoal } = data;

      const specId = get(selectedSpecId);
      const specGoalInsertInput: SchedulingSpecGoalInsertInput = {
        goal_id: newGoal.id,
        specification_id: specId,
      };
      await effects.createSchedulingSpecGoal(specGoalInsertInput);
      selectedGoalId.set(null);
      showSuccessToast('Scheduling Goal Created Successfully');
    } catch (e) {
      console.log(e);
      showFailureToast('Scheduling Goal Create Failed');
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

  async createSequence(seqId: string): Promise<string | null> {
    try {
      const { id: planId } = get(plan);
      let data = await reqHasura(gql.GET_SIMULATION_DATASET, { planId });
      const { simulation } = data;
      const [{ dataset }] = simulation;
      const { id: datasetId } = dataset;

      const sequence: Sequence = { metadata: {}, seq_id: seqId, simulation_dataset_id: datasetId };
      data = await reqHasura<Pick<Sequence, 'seq_id'>>(gql.CREATE_SEQUENCE, { sequence });
      const { createSequence } = data;
      const { seq_id } = createSequence;
      showSuccessToast('Sequence Created Successfully');

      return seq_id;
    } catch (e) {
      console.log(e);
      showFailureToast('Sequence Create Failed');
      return null;
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

  async createView(viewInput: View): Promise<void> {
    try {
      const data = await reqGateway<CreateViewResponse>(
        '/view',
        'POST',
        JSON.stringify({ view: viewInput }),
        null,
        false,
      );
      const { errors, message, success, view: newView } = data;

      if (success) {
        view.update(() => newView);
        setQueryParam('viewId', `${newView.id}`);
        showSuccessToast('View Created Successfully');
      } else {
        console.log(errors);
        console.log(message);
        showFailureToast('View Create Failed');
      }
    } catch (e) {
      console.log(e);
      showFailureToast('View Create Failed');
    }
  },

  async deleteActivity(id: number): Promise<void> {
    try {
      const confirm = await showConfirmModal(
        'Delete',
        'Are you sure you want to delete this activity?',
        'Delete Activity',
      );

      if (confirm) {
        await reqHasura(gql.DELETE_ACTIVITY, { id });
        activitiesMap.update(activities => {
          delete activities[id];
          return { ...activities };
        });
        simulationStatus.update(Status.Dirty);
        showSuccessToast('Activity Deleted Successfully');
      }
    } catch (e) {
      console.log(e);
      showFailureToast('Activity Delete Failed');
    }
  },

  async deleteCommandDictionary(id: number): Promise<void> {
    try {
      const confirm = await showConfirmModal(
        'Delete',
        'Are you sure you want to delete this dictionary?',
        'Delete Command Dictionary',
      );

      if (confirm) {
        await reqHasura(gql.DELETE_COMMAND_DICTIONARY, { id });
        showSuccessToast('Command Dictionary Deleted Successfully');
        dictionaries.filterValueById(id);
      }
    } catch (e) {
      console.log(e);
      showFailureToast('Command Dictionary Delete Failed');
    }
  },

  async deleteConstraint(id: number): Promise<void> {
    try {
      const confirm = await showConfirmModal(
        'Delete',
        'Are you sure you want to delete this constraint?',
        'Delete Constraint',
      );

      if (confirm) {
        await reqHasura(gql.DELETE_CONSTRAINT, { id });

        modelConstraints.update(constraints => constraints.filter(constraint => constraint.id !== id));
        planConstraints.update(constraints => constraints.filter(constraint => constraint.id !== id));

        const currentSelectedConstraint = get(selectedConstraint);
        if (currentSelectedConstraint && currentSelectedConstraint.id === id) {
          selectedConstraint.set(null);
        }

        simulationStatus.update(Status.Dirty);
        showSuccessToast('Constraint Deleted Successfully');
      }
    } catch (e) {
      console.log(e);
      showFailureToast('Constraint Delete Failed');
    }
  },

  async deleteExpansionRule(id: number): Promise<boolean> {
    try {
      const confirm = await showConfirmModal(
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

  async deleteExpansionSet(id: number): Promise<boolean> {
    try {
      const confirm = await showConfirmModal(
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
      const confirm = await showConfirmModal('Delete', 'Are you sure you want to delete this model?', 'Delete Model');

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
      const confirm = await showConfirmModal('Delete', 'Are you sure you want to delete this plan?', 'Delete Plan');

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

  async deleteSchedulingGoal(id: number): Promise<void> {
    try {
      const confirm = await showConfirmModal(
        'Delete',
        'Are you sure you want to delete this scheduling goal?',
        'Delete Scheduling Goal',
      );

      if (confirm) {
        await reqHasura(gql.DELETE_SCHEDULING_GOAL, { id });
        showSuccessToast('Scheduling Goal Deleted Successfully');
      }
    } catch (e) {
      console.log(e);
      showFailureToast('Scheduling Goal Delete Failed');
    }
  },

  async deleteSequence(sequence: Sequence): Promise<void> {
    try {
      const confirm = await showConfirmModal(
        'Delete',
        'Are you sure you want to delete this sequence?',
        'Delete Sequence',
      );

      if (confirm) {
        const { seq_id: seqId, simulation_dataset_id: datasetId } = sequence;
        await reqHasura(gql.DELETE_SEQUENCE, { datasetId, seqId });
        showSuccessToast('Sequence Deleted Successfully');
      }
    } catch (e) {
      console.log(e);
      showFailureToast('Sequence Delete Failed');
    }
  },

  async deleteView(id: number): Promise<DeleteViewResponse> {
    try {
      const confirm = await showConfirmModal('Delete', 'Are you sure you want to delete this view?', 'Delete View');

      if (confirm) {
        const data = await reqGateway<DeleteViewResponse>(`/view/${id}`, 'DELETE', null, null, false);
        return data;
      }

      return { message: 'Delete view canceled', nextView: null, success: false };
    } catch (e) {
      console.log(e);
      return { message: 'An unexpected error occurred', nextView: null, success: false };
    }
  },

  async expand(expansionSetId: number): Promise<boolean> {
    try {
      const { id: planId } = get(plan);
      let data = await reqHasura(gql.GET_SIMULATION_DATASET, { planId });
      const { simulation } = data;
      const [{ dataset }] = simulation;
      const { id: datasetId } = dataset;

      data = await reqHasura(gql.EXPAND, { datasetId, expansionSetId });
      const { expand } = data;
      console.log(expand);
      showSuccessToast('Plan Expanded Successfully');

      return true;
    } catch (e) {
      console.log(e);
      showFailureToast('Plan Expansion Failed');
      return false;
    }
  },

  async getActivitiesForPlan(planId: number): Promise<Activity[]> {
    try {
      const data = await reqHasura(gql.GET_ACTIVITIES_FOR_PLAN, { planId });
      const { activities = [], plan } = data;
      const start_time = new Date(plan.start_time);
      const newActivities = activities.map((activity: any) => toActivity(activity, start_time));

      return newActivities;
    } catch (e) {
      console.log(e);
      return [];
    }
  },

  async getActivityTypeScript(
    activityTypeName: string | null | undefined,
    modelId: number | null | undefined,
  ): Promise<string> {
    if (!isNil(activityTypeName) && !isNil(modelId)) {
      try {
        const data = await reqHasura(gql.GET_ACTIVITY_TYPESCRIPT, { activityTypeName, modelId });
        const { activity } = data;
        const { typescript } = activity;
        return typescript;
      } catch (e) {
        console.log(e);
        return '';
      }
    } else {
      return '';
    }
  },

  async getActivityTypesExpansionRules(modelId: number | null | undefined): Promise<ActivityTypeExpansionRules[]> {
    if (!isNil(modelId)) {
      try {
        const data = await reqHasura<ActivityTypeExpansionRules[]>(gql.GET_ACTIVITY_TYPES_EXPANSION_RULES, { modelId });
        const { activityTypes } = data;
        return activityTypes;
      } catch (e) {
        console.log(e);
        return [];
      }
    } else {
      return [];
    }
  },

  async getCommandTypeScript(commandDictionaryId: number | null | undefined): Promise<string> {
    if (!isNil(commandDictionaryId)) {
      try {
        const data = await reqHasura(gql.GET_COMMAND_TYPESCRIPT, { commandDictionaryId });
        const { command } = data;
        const { typescript } = command;
        return typescript;
      } catch (e) {
        console.log(e);
        return '';
      }
    } else {
      return '';
    }
  },

  async getConstraintsTsExtraLibs(model_id: number): Promise<TypeScriptExtraLib[]> {
    try {
      const data = await reqHasura<TypeScriptResponse>(gql.GET_CONSTRAINTS_TYPESCRIPT, { model_id });
      const { constraintsTypeScript } = data;
      const { reason, status, typescriptFiles: tsExtraLibs } = constraintsTypeScript;

      if (status === 'success') {
        return tsExtraLibs;
      } else {
        console.log(reason);
        return [];
      }
    } catch (e) {
      console.log(e);
      return [];
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
      const data = await reqHasura<Plan | null>(gql.GET_PLAN, { id });
      const { plan } = data;

      if (plan) {
        const start_time = new Date(plan.start_time);

        return {
          ...plan,
          activities: plan.activities.map((activity: any) => toActivity(activity, start_time)),
          end_time: getDoyTimeFromDuration(start_time, plan.duration),
          start_time: getDoyTime(start_time),
        };
      } else {
        return null;
      }
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  async getPlanRevision(id: number): Promise<number | null> {
    try {
      const data = await reqHasura<Pick<Plan, 'revision'>>(gql.GET_PLAN_REVISION, { id });
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
          const start_time = new Date(plan.start_time);
          return {
            ...plan,
            end_time: getDoyTimeFromDuration(start_time, plan.duration),
            start_time: getDoyTime(start_time),
          };
        }),
      };
    } catch (e) {
      console.log(e);
      return { models: [], plans: [] };
    }
  },

  async getSchedulingTsExtraLibs(model_id: number): Promise<TypeScriptExtraLib[]> {
    try {
      const data = await reqHasura<TypeScriptResponse>(gql.GET_SCHEDULING_TYPESCRIPT, { model_id });
      const { schedulingTypeScript } = data;
      const { reason, status, typescriptFiles: tsExtraLibs } = schedulingTypeScript;

      if (status === 'success') {
        return tsExtraLibs;
      } else {
        console.log(reason);
        return [];
      }
    } catch (e) {
      console.log(e);
      return [];
    }
  },

  async getView(query: URLSearchParams): Promise<View | null> {
    try {
      const viewId = query.has('viewId') ? query.get('viewId') : 'latest';
      const data = await reqGateway<{ view: View }>(`/view/${viewId}`, 'GET', null, null, false);
      const { view } = data;
      return view;
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  async getViews(): Promise<View[]> {
    try {
      const data = await reqGateway<View[]>('/views', 'GET', null, null, false);
      return data;
    } catch (e) {
      console.log(e);
      return [];
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

  async resourceTypes(modelId: number): Promise<ResourceType[]> {
    try {
      const data = await reqHasura<ResourceType[]>(gql.RESOURCE_TYPES, { modelId });
      const { resourceTypes } = data;
      return resourceTypes;
    } catch (e) {
      console.log(e);
      return [];
    }
  },

  async schedule(): Promise<void> {
    try {
      const { id: planId } = get(plan);
      const specificationId = get(selectedSpecId);

      const plan_revision = await effects.getPlanRevision(planId);
      await effects.updateSchedulingSpec(specificationId, { plan_revision });

      let tries = 0;
      schedulingStatus.set(Status.Executing);

      do {
        const data = await reqHasura<SchedulingResponse>(gql.SCHEDULE, { specificationId });
        const { schedule } = data;
        const { reason, status } = schedule;

        if (status === 'complete') {
          const newActivities = await effects.getActivitiesForPlan(planId);
          activitiesMap.set(keyBy(newActivities, 'id'));
          selectedActivityId.set(null);
          simulationStatus.update(Status.Dirty);
          schedulingStatus.set(Status.Complete);
          return;
        } else if (status === 'failed') {
          schedulingStatus.set(Status.Failed);
          console.log(reason);
          return;
        } else if (status === 'incomplete') {
          schedulingStatus.set(Status.Incomplete);
          console.log(reason);
        }

        await sleep();
        ++tries;
      } while (tries < 10); // Trying a max of 10 times.

      schedulingStatus.set(Status.Incomplete);
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
      const { id: planId, model } = get(plan);

      let tries = 0;
      simulationStatus.update(Status.Executing);

      do {
        const data = await reqHasura<SimulationResponse>(gql.SIMULATE, { planId });
        const { simulate } = data;
        const { results, status }: SimulationResponse = simulate;

        if (status === 'complete') {
          // Activities.
          const newActivitiesMap: ActivitiesMap = {};
          for (const [id, activity] of Object.entries(results.activities)) {
            newActivitiesMap[id] = {
              arguments: activity.arguments,
              children: activity.children,
              duration: activity.duration,
              id: parseFloat(id),
              parent: activity.parent,
              start_time: activity.startTimestamp,
              type: activity.type,
            };
          }
          activitiesMap.set(newActivitiesMap);

          // Resources.
          const resourceTypes: ResourceType[] = await effects.resourceTypes(model.id);
          const resourceTypesMap = resourceTypes.reduce((map: Record<string, ValueSchema>, { name, schema }) => {
            map[name] = schema;
            return map;
          }, {});
          const newResources: Resource[] = Object.entries(results.resources).map(([name, values]) => ({
            name,
            schema: resourceTypesMap[name],
            startTime: results.start,
            values,
          }));
          resources.set(newResources);

          // Constraint Violations.
          const newViolations: ConstraintViolation[] = Object.entries(results.constraints).flatMap(
            ([name, violations]) =>
              violations.map(violation => ({
                associations: violation.associations,
                constraint: { name },
                windows: violation.windows,
              })),
          );
          violations.set(offsetViolationWindows(newViolations, get<number>(planStartTimeMs)));

          simulationStatus.update(Status.Complete);
          return;
        } else if (status === 'failed') {
          simulationStatus.update(Status.Failed);
          return;
        } else if (status === 'incomplete') {
          simulationStatus.update(Status.Executing);
        } else if (status === 'pending') {
          simulationStatus.update(Status.Pending);
        }

        await sleep();
        ++tries;
      } while (tries < 10); // Trying a max of 10 times.

      simulationStatus.update(Status.Incomplete);
    } catch (e) {
      console.log(e);
      simulationStatus.update(Status.Failed);
    }
  },

  async updateActivity(id: number, activity: Partial<Activity>, doRequest: boolean = true): Promise<void> {
    if (doRequest) {
      const activitySetInput: ActivitySetInput = {};

      if (activity.arguments) {
        activitySetInput.arguments = activity.arguments;
      }

      if (activity.start_time) {
        const planStartTime = get<Plan>(plan).start_time;
        activitySetInput.start_offset = getIntervalFromDoyRange(planStartTime, activity.start_time);
      }

      try {
        await reqHasura(gql.UPDATE_ACTIVITY, { activity: activitySetInput, id });
        showSuccessToast('Activity Updated Successfully');
      } catch (e) {
        console.log(e);
        showFailureToast('Activity Update Failed');
      }
    }

    activitiesMap.update(activities => ({
      ...activities,
      [id]: {
        ...activities[id],
        ...activity,
      },
    }));

    simulationStatus.update(Status.Dirty);
  },

  async updateConstraint(
    constraintType: ConstraintType,
    id: number,
    definition: string,
    description: string,
    name: string,
    summary: string,
  ): Promise<void> {
    try {
      const constraint: Partial<Constraint> = { definition, description, name, summary };
      await reqHasura(gql.UPDATE_CONSTRAINT, { constraint, id });

      if (constraintType === 'model') {
        modelConstraints.update(constraints => {
          constraints = constraints.map(currentConstraint => {
            if (currentConstraint.id === id) {
              return { ...currentConstraint, ...constraint };
            }
            return currentConstraint;
          });
          return constraints;
        });
      } else if (constraintType === 'plan') {
        planConstraints.update(constraints => {
          constraints = constraints.map(currentConstraint => {
            if (currentConstraint.id === id) {
              return { ...currentConstraint, ...constraint };
            }
            return currentConstraint;
          });
          return constraints;
        });
      }

      simulationStatus.update(Status.Dirty);
      showSuccessToast('Constraint Updated Successfully');
    } catch (e) {
      console.log(e);
      showFailureToast('Constraint Update Failed');
    }
  },

  async updateExpansionRule(id: number, rule: Partial<ExpansionRule>): Promise<boolean> {
    try {
      savingExpansionRule.set(true);
      await reqHasura(gql.UPDATE_EXPANSION_RULE, { id, rule });
      showSuccessToast('Expansion Rule Updated Successfully');
      savingExpansionRule.set(false);
      return true;
    } catch (e) {
      console.log(e);
      showFailureToast('Expansion Rule Update Failed');
      savingExpansionRule.set(false);
      return false;
    }
  },

  async updateSchedulingGoal(id: number, goal: Partial<SchedulingGoal>): Promise<void> {
    try {
      await reqHasura(gql.UPDATE_SCHEDULING_GOAL, { goal, id });
      showSuccessToast('Scheduling Goal Updated Successfully');
    } catch (e) {
      console.log(e);
      showFailureToast('Scheduling Goal Update Failed');
    }
  },

  async updateSchedulingSpec(id: number, spec: Partial<SchedulingSpec>): Promise<void> {
    try {
      await reqHasura(gql.UPDATE_SCHEDULING_SPEC, { id, spec });
    } catch (e) {
      console.log(e);
    }
  },

  async updateSimulation(simulationSetInput: Simulation, newFiles: File[] = []): Promise<void> {
    try {
      const data = await reqHasura<Simulation>(gql.UPDATE_SIMULATION, {
        id: simulationSetInput.id,
        simulation: {
          arguments: simulationSetInput.arguments,
          simulation_template_id: simulationSetInput?.template?.id ?? null,
        },
      });
      const { updateSimulation: updatedSimulation } = data;
      simulation.set(updatedSimulation);
      await effects.uploadFiles(newFiles);
      simulationStatus.update(Status.Dirty);
      showSuccessToast('Simulation Updated Successfully');
    } catch (e) {
      console.log(e);
      showFailureToast('Simulation Update Failed');
    }
  },

  async updateView(view: View): Promise<void> {
    try {
      const data = await reqGateway<UpdateViewResponse>(
        `/view/${view.id}`,
        'PUT',
        JSON.stringify({ view }),
        null,
        false,
      );
      const { errors, message, success } = data;

      if (success) {
        showSuccessToast('View Updated Successfully');
      } else {
        console.log(errors);
        console.log(message);
        showFailureToast('View Update Failed');
      }
    } catch (e) {
      console.log(e);
      showFailureToast('View Update Failed');
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
