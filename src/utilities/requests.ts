import { GATEWAY_URL, HASURA_URL } from '../env';
import type { ViewPostResponseBody } from '../routes/views';
import type {
  ViewIdDelResponseBody,
  ViewIdPutResponseBody
} from '../routes/views/[id]';
import type {
  ActivitiesMap,
  Activity,
  ActivityType,
  ArgumentsMap,
  Constraint,
  ConstraintViolation,
  CreateActivity,
  CreateConstraint,
  Fetch,
  ParametersMap,
  ParameterValidationResponse,
  Resource,
  ResourceValue,
  Simulation,
  UpdateActivity,
  View
} from '../types';
import {
  CREATE_ACTIVITY,
  CREATE_CONSTRAINT,
  CREATE_MODEL,
  CREATE_PLAN,
  CREATE_SIMULATION,
  DELETE_ACTIVITY,
  DELETE_CONSTRAINT,
  DELETE_MODEL,
  DELETE_PLAN_AND_SIMULATIONS,
  GET_MODELS,
  GET_PLAN,
  GET_PLANS_AND_MODELS,
  SIMULATE,
  UPDATE_ACTIVITY,
  UPDATE_CONSTRAINT,
  UPDATE_SIMULATION_ARGUMENTS,
  VALIDATE_ARGUMENTS
} from './gql';
import {
  getDoyTime,
  getDoyTimeFromDuration,
  getIntervalFromDoyRange
} from './time';

/* Types. */

export type CreateActivityResponse = {
  ids: string[];
  message: string;
  success: boolean;
};

export type CreateModel = {
  id: number;
  jarId: number;
  name: string;
  version: string;
};

export type CreatePlan = {
  endTime: string;
  id: number;
  modelId: number;
  name: string;
  startTime: string;
};

export type CreatePlanModel = {
  id: number;
  name: string;
};

export type Model = {
  activityTypes: ActivityType[];
  constraints: Constraint[];
  id: number;
  parameters: { parameters: ParametersMap };
};

export type Plan = {
  activities: Activity[];
  constraints: Constraint[];
  duration: string;
  endTime: string;
  id: number;
  model: Model;
  name: string;
  simulations: Simulation[];
  startTime: string;
};

export type ResourceType = {
  name: string;
  schema: { type: string } & any;
};

export type SimulateResponse = {
  results?: {
    activities: {
      [id: string]: {
        children: string[];
        duration: number;
        parameters: ArgumentsMap;
        parent: string | null;
        startTimestamp: string;
        type: string;
      };
    };
    constraints: { [name: string]: any[] };
    resources: { [name: string]: ResourceValue[] };
    start: string;
  };
  status: 'complete' | 'failed' | 'incomplete';
};

export type UpdateActivityInput = {
  arguments?: ArgumentsMap;
  start_offset?: string;
};

/* Functions. */

export async function reqCreateActivity(
  newActivity: CreateActivity,
  planId: number,
  planStartTime: string,
  authorization: string,
): Promise<Activity | null> {
  try {
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
      query: CREATE_ACTIVITY,
      variables: { activity: activityInput },
    };
    const options = {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };
    const response = await fetch(HASURA_URL, options);
    const { data } = await response.json();
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
    return null;
  }
}

export async function reqCreateConstraint(
  newConstraint: CreateConstraint,
  authorization: string,
): Promise<Constraint | null> {
  try {
    const constraintInput = {
      definition: newConstraint.definition,
      description: newConstraint.description,
      model_id: newConstraint.modelId,
      name: newConstraint.name,
      plan_id: newConstraint.planId,
      summary: newConstraint.summary,
    };
    const body = {
      query: CREATE_CONSTRAINT,
      variables: { constraint: constraintInput },
    };
    const options = {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };
    const response = await fetch(HASURA_URL, options);
    const { data } = await response.json();
    const { createConstraint } = data;
    const { id } = createConstraint;
    const constraint: Constraint = {
      ...newConstraint,
      id,
    };
    return constraint;
  } catch (e) {
    console.log(e);
    return null;
  }
}

export async function reqCreateModel(
  name: string,
  version: string,
  file: File,
  authorization: string,
): Promise<CreateModel | null> {
  try {
    const jar_id = await reqUploadFile(file, authorization);
    const modelInput = {
      jar_id,
      mission: '',
      name,
      version,
    };
    const body = {
      query: CREATE_MODEL,
      variables: { model: modelInput },
    };
    const options = {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };
    const response = await fetch(HASURA_URL, options);
    const { data } = await response.json();
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
    return null;
  }
}

export async function reqCreatePlan(
  endTime: string,
  modelId: number,
  name: string,
  startTime: string,
  simulationArguments: ArgumentsMap,
  authorization: string,
): Promise<CreatePlan | null> {
  try {
    const planInput = {
      duration: getIntervalFromDoyRange(startTime, endTime),
      model_id: modelId,
      name,
      start_time: startTime,
    };
    const body = {
      query: CREATE_PLAN,
      variables: { plan: planInput },
    };
    const options = {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };
    const response = await fetch(HASURA_URL, options);
    const { data } = await response.json();
    const { createPlan } = data;
    const { id } = createPlan;
    const plan: CreatePlan = {
      endTime,
      id,
      modelId,
      name,
      startTime,
    };

    await reqCreateSimulation(id, simulationArguments, authorization);

    return plan;
  } catch (e) {
    console.log(e);
    return null;
  }
}

export async function reqCreateSimulation(
  plan_id: string,
  simulationArguments: ArgumentsMap,
  authorization: string,
): Promise<boolean> {
  try {
    const simulationInput = { arguments: simulationArguments, plan_id };
    const body = {
      query: CREATE_SIMULATION,
      variables: { simulation: simulationInput },
    };
    const options = {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };
    await fetch(HASURA_URL, options);
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

export async function reqCreateView(
  name: string,
  view: View,
): Promise<ViewPostResponseBody> {
  try {
    const response = await fetch(`/views`, {
      body: JSON.stringify({ name, view }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const responseJson = (await response.json()) as ViewPostResponseBody;
    return responseJson;
  } catch (e) {
    console.log(e);
    return { message: e.message, success: false, view: null };
  }
}

export async function reqDeleteActivity(
  id: number,
  authorization: string,
): Promise<boolean> {
  try {
    const body = {
      query: DELETE_ACTIVITY,
      variables: { id },
    };
    const options = {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };
    await fetch(HASURA_URL, options);
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

export async function reqDeleteConstraint(
  id: number,
  authorization: string,
): Promise<boolean> {
  try {
    const body = {
      query: DELETE_CONSTRAINT,
      variables: { id },
    };
    const options = {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };
    await fetch(HASURA_URL, options);
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

export async function reqDeleteFile(
  id: number,
  authorization: string,
): Promise<void> {
  const options = {
    headers: { 'x-cam-sso-token': authorization },
    method: 'DELETE',
  };
  const response = await fetch(`${GATEWAY_URL}/file/${id}`, options);
  const { success } = await response.json();

  if (!success) {
    throw new Error('Delete file failed');
  }
}

export async function reqDeleteModel(
  id: number,
  jar_id: number,
  authorization: string,
): Promise<boolean> {
  try {
    await reqDeleteFile(jar_id, authorization);
    const body = { query: DELETE_MODEL, variables: { id } };
    const options = {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };
    await fetch(HASURA_URL, options);
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

export async function reqDeletePlanAndSimulations(
  id: number,
  authorization: string,
): Promise<boolean> {
  try {
    const body = { query: DELETE_PLAN_AND_SIMULATIONS, variables: { id } };
    const options = {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };
    await fetch(HASURA_URL, options);
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

export async function reqDeleteView(
  id: string,
): Promise<ViewIdDelResponseBody> {
  try {
    const response = await fetch(`/views/${id}`, { method: 'DELETE' });
    const responseJson = (await response.json()) as ViewIdDelResponseBody;
    return responseJson;
  } catch (e) {
    console.log(e);
    return { message: e.message, success: false };
  }
}

export async function reqGetModels(
  fetch: Fetch,
  authorization: string,
): Promise<CreateModel[]> {
  try {
    const options = {
      body: JSON.stringify({ query: GET_MODELS }),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };
    const response = await fetch(HASURA_URL, options);
    const { data } = await response.json();
    const { models = [] } = data;
    return models;
  } catch (e) {
    console.log(e);
    return [];
  }
}

export async function reqGetPlansAndModels(
  fetch: Fetch,
  authorization: string,
): Promise<{ models: CreatePlanModel[]; plans: CreatePlan[] }> {
  try {
    const options = {
      body: JSON.stringify({ query: GET_PLANS_AND_MODELS }),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };
    const response = await fetch(HASURA_URL, options);
    const { data } = await response.json();
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
}

export async function reqGetPlan(
  fetch: Fetch,
  id: number,
  authorization: string,
): Promise<Plan | null> {
  try {
    const body = { query: GET_PLAN, variables: { id } };
    const options = {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };
    const response = await fetch(HASURA_URL, options);
    const { data } = await response.json();
    const { plan } = data;
    const startTime = new Date(plan.startTime);
    return {
      ...plan,
      activities: plan.activities.map((activity: any) => ({
        arguments: activity.arguments,
        children: [],
        duration: 0,
        id: activity.id,
        parent: null,
        startTime: getDoyTimeFromDuration(startTime, activity.startOffset),
        type: activity.type,
      })),
      endTime: getDoyTimeFromDuration(startTime, plan.duration),
      startTime: getDoyTime(startTime),
    };
  } catch (e) {
    console.log(e);
    return null;
  }
}

export async function reqGetView(
  fetch: Fetch,
  query: URLSearchParams,
): Promise<View | null> {
  try {
    const viewId = query.has('viewId') ? query.get('viewId') : 'latest';
    const response = await fetch(`/views/${viewId}`);
    const { view } = await response.json();
    return view;
  } catch (e) {
    console.log(e);
    return null;
  }
}

export async function reqGetViews(): Promise<View[] | null> {
  try {
    const response = await fetch(`/views`);
    const { views } = await response.json();
    return views;
  } catch (e) {
    console.log(e);
    return null;
  }
}

export async function reqSimulate(
  modelId: number,
  planId: number,
  authorization: string,
): Promise<{
  activitiesMap?: ActivitiesMap;
  constraintViolations?: ConstraintViolation[];
  resources?: Resource[];
  status: 'complete' | 'failed' | 'incomplete';
}> {
  try {
    const body = {
      query: SIMULATE,
      variables: { modelId, planId: `${planId}` },
    };
    const options = {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };
    const response = await fetch(HASURA_URL, options);
    const { data } = await response.json();

    const resourceTypes: ResourceType[] = data.resourceTypes;
    const { results, status }: SimulateResponse = data.simulate;

    if (status === 'complete') {
      const activitiesMap: ActivitiesMap = Object.keys(
        results.activities,
      ).reduce((activitiesMap: ActivitiesMap, id: string) => {
        const activity = results.activities[id];
        activitiesMap[id] = {
          arguments: activity.parameters,
          children: activity.children,
          duration: activity.duration,
          id,
          parent: activity.parent,
          startTime: activity.startTimestamp,
          type: activity.type,
        };
        return activitiesMap;
      }, {});

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
    return { status: 'failed' };
  }
}

export async function reqUpdateActivity(
  activity: UpdateActivity,
  planStartTime: string,
  authorization: string,
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

  try {
    const body = {
      query: UPDATE_ACTIVITY,
      variables: { activity: activityInput, id: activity.id },
    };
    const options = {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };
    await fetch(HASURA_URL, options);
    return activity;
  } catch (e) {
    console.log(e);
    return null;
  }
}

export async function reqUpdateConstraint(
  updatedConstraint: Constraint,
  authorization: string,
): Promise<Constraint> {
  try {
    const constraintInput = {
      definition: updatedConstraint.definition,
      description: updatedConstraint.description,
      model_id: updatedConstraint.modelId,
      name: updatedConstraint.name,
      plan_id: updatedConstraint.planId,
      summary: updatedConstraint.summary,
    };
    const body = {
      query: UPDATE_CONSTRAINT,
      variables: { constraint: constraintInput, id: updatedConstraint.id },
    };
    const options = {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };
    await fetch(HASURA_URL, options);
    return updatedConstraint;
  } catch (e) {
    console.log(e);
    return null;
  }
}

export async function reqUpdateSimulationArguments(
  simulationId: number,
  argumentsMap: ArgumentsMap,
  authorization: string,
): Promise<boolean> {
  try {
    const body = {
      query: UPDATE_SIMULATION_ARGUMENTS,
      variables: { arguments: argumentsMap, simulationId },
    };
    const options = {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };
    await fetch(HASURA_URL, options);
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

export async function reqUpdateView(
  view: View,
): Promise<ViewIdPutResponseBody> {
  try {
    const response = await fetch(`/views/${view.id}`, {
      body: JSON.stringify({ view }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PUT',
    });
    const responseJson = (await response.json()) as ViewIdPutResponseBody;
    return responseJson;
  } catch (e) {
    console.log(e);
    return { message: e.message, success: false };
  }
}

export async function reqUploadFile(
  file: File,
  authorization: string,
): Promise<number | null> {
  const body = new FormData();
  body.append('file', file, file.name);

  const options = {
    body,
    headers: { 'x-cam-sso-token': authorization },
    method: 'POST',
  };
  const response = await fetch(`${GATEWAY_URL}/file`, options);
  const { id = null } = await response.json();

  if (id === null) {
    throw new Error('Upload file failed');
  }

  return id;
}

export async function reqUploadFiles(
  files: File[],
  authorization: string,
): Promise<boolean> {
  try {
    for (const file of files) {
      await reqUploadFile(file, authorization);
    }
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

export async function reqValidateArguments(
  activityTypeName: string,
  modelId: number,
  argumentsMap: ArgumentsMap,
  authorization: string,
): Promise<ParameterValidationResponse> {
  try {
    const body = {
      query: VALIDATE_ARGUMENTS,
      variables: { activityTypeName, arguments: argumentsMap, modelId },
    };
    const options = {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };
    const response = await fetch(HASURA_URL, options);
    const { data } = await response.json();
    const { validateArguments } = data;
    return validateArguments;
  } catch (e) {
    console.log(e);
    const { message } = e;
    return { errors: [message], success: false };
  }
}
