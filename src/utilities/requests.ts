import { GATEWAY_APOLLO_URL } from '../env';
import {
  CREATE_ACTIVITIES,
  DELETE_ACTIVITY,
  DELETE_MODEL_CONSTRAINTS,
  DELETE_PLAN_CONSTRAINTS,
  GET_PLAN,
  SIMULATE,
  UPDATE_ACTIVITY,
  UPDATE_MODEL_ARGUMENTS,
  UPDATE_MODEL_CONSTRAINTS,
  UPDATE_PLAN_CONSTRAINTS,
  UPLOAD_FILE,
  VALIDATE_PARAMETERS,
} from '../gql';
import type { ViewPostResponseBody } from '../routes/views';
import type {
  ViewIdDelResponseBody,
  ViewIdPutResponseBody,
} from '../routes/views/[id]';
import type {
  Constraint,
  Fetch,
  NewActivity,
  Parameter,
  ParameterValidationResponse,
  SimulationResponse,
  UpdateActivity,
  View,
} from '../types';

type CreateActivityResponse = {
  ids: string[];
  message: string;
  success: boolean;
};

type GenericResponse = {
  message: string;
  success: boolean;
};

export async function reqCreateActivity(
  activity: NewActivity,
  planId: string,
  authorization: string,
): Promise<CreateActivityResponse> {
  try {
    const activities = [activity];
    const body = {
      query: CREATE_ACTIVITIES,
      variables: { activities, planId },
    };
    const options = {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };
    const response = await fetch(GATEWAY_APOLLO_URL, options);
    const { data } = await response.json();
    const { createActivities } = data;
    return createActivities;
  } catch (e) {
    console.log(e);
    const { message } = e;
    return { ids: [], message, success: false };
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
  activityId: string,
  planId: string,
  authorization: string,
): Promise<GenericResponse> {
  try {
    const body = {
      query: DELETE_ACTIVITY,
      variables: { activityId, planId },
    };
    const options = {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };
    const response = await fetch(GATEWAY_APOLLO_URL, options);
    const { data } = await response.json();
    const { deleteActivity } = data;
    return deleteActivity;
  } catch (e) {
    console.log(e);
    const { message } = e;
    return { message, success: false };
  }
}

export async function reqDeleteConstraint(
  constraint: Constraint,
  type: string,
  modelId: string,
  planId: string,
  authorization: string,
): Promise<GenericResponse> {
  try {
    const id = type === 'plan' ? planId : modelId;
    const query =
      type === 'plan' ? DELETE_PLAN_CONSTRAINTS : DELETE_MODEL_CONSTRAINTS;
    const body = {
      query,
      variables: { id, names: [constraint.name] },
    };
    const options = {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };
    const response = await fetch(GATEWAY_APOLLO_URL, options);
    const { data } = await response.json();
    const { deleteConstraints } = data;
    return deleteConstraints;
  } catch (e) {
    console.log(e);
    const { message } = e;
    return { message, success: false };
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

export async function reqGetPlan<T>(
  fetch: Fetch,
  id: string,
  authorization: string,
): Promise<T | null> {
  try {
    const body = { query: GET_PLAN, variables: { id } };
    const options = {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };
    const response = await fetch(GATEWAY_APOLLO_URL, options);
    const { data } = await response.json();
    const { plan } = data;
    return plan;
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
  planId: string,
  modelId: string,
  authorization: string,
): Promise<SimulationResponse> {
  try {
    const body = { query: SIMULATE, variables: { modelId, planId } };
    const options = {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };
    const response = await fetch(GATEWAY_APOLLO_URL, options);
    const { data } = await response.json();
    const { simulate } = data;
    return simulate;
  } catch (e) {
    console.log(e);
    return { status: 'failed', success: false };
  }
}

export async function reqUpdateActivity(
  activity: UpdateActivity,
  planId: string,
  authorization: string,
): Promise<GenericResponse> {
  try {
    const body = {
      query: UPDATE_ACTIVITY,
      variables: { activity, planId },
    };
    const options = {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };
    const response = await fetch(GATEWAY_APOLLO_URL, options);
    const { data } = await response.json();
    const { updateActivity } = data;
    return updateActivity;
  } catch (e) {
    console.log(e);
    const { message } = e;
    return { message, success: false };
  }
}

export async function reqUpdateModelArguments(
  planId: string,
  modelArguments: Parameter[],
  authorization: string,
): Promise<GenericResponse> {
  try {
    const modelArgumentsMap = modelArguments.reduce(
      (modelArgumentsMap, { name, value }) => {
        modelArgumentsMap[name] = value;
        return modelArgumentsMap;
      },
      {},
    );
    const body = {
      query: UPDATE_MODEL_ARGUMENTS,
      variables: { modelArguments: modelArgumentsMap, planId },
    };
    const options = {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };
    const response = await fetch(GATEWAY_APOLLO_URL, options);
    const { data } = await response.json();
    const { updateModelArguments } = data;
    return updateModelArguments;
  } catch (e) {
    console.log(e);
    const { message } = e;
    return { message, success: false };
  }
}

export async function reqUpdateConstraint(
  constraint: Constraint,
  type: string,
  modelId: string,
  planId: string,
  authorization: string,
): Promise<GenericResponse> {
  try {
    const id = type === 'plan' ? planId : modelId;
    const query =
      type === 'plan' ? UPDATE_PLAN_CONSTRAINTS : UPDATE_MODEL_CONSTRAINTS;
    const body = {
      query,
      variables: { constraints: [constraint], id },
    };
    const options = {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };
    const response = await fetch(GATEWAY_APOLLO_URL, options);
    const { data } = await response.json();
    const { updateConstraints } = data;
    return updateConstraints;
  } catch (e) {
    console.log(e);
    const { message } = e;
    return { message, success: false };
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
): Promise<GenericResponse> {
  try {
    const fileMap = {
      file: ['variables.file'],
    };
    const operations = {
      query: UPLOAD_FILE,
      variables: {
        file: null,
      },
    };

    // Form append order matters here!
    const body = new FormData();
    body.append('operations', JSON.stringify(operations));
    body.append('map', JSON.stringify(fileMap));
    body.append('file', file, file.name);

    const options = {
      body,
      headers: { authorization },
      method: 'POST',
    };
    const response = await fetch(GATEWAY_APOLLO_URL, options);
    const { data } = await response.json();
    const { uploadFile } = data;
    return uploadFile;
  } catch (e) {
    console.log(e);
    const { message } = e;
    return { message, success: false };
  }
}

export async function reqUploadFiles(
  files: File[],
  authorization: string,
): Promise<GenericResponse> {
  try {
    for (const file of files) {
      await reqUploadFile(file, authorization);
    }
    return { message: 'Files uploaded successfully', success: true };
  } catch (e) {
    console.log(e);
    const { message } = e;
    return { message, success: false };
  }
}

export async function reqValidateParameters(
  activityTypeName: string,
  modelId: string,
  parameters: Parameter[],
  authorization: string,
): Promise<ParameterValidationResponse> {
  try {
    const body = {
      query: VALIDATE_PARAMETERS,
      variables: { activityTypeName, modelId, parameters },
    };
    const options = {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };
    const response = await fetch(GATEWAY_APOLLO_URL, options);
    const { data } = await response.json();
    const { validateParameters } = data;
    return validateParameters;
  } catch (e) {
    console.log(e);
    const { message } = e;
    return { errors: [message], success: false };
  }
}
