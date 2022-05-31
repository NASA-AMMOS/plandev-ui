import { isNil } from 'lodash-es';
import { get } from 'svelte/store';
import { activitiesMap, selectedActivityId } from '../stores/activities';
import { user as userStore } from '../stores/app';
import { savingExpansionRule, savingExpansionSet } from '../stores/expansion';
import { plan } from '../stores/plan';
import { simulationStatus } from '../stores/simulation';
import { view } from '../stores/views';
import { toActivity } from './activities';
import { gatewayUrl, hasuraUrl } from './app';
import { setQueryParam } from './generic';
import gql from './gql';
import { Status } from './status';
import { getDoyTime, getDoyTimeFromDuration, getIntervalFromDoyRange } from './time';
import { showFailureToast, showSuccessToast } from './toast';

/* Helpers. */

async function reqGateway<T = any>(
  url: string,
  method: string,
  body?: any,
  ssoToken?: string,
  includeContentType: boolean = true,
): Promise<T> {
  const user = get<User | null>(userStore);
  const GATEWAY_URL = gatewayUrl();

  const options: RequestInit = {
    body,
    headers: { 'x-auth-sso-token': user?.ssoToken ?? ssoToken ?? '' },
    method,
  };

  if (includeContentType) {
    options.headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${GATEWAY_URL}${url}`, options);
  if (!response.ok) throw new Error(response.statusText);
  const data = await response.json();

  return data;
}

async function reqHasura<T = any>(query: string, variables: QueryVariables = {}): Promise<Record<string, T>> {
  const user = get<User | null>(userStore);
  const HASURA_URL = hasuraUrl();

  const options: RequestInit = {
    body: JSON.stringify({ query, variables }),
    headers: {
      'Content-Type': 'application/json',
      'x-auth-sso-token': user.ssoToken ?? '',
    },
    method: 'POST',
  };

  const response: Response = await fetch(HASURA_URL, options);
  const json = await response.json();

  if (!response.ok) {
    console.log(response);
    console.log(json);
    throw new Error(response.statusText);
  }

  if (json.errors) {
    console.log(response);
    console.log(json);
    throw new Error(json.errors[0].message);
  }

  const { data } = json;
  return data;
}

/* Requests. */

const req = {
  async createActivity(argumentsMap: ArgumentsMap, startTime: string, type: string): Promise<void> {
    try {
      const currentPlan = get<Plan>(plan);
      const start_offset = getIntervalFromDoyRange(currentPlan.startTime, startTime);
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
        startTime,
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

  async createCommandDictionary(file: File) {
    try {
      const dictionary = await file.text();
      const data = await reqHasura(gql.CREATE_COMMAND_DICTIONARY, { dictionary });
      const { createCommandDictionary } = data;
      const { id } = createCommandDictionary;
      showSuccessToast('Command Dictionary Created Successfully');
      return id;
    } catch (e) {
      console.log(e);
      showFailureToast('Command Dictionary Create Failed');
      return null;
    }
  },

  async createConstraint(constraint: ConstraintInsertInput): Promise<number | null> {
    try {
      const data = await reqHasura(gql.CREATE_CONSTRAINT, { constraint });
      const { createConstraint } = data;
      const { id } = createConstraint;
      return id;
    } catch (e) {
      console.log(e);
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

  async createModel(name: string, version: string, file: File): Promise<ModelInput | null> {
    try {
      const jar_id = await req.uploadFile(file);
      const modelInsertInput: ModelInsertInput = {
        jar_id,
        mission: '',
        name,
        version,
      };
      const data = await reqHasura(gql.CREATE_MODEL, { model: modelInsertInput });
      const { createModel } = data;
      const { id } = createModel;
      const model: ModelInput = {
        id,
        jar_id,
        name,
        version,
      };
      showSuccessToast('Model Created Successfully');

      return model;
    } catch (e) {
      console.log(e);
      showFailureToast('Model Create Failed');
      return null;
    }
  },

  async createPlan(endTime: string, modelId: number, name: string, startTime: string): Promise<CreatePlan | null> {
    try {
      const planInput = {
        duration: getIntervalFromDoyRange(startTime, endTime),
        model_id: modelId,
        name,
        start_time: startTime,
      };
      const data = await reqHasura(gql.CREATE_PLAN, { plan: planInput });
      const { createPlan } = data;
      const { id, revision } = createPlan;
      const plan: CreatePlan = {
        endTime,
        id,
        modelId,
        name,
        revision,
        startTime,
      };

      return plan;
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  async createSchedulingGoal(goal: SchedulingGoalInsertInput): Promise<SchedulingGoal> {
    try {
      const data = await reqHasura<SchedulingGoal>(gql.CREATE_SCHEDULING_GOAL, { goal });
      const { createSchedulingGoal } = data;
      return createSchedulingGoal;
    } catch (e) {
      console.log(e);
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
      const data = await reqGateway<CreateViewResponse>('/view', 'POST', JSON.stringify({ view: viewInput }));
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
      await reqHasura(gql.DELETE_ACTIVITY, { id });
      activitiesMap.update(activities => {
        delete activities[id];
        return { ...activities };
      });
      simulationStatus.update(Status.Dirty);
      showSuccessToast('Activity Deleted Successfully');
    } catch (e) {
      console.log(e);
      showFailureToast('Activity Delete Failed');
    }
  },

  async deleteCommandDictionary(id: number): Promise<boolean> {
    try {
      await reqHasura(gql.DELETE_COMMAND_DICTIONARY, { id });
      showSuccessToast('Command Dictionary Deleted Successfully');
      return true;
    } catch (e) {
      console.log(e);
      showFailureToast('Command Dictionary Delete Failed');
      return false;
    }
  },

  async deleteConstraint(id: number): Promise<boolean> {
    try {
      await reqHasura(gql.DELETE_CONSTRAINT, { id });
      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  },

  async deleteExpansionRule(id: number): Promise<boolean> {
    try {
      await reqHasura(gql.DELETE_EXPANSION_RULE, { id });
      showSuccessToast('Expansion Rule Deleted Successfully');
      return true;
    } catch (e) {
      console.log(e);
      showFailureToast('Expansion Rule Delete Failed');
      return false;
    }
  },

  async deleteExpansionSet(id: number): Promise<boolean> {
    try {
      await reqHasura(gql.DELETE_EXPANSION_SET, { id });
      showSuccessToast('Expansion Set Deleted Successfully');
      return true;
    } catch (e) {
      console.log(e);
      showFailureToast('Expansion Set Delete Failed');
      return false;
    }
  },

  async deleteFile(id: number): Promise<boolean> {
    try {
      await reqGateway(`/file/${id}`, 'DELETE');
      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  },

  async deleteModel(id: number, jar_id: number): Promise<boolean> {
    try {
      await req.deleteFile(jar_id);
      await reqHasura(gql.DELETE_MODEL, { id });
      showSuccessToast('Model Deleted Successfully');
      return true;
    } catch (e) {
      console.log(e);
      showFailureToast('Model Delete Failed');
      return false;
    }
  },

  async deletePlan(id: number): Promise<boolean> {
    try {
      await reqHasura(gql.DELETE_PLAN, { id });
      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  },

  async deleteSchedulingGoal(id: number): Promise<boolean> {
    try {
      await reqHasura(gql.DELETE_SCHEDULING_GOAL, { id });
      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  },

  async deleteSequence(seqId: string, datasetId: number): Promise<boolean> {
    try {
      await reqHasura(gql.DELETE_SEQUENCE, { datasetId, seqId });
      showSuccessToast('Sequence Deleted Successfully');
      return true;
    } catch (e) {
      console.log(e);
      showFailureToast('Sequence Delete Failed');
      return false;
    }
  },

  async deleteView(id: number): Promise<DeleteViewResponse> {
    try {
      const data = await reqGateway<DeleteViewResponse>(`/view/${id}`, 'DELETE');
      return data;
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
      const startTime = new Date(plan.startTime);
      const newActivities = activities.map((activity: any) => toActivity(activity, startTime));

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

  async getModels(): Promise<ModelInput[]> {
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
        const startTime = new Date(plan.startTime);

        return {
          ...plan,
          activities: plan.activities.map((activity: any) => toActivity(activity, startTime)),
          endTime: getDoyTimeFromDuration(startTime, plan.duration),
          startTime: getDoyTime(startTime),
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

  async getPlansAndModels(): Promise<{
    models: CreatePlanModel[];
    plans: CreatePlan[];
  }> {
    try {
      const data = await reqHasura(gql.GET_PLANS_AND_MODELS);
      const { models, plans } = data;

      return {
        models,
        plans: plans.map((plan: any) => {
          const startTime = new Date(plan.startTime);
          return {
            ...plan,
            endTime: getDoyTimeFromDuration(startTime, plan.duration),
            startTime: getDoyTime(startTime),
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
      const data = await reqGateway<{ view: View }>(`/view/${viewId}`, 'GET');
      const { view } = data;
      return view;
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  async getViews(): Promise<View[]> {
    try {
      const data = await reqGateway<View[]>('/views', 'GET');
      return data;
    } catch (e) {
      console.log(e);
      return [];
    }
  },

  async login(username: string, password: string): Promise<ReqLoginResponse> {
    try {
      const data = await reqGateway<ReqLoginResponse>('/auth/login', 'POST', JSON.stringify({ password, username }));
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
      const data = await reqGateway<ReqLogoutResponse>('/auth/logout', 'DELETE', null, ssoToken);
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

  async schedule(specificationId: number): Promise<SchedulingResponse> {
    try {
      const data = await reqHasura<SchedulingResponse>(gql.SCHEDULE, { specificationId });
      const { schedule } = data;
      return schedule;
    } catch (e) {
      console.log(e);
      return { reason: e.message, status: 'failed' };
    }
  },

  async session(ssoToken: string): Promise<ReqSessionResponse> {
    try {
      const data = await reqGateway<ReqSessionResponse>('/auth/session', 'GET', null, ssoToken);
      return data;
    } catch (e) {
      console.log(e);
      return { message: 'An unexpected error occurred', success: false };
    }
  },

  async simulate(
    modelId: number,
    planId: number,
  ): Promise<{
    activitiesMap?: ActivitiesMap;
    constraintViolations?: ConstraintViolation[];
    resources?: Resource[];
    status: SimulationStatus;
  }> {
    try {
      const data = await reqHasura<SimulationResponse>(gql.SIMULATE, { planId });
      const { simulate } = data;
      const { results, status }: SimulationResponse = simulate;

      if (status === 'complete') {
        // Activities.
        const activitiesMap: ActivitiesMap = {};
        for (const [id, activity] of Object.entries(results.activities)) {
          activitiesMap[id] = {
            arguments: activity.arguments,
            children: activity.children,
            duration: activity.duration,
            id: parseFloat(id),
            parent: activity.parent,
            startTime: activity.startTimestamp,
            type: activity.type,
          };
        }

        // Resources.
        const resourceTypes: ResourceType[] = await req.resourceTypes(modelId);
        const resourceTypesMap = resourceTypes.reduce((map: Record<string, ValueSchema>, { name, schema }) => {
          map[name] = schema;
          return map;
        }, {});
        const resources: Resource[] = Object.entries(results.resources).map(([name, values]) => ({
          name,
          schema: resourceTypesMap[name],
          startTime: results.start,
          values,
        }));

        // Constraint Violations.
        const constraintViolations: ConstraintViolation[] = Object.entries(results.constraints).flatMap(
          ([name, violations]) =>
            violations.map(violation => ({
              associations: violation.associations,
              constraint: { name },
              windows: violation.windows,
            })),
        );

        return { activitiesMap, constraintViolations, resources, status };
      } else {
        return { status };
      }
    } catch (e) {
      console.log(e);
      return { status: 'failed' };
    }
  },

  async updateActivity(id: number, activity: Partial<Activity>, doRequest: boolean = true): Promise<void> {
    if (doRequest) {
      const activitySetInput: ActivitySetInput = {};

      if (activity.arguments) {
        activitySetInput.arguments = activity.arguments;
      }

      if (activity.startTime) {
        const planStartTime = get<Plan>(plan).startTime;
        activitySetInput.start_offset = getIntervalFromDoyRange(planStartTime, activity.startTime);
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

  async updateConstraint(id: number, constraint: Partial<Constraint>): Promise<boolean> {
    try {
      await reqHasura(gql.UPDATE_CONSTRAINT, { constraint, id });
      return true;
    } catch (e) {
      console.log(e);
      return false;
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

  async updateSchedulingGoal(id: number, goal: Partial<SchedulingGoal>): Promise<boolean> {
    try {
      await reqHasura(gql.UPDATE_SCHEDULING_GOAL, { goal, id });
      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  },

  async updateSchedulingSpec(id: number, spec: Partial<SchedulingSpec>): Promise<void> {
    try {
      await reqHasura(gql.UPDATE_SCHEDULING_SPEC, { id, spec });
    } catch (e) {
      console.log(e);
    }
  },

  async updateSimulation(simulation: Simulation): Promise<Simulation | null> {
    try {
      const data = await reqHasura<Simulation>(gql.UPDATE_SIMULATION, {
        id: simulation.id,
        simulation: {
          arguments: simulation.arguments,
          simulation_template_id: simulation?.template?.id ?? null,
        },
      });
      const { updateSimulation } = data;
      return updateSimulation;
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  async updateView(view: View): Promise<void> {
    try {
      const data = await reqGateway<UpdateViewResponse>(`/view/${view.id}`, 'PUT', JSON.stringify({ view }));
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
      const data = await reqGateway<{ id: number }>('/file', 'POST', body, null, false);
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
        await req.uploadFile(file);
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

export default req;
