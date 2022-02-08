import { get } from 'svelte/store';
import { defaultEnv, env as envStore, user as userStore } from '../stores/app';
import { gatewayUrl, hasuraUrl, schedulerUrl } from './app';
import * as gql from './gql';
import {
  getDoyTime,
  getDoyTimeFromDuration,
  getIntervalFromDoyRange,
} from './time';

/* Helpers. */

function toActivity(activity: any, startTime: Date): Activity {
  return {
    arguments: activity.arguments,
    children: [],
    duration: 0,
    id: activity.id,
    parent: null,
    startTime: getDoyTimeFromDuration(startTime, activity.startOffset),
    type: activity.type,
  };
}

/* Requests. */

export async function reqCreateActivity(
  newActivity: CreateActivity,
  planId: number,
  planStartTime: string,
): Promise<Activity | null> {
  let response: Response;
  let json: any;
  try {
    const user = get<User | null>(userStore);
    const HASURA_URL = hasuraUrl();

    const start_offset = getIntervalFromDoyRange(
      planStartTime,
      newActivity.startTime,
    );
    const activityInput = {
      arguments: newActivity.arguments,
      plan_id: planId,
      start_offset,
      type: newActivity.type,
    };
    const body = {
      query: gql.CREATE_ACTIVITY,
      variables: { activity: activityInput },
    };
    const options = {
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'x-auth-sso-token': user?.ssoToken,
      },
      method: 'POST',
    };

    response = await fetch(HASURA_URL, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);
    if (json.errors) throw new Error(json.errors[0].message);

    const { data } = json;
    const { createActivity } = data;
    const { id } = createActivity;
    const activity: Activity = {
      ...newActivity,
      children: [],
      duration: 0,
      id,
      parent: null,
    };
    return activity;
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return null;
  }
}

export async function reqCreateConstraint(
  newConstraint: CreateConstraint,
): Promise<Constraint | null> {
  let response: Response;
  let json: any;
  try {
    const user = get<User | null>(userStore);
    const HASURA_URL = hasuraUrl();

    const constraintInput = {
      definition: newConstraint.definition,
      description: newConstraint.description,
      model_id: newConstraint.modelId,
      name: newConstraint.name,
      plan_id: newConstraint.planId,
      summary: newConstraint.summary,
    };
    const body = {
      query: gql.CREATE_CONSTRAINT,
      variables: { constraint: constraintInput },
    };
    const options = {
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'x-auth-sso-token': user?.ssoToken,
      },
      method: 'POST',
    };

    response = await fetch(HASURA_URL, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);
    if (json.errors) throw new Error(json.errors[0].message);

    const { data } = json;
    const { createConstraint } = data;
    const { id } = createConstraint;
    const constraint: Constraint = {
      ...newConstraint,
      id,
    };
    return constraint;
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return null;
  }
}

export async function reqCreateModel(
  name: string,
  version: string,
  file: File,
): Promise<CreateModel | null> {
  let response: Response;
  let json: any;
  try {
    const user = get<User | null>(userStore);
    const HASURA_URL = hasuraUrl();

    const jar_id = await reqUploadFile(file);
    const modelInput = {
      jar_id,
      mission: '',
      name,
      version,
    };
    const body = {
      query: gql.CREATE_MODEL,
      variables: { model: modelInput },
    };
    const options = {
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'x-auth-sso-token': user?.ssoToken,
      },
      method: 'POST',
    };

    response = await fetch(HASURA_URL, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);
    if (json.errors) throw new Error(json.errors[0].message);

    const { data } = json;
    const { createModel } = data;
    const { id } = createModel;
    const model: CreateModel = {
      id,
      jarId: jar_id,
      name,
      version,
    };
    return model;
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return null;
  }
}

export async function reqCreatePlan(
  endTime: string,
  modelId: number,
  name: string,
  startTime: string,
): Promise<CreatePlan | null> {
  let response: Response;
  let json: any;
  try {
    const user = get<User | null>(userStore);
    const HASURA_URL = hasuraUrl();

    const planInput = {
      duration: getIntervalFromDoyRange(startTime, endTime),
      model_id: modelId,
      name,
      start_time: startTime,
    };
    const body = {
      query: gql.CREATE_PLAN,
      variables: { plan: planInput },
    };
    const options = {
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'x-auth-sso-token': user?.ssoToken,
      },
      method: 'POST',
    };

    response = await fetch(HASURA_URL, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);
    if (json.errors) throw new Error(json.errors[0].message);

    const { data } = json;
    const { createPlan } = data;
    const { id } = createPlan;
    const plan: CreatePlan = {
      endTime,
      id,
      modelId,
      name,
      startTime,
    };

    return plan;
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return null;
  }
}

export async function reqCreateSimulation(
  plan_id: number,
  simulation_template_id: number | null = null,
  simulationArguments: ArgumentsMap = {},
): Promise<boolean> {
  let response: Response;
  let json: any;
  try {
    const user = get<User | null>(userStore);
    const HASURA_URL = hasuraUrl();

    const simulationInput = {
      arguments: simulationArguments,
      plan_id,
      simulation_template_id,
    };
    const body = {
      query: gql.CREATE_SIMULATION,
      variables: { simulation: simulationInput },
    };
    const options = {
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'x-auth-sso-token': user?.ssoToken,
      },
      method: 'POST',
    };

    response = await fetch(HASURA_URL, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);
    if (json.errors) throw new Error(json.errors[0].message);

    return true;
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return false;
  }
}

export async function reqCreateView(view: View): Promise<CreateViewResponse> {
  let response: Response;
  let json: CreateViewResponse;
  try {
    const user = get<User | null>(userStore);
    const GATEWAY_URL = gatewayUrl();

    const options = {
      body: JSON.stringify({ view }),
      headers: {
        'Content-Type': 'application/json',
        'x-auth-sso-token': user?.ssoToken,
      },
      method: 'POST',
    };

    response = await fetch(`${GATEWAY_URL}/view`, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);

    return json;
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return {
      errors: null,
      message: 'An unexpected error occurred',
      success: false,
      view: null,
    };
  }
}

export async function reqDeleteActivity(id: number): Promise<boolean> {
  let response: Response;
  let json: any;
  try {
    const user = get<User | null>(userStore);
    const HASURA_URL = hasuraUrl();

    const body = {
      query: gql.DELETE_ACTIVITY,
      variables: { id },
    };
    const options = {
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'x-auth-sso-token': user?.ssoToken,
      },
      method: 'POST',
    };

    response = await fetch(HASURA_URL, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);
    if (json.errors) throw new Error(json.errors[0].message);

    return true;
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return false;
  }
}

export async function reqDeleteConstraint(id: number): Promise<boolean> {
  let response: Response;
  let json: any;
  try {
    const user = get<User | null>(userStore);
    const HASURA_URL = hasuraUrl();

    const body = {
      query: gql.DELETE_CONSTRAINT,
      variables: { id },
    };
    const options = {
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'x-auth-sso-token': user?.ssoToken,
      },
      method: 'POST',
    };

    response = await fetch(HASURA_URL, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);
    if (json.errors) throw new Error(json.errors[0].message);

    return true;
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return false;
  }
}

export async function reqDeleteFile(id: number): Promise<boolean> {
  let response: Response;
  let json: any;
  try {
    const user = get<User | null>(userStore);
    const GATEWAY_URL = gatewayUrl();

    const options = {
      headers: {
        'x-auth-sso-token': user?.ssoToken,
      },
      method: 'DELETE',
    };

    response = await fetch(`${GATEWAY_URL}/file/${id}`, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);

    return true;
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return false;
  }
}

export async function reqDeleteModel(
  id: number,
  jarId: number,
): Promise<boolean> {
  let response: Response;
  let json: any;
  try {
    const user = get<User | null>(userStore);
    const HASURA_URL = hasuraUrl();

    await reqDeleteFile(jarId);
    const body = {
      query: gql.DELETE_MODEL,
      variables: { id },
    };
    const options = {
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'x-auth-sso-token': user?.ssoToken,
      },
      method: 'POST',
    };

    response = await fetch(HASURA_URL, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);
    if (json.errors) throw new Error(json.errors[0].message);

    return true;
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return false;
  }
}

export async function reqDeletePlanAndSimulations(
  id: number,
): Promise<boolean> {
  let response: Response;
  let json: any;
  try {
    const user = get<User | null>(userStore);
    const HASURA_URL = hasuraUrl();

    const body = {
      query: gql.DELETE_PLAN_AND_SIMULATIONS,
      variables: { id },
    };
    const options = {
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'x-auth-sso-token': user?.ssoToken,
      },
      method: 'POST',
    };

    response = await fetch(HASURA_URL, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);
    if (json.errors) throw new Error(json.errors[0].message);

    return true;
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return false;
  }
}

export async function reqDeleteView(id: number): Promise<DeleteViewResponse> {
  let response: Response;
  let json: DeleteViewResponse;
  try {
    const user = get<User | null>(userStore);
    const GATEWAY_URL = gatewayUrl();

    const options = {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-sso-token': user?.ssoToken,
      },
      method: 'DELETE',
    };

    response = await fetch(`${GATEWAY_URL}/view/${id}`, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);

    return json;
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return {
      message: 'An unexpected error occurred',
      nextView: null,
      success: false,
    };
  }
}

export async function reqGetActivitiesForPlan(
  planId: number,
): Promise<Activity[]> {
  let response: Response;
  let json: any;
  try {
    const user = get<User | null>(userStore);
    const HASURA_URL = hasuraUrl();

    const options = {
      body: JSON.stringify({
        query: gql.GET_ACTIVITIES_FOR_PLAN,
        variables: { planId },
      }),
      headers: {
        'Content-Type': 'application/json',
        'x-auth-sso-token': user?.ssoToken,
      },
      method: 'POST',
    };

    response = await fetch(HASURA_URL, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);
    if (json.errors) throw new Error(json.errors[0].message);

    const { data } = json;
    const { activities = [], plan } = data;
    const startTime = new Date(plan.startTime);
    const newActivities = activities.map((activity: any) =>
      toActivity(activity, startTime),
    );

    return newActivities;
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return [];
  }
}

export async function reqGetModels(fetch: Fetch): Promise<CreateModel[]> {
  let response: Response;
  let json: any;
  try {
    const user = get<User | null>(userStore);
    const HASURA_URL = hasuraUrl();

    const options = {
      body: JSON.stringify({ query: gql.GET_MODELS }),
      headers: {
        'Content-Type': 'application/json',
        'x-auth-sso-token': user?.ssoToken,
      },
      method: 'POST',
    };

    response = await fetch(HASURA_URL, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);
    if (json.errors) throw new Error(json.errors[0].message);

    const { data } = json;
    const { models = [] } = data;
    return models;
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return [];
  }
}

export async function reqGetPlansAndModels(
  fetch: Fetch,
): Promise<{ models: CreatePlanModel[]; plans: CreatePlan[] }> {
  let response: Response;
  let json: any;
  try {
    const user = get<User | null>(userStore);
    const HASURA_URL = hasuraUrl();

    const options = {
      body: JSON.stringify({ query: gql.GET_PLANS_AND_MODELS }),
      headers: {
        'Content-Type': 'application/json',
        'x-auth-sso-token': user?.ssoToken,
      },
      method: 'POST',
    };

    response = await fetch(HASURA_URL, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);
    if (json.errors) throw new Error(json.errors[0].message);

    const { data } = json;
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
    console.log(response);
    console.log(json);
    return { models: [], plans: [] };
  }
}

export async function reqGetPlan(
  fetch: Fetch,
  id: number,
): Promise<Plan | null> {
  let response: Response;
  let json: any;
  try {
    const user = get<User | null>(userStore);
    const HASURA_URL = hasuraUrl();

    const body = {
      query: gql.GET_PLAN,
      variables: { id },
    };
    const options = {
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'x-auth-sso-token': user?.ssoToken,
      },
      method: 'POST',
    };

    response = await fetch(HASURA_URL, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);
    if (json.errors) throw new Error(json.errors[0].message);

    const { data } = json;
    const { plan } = data;
    const startTime = new Date(plan.startTime);

    return {
      ...plan,
      activities: plan.activities.map((activity: any) =>
        toActivity(activity, startTime),
      ),
      endTime: getDoyTimeFromDuration(startTime, plan.duration),
      startTime: getDoyTime(startTime),
    };
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return null;
  }
}

export async function reqGetView(
  fetch: Fetch,
  query: URLSearchParams,
): Promise<View | null> {
  let response: Response;
  let json: GetViewResponse;
  try {
    const user = get<User | null>(userStore);
    const GATEWAY_URL = gatewayUrl();
    const viewId = query.has('viewId') ? query.get('viewId') : 'latest';

    const options = {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-sso-token': user?.ssoToken,
      },
      method: 'GET',
    };

    response = await fetch(`${GATEWAY_URL}/view/${viewId}`, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);

    const { view } = json;
    return view;
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return null;
  }
}

export async function reqGetViews(): Promise<View[] | null> {
  let response: Response;
  let json: View[];
  try {
    const user = get<User | null>(userStore);
    const GATEWAY_URL = gatewayUrl();

    const options = {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-sso-token': user?.ssoToken,
      },
      method: 'GET',
    };

    response = await fetch(`${GATEWAY_URL}/views`, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);

    return json;
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return null;
  }
}

export async function reqLogin(
  username: string,
  password: string,
): Promise<ReqLoginResponse> {
  let response: Response;
  let json: any;
  try {
    const GATEWAY_URL = gatewayUrl();
    const body = JSON.stringify({ password, username });
    const options = {
      body,
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    };

    response = await fetch(`${GATEWAY_URL}/auth/login`, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);

    return json;
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return {
      message: 'An unexpected error occurred',
      ssoToken: null,
      success: false,
      username: null,
    };
  }
}

export async function reqLogout(ssoToken: string): Promise<ReqLogoutResponse> {
  let response: Response;
  let json: any;
  try {
    const GATEWAY_URL = gatewayUrl();
    const options = {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-sso-token': ssoToken,
      },
      method: 'DELETE',
    };

    response = await fetch(`${GATEWAY_URL}/auth/logout`, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);

    return json;
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return { message: 'An unexpected error occurred', success: false };
  }
}

export async function reqResourceTypes(
  modelId: number,
): Promise<ResourceType[]> {
  let response: Response;
  let json: any;
  try {
    const user = get<User | null>(userStore);
    const HASURA_URL = hasuraUrl();

    const body = {
      query: gql.RESOURCE_TYPES,
      variables: { modelId },
    };
    const options = {
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'x-auth-sso-token': user?.ssoToken,
      },
      method: 'POST',
    };

    response = await fetch(HASURA_URL, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);
    if (json.errors) throw new Error(json.errors[0].message);

    const { data } = json;
    const resourceTypes: ResourceType[] = data.resourceTypes;

    return resourceTypes;
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return [];
  }
}

export async function reqSchedule(planId: number): Promise<SchedulingResponse> {
  let response: Response;
  let json: SchedulingResponse;
  try {
    const user = get<User | null>(userStore);
    const SCHEDULER_URL = schedulerUrl();

    const body = {
      action: { name: 'SCHEDULE' },
      input: { planId: `${planId}` },
      session_variables: { 'x-hasura-role': '' },
    };
    const options = {
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'x-auth-sso-token': user?.ssoToken,
      },
      method: 'POST',
    };

    response = await fetch(`${SCHEDULER_URL}/schedule`, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);
    return json;
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return { status: 'failed' };
  }
}

export async function reqSession(
  ssoToken: string,
): Promise<ReqSessionResponse> {
  let response: Response;
  let json: any;
  try {
    const GATEWAY_URL = gatewayUrl();
    const options = {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-sso-token': ssoToken,
      },
      method: 'GET',
    };

    response = await fetch(`${GATEWAY_URL}/auth/session`, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);

    return json;
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return {
      message: 'An unexpected error occurred',
      success: false,
    };
  }
}

export async function reqSetAppStores(
  fetch: Fetch,
  session: App.Session,
): Promise<void> {
  let response: Response;
  let json: any;
  try {
    response = await fetch('/env');
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);
    envStore.set(json);
    userStore.set(session?.user || null);
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    envStore.set(defaultEnv);
    userStore.set(session?.user || null);
  }
}

export async function reqSimulate(
  modelId: number,
  planId: number,
): Promise<{
  activitiesMap?: ActivitiesMap;
  constraintViolations?: ConstraintViolation[];
  resources?: Resource[];
  status: 'complete' | 'failed' | 'incomplete';
}> {
  let response: Response;
  let json: any;
  try {
    const user = get<User | null>(userStore);
    const HASURA_URL = hasuraUrl();

    const body = {
      query: gql.SIMULATE,
      variables: { planId },
    };
    const options = {
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'x-auth-sso-token': user?.ssoToken,
      },
      method: 'POST',
    };

    response = await fetch(HASURA_URL, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);
    if (json.errors) throw new Error(json.errors[0].message);

    const { data } = json;
    const { results, status }: SimulateResponse = data.simulate;

    if (status === 'complete') {
      // Activities.
      const activitiesMap: ActivitiesMap = Object.keys(
        results.activities,
      ).reduce((activitiesMap: ActivitiesMap, idAsString: string) => {
        const id = parseFloat(idAsString);
        const activity = results.activities[id];

        activitiesMap[id] = {
          arguments: activity.arguments,
          children: activity.children,
          duration: activity.duration,
          id,
          parent: activity.parent,
          startTime: activity.startTimestamp,
          type: activity.type,
        };

        return activitiesMap;
      }, {});

      // Resources.
      const resourceTypes: ResourceType[] = await reqResourceTypes(modelId);
      const resourceTypesMap = resourceTypes.reduce(
        (map: { [name: string]: any }, { name, schema }) => {
          map[name] = schema;
          return map;
        },
        {},
      );
      const resources: Resource[] = Object.entries(results.resources).map(
        ([name, values]) => ({
          name,
          schema: resourceTypesMap[name] || { type: 'unknown' },
          startTime: results.start,
          values,
        }),
      );

      // Constraint Violations.
      const constraintViolations: ConstraintViolation[] = Object.entries(
        results.constraints,
      ).flatMap(([name, violations]: [string, any]) =>
        violations.map((violation: any) => ({
          associations: violation.associations,
          constraint: {
            name,
          },
          windows: violation.windows,
        })),
      );

      return { activitiesMap, constraintViolations, resources, status };
    } else {
      return { status };
    }
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return { status: 'failed' };
  }
}

export async function reqUpdateActivity(
  activity: UpdateActivity,
  planStartTime: string,
): Promise<UpdateActivity | null> {
  const activityInput: UpdateActivityInput = {};

  if (activity.arguments) {
    activityInput.arguments = activity.arguments;
  }

  if (activity.startTime) {
    activityInput.start_offset = getIntervalFromDoyRange(
      planStartTime,
      activity.startTime,
    );
  }

  let response: Response;
  let json: any;
  try {
    const user = get<User | null>(userStore);
    const HASURA_URL = hasuraUrl();

    const body = {
      query: gql.UPDATE_ACTIVITY,
      variables: { activity: activityInput, id: activity.id },
    };
    const options = {
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'x-auth-sso-token': user?.ssoToken,
      },
      method: 'POST',
    };

    response = await fetch(HASURA_URL, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);
    if (json.errors) throw new Error(json.errors[0].message);

    return activity;
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return null;
  }
}

export async function reqUpdateConstraint(
  updatedConstraint: Constraint,
): Promise<Constraint> {
  let response: Response;
  let json: any;
  try {
    const user = get<User | null>(userStore);
    const HASURA_URL = hasuraUrl();

    const constraintInput = {
      definition: updatedConstraint.definition,
      description: updatedConstraint.description,
      model_id: updatedConstraint.modelId,
      name: updatedConstraint.name,
      plan_id: updatedConstraint.planId,
      summary: updatedConstraint.summary,
    };
    const body = {
      query: gql.UPDATE_CONSTRAINT,
      variables: { constraint: constraintInput, id: updatedConstraint.id },
    };
    const options = {
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'x-auth-sso-token': user?.ssoToken,
      },
      method: 'POST',
    };

    response = await fetch(HASURA_URL, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);
    if (json.errors) throw new Error(json.errors[0].message);

    return updatedConstraint;
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return null;
  }
}

export async function reqUpdateSimulation(
  simulation: Simulation,
): Promise<Simulation | null> {
  let response: Response;
  let json: any;
  try {
    const user = get<User | null>(userStore);
    const HASURA_URL = hasuraUrl();

    const body = {
      query: gql.UPDATE_SIMULATION,
      variables: {
        id: simulation.id,
        simulation: {
          arguments: simulation.arguments,
          simulation_template_id: simulation?.template?.id ?? null,
        },
      },
    };
    const options = {
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'x-auth-sso-token': user?.ssoToken,
      },
      method: 'POST',
    };

    response = await fetch(HASURA_URL, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);
    if (json.errors) throw new Error(json.errors[0].message);

    const { data } = json;
    const { updateSimulation } = data;
    return updateSimulation;
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return null;
  }
}

export async function reqUpdateView(view: View): Promise<UpdateViewResponse> {
  let response: Response;
  let json: UpdateViewResponse;
  try {
    const user = get<User | null>(userStore);
    const GATEWAY_URL = gatewayUrl();

    const options = {
      body: JSON.stringify({ view }),
      headers: {
        'Content-Type': 'application/json',
        'x-auth-sso-token': user?.ssoToken,
      },
      method: 'PUT',
    };

    response = await fetch(`${GATEWAY_URL}/view/${view.id}`, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);

    return json;
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return {
      errors: null,
      message: 'An unexpected error occurred',
      success: false,
    };
  }
}

export async function reqUploadFile(file: File): Promise<number | null> {
  let response: Response;
  let json: any;
  try {
    const user = get<User | null>(userStore);
    const GATEWAY_URL = gatewayUrl();

    const body = new FormData();
    body.append('file', file, file.name);
    const options = {
      body,
      headers: {
        'x-auth-sso-token': user?.ssoToken,
      },
      method: 'POST',
    };

    response = await fetch(`${GATEWAY_URL}/file`, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);

    const { id } = json;
    return id;
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return null;
  }
}

export async function reqUploadFiles(files: File[]): Promise<boolean> {
  try {
    for (const file of files) {
      await reqUploadFile(file);
    }
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

export async function reqValidateActivityArguments(
  activityTypeName: string,
  modelId: number,
  argumentsMap: ArgumentsMap,
): Promise<ParameterValidationResponse> {
  let response: Response;
  let json: any;
  try {
    const user = get<User | null>(userStore);
    const HASURA_URL = hasuraUrl();

    const body = {
      query: gql.VALIDATE_ACTIVITY_ARGUMENTS,
      variables: { activityTypeName, arguments: argumentsMap, modelId },
    };
    const options = {
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'x-auth-sso-token': user?.ssoToken,
      },
      method: 'POST',
    };

    response = await fetch(HASURA_URL, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);
    if (json.errors) throw new Error(json.errors[0].message);

    const { data } = json;
    const { validateActivityArguments } = data;
    return validateActivityArguments;
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    const { message } = e;
    return { errors: [message], success: false };
  }
}

export async function reqValidateConstraint(body: string) {
  let response: Response;
  let json: any;
  try {
    const GATEWAY_URL = gatewayUrl();
    const options = {
      body,
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    };

    response = await fetch(`${GATEWAY_URL}/constraint/validate`, options);
    json = await response.json();
    if (!response.ok) throw new Error(response.statusText);

    return json;
  } catch (e) {
    console.log(e);
    console.log(response);
    console.log(json);
    return {
      errors: ['An unexpected error occurred'],
      valid: false,
    };
  }
}
