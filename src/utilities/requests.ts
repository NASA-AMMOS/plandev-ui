import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import { get } from 'svelte/store';
import { userStore } from '../lib/stores/auth';
import type { BaseUser, User } from '../types/app';
import type { ExtensionPayload, ExtensionResponse } from '../types/extension';
import type { QueryVariables } from '../types/subscribable';
import { logout } from '../utilities/login';
import { INVALID_JWT } from '../utilities/permissions';

/**
 * Used to make calls to application external to Aerie.
 *
 * @param url The external URL to call.
 * @param payload The JSON payload that is serialized as the body of the request.
 * @param user The user information serialized as a bearer token.
 * @returns
 */
export async function reqExtension(
  url: string,
  payload: ExtensionPayload | (ExtensionPayload & Record<'url', string>),
  user: BaseUser | User | null,
): Promise<ExtensionResponse> {
  const headers: HeadersInit = {
    Authorization: `Bearer ${user?.token ?? ''}`,
    'x-hasura-role': (user as User)?.activeRole ?? '',
    ...{ 'Content-Type': 'application/json' },
  };
  const options: RequestInit = {
    headers,
    method: 'POST',
  };

  if (payload !== null) {
    options.body = JSON.stringify({
      ...payload,
      gateway: browser ? env.PUBLIC_GATEWAY_CLIENT_URL : env.PUBLIC_GATEWAY_SERVER_URL,
      hasura: browser ? env.PUBLIC_HASURA_CLIENT_URL : env.PUBLIC_HASURA_SERVER_URL,
    });
  }

  const response = await fetch(`${url}`, options);

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  return await response.json();
}

/**
 * Function to make HTTP requests to the Aerie Gateway.
 */
export async function reqGateway<T = any>(
  url: string,
  method: string,
  body: any | null,
  user: BaseUser | User | null,
  excludeContentType: boolean,
  signal?: AbortSignal,
  asJson: boolean = true,
): Promise<T> {
  const GATEWAY_URL = browser ? env.PUBLIC_GATEWAY_CLIENT_URL : env.PUBLIC_GATEWAY_SERVER_URL;

  const headers: HeadersInit = {
    Authorization: `Bearer ${user?.token ?? ''}`,
    ...(excludeContentType ? {} : { 'Content-Type': 'application/json' }),
    'x-hasura-role': (user as User)?.activeRole ?? '',
    'x-hasura-user-id': user?.id ?? '',
  };
  const options: RequestInit = {
    headers,
    method,
    signal,
  };

  if (body !== null) {
    options.body = body;
  }

  const response = await fetch(`${GATEWAY_URL}${url}`, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(response.statusText + '\n' + errorText);
  }

  if (asJson) {
    return await response.json();
  }

  return (await response.text()) as T;
}

/**
 * Function to make HTTP requests to the Aerie Gateway, forwarding all cookies
 */
export async function reqGatewayForwardCookies<T = any>(path: string, cookies: string, referrer?: string): Promise<T> {
  const GATEWAY_URL = browser ? env.PUBLIC_GATEWAY_CLIENT_URL : env.PUBLIC_GATEWAY_SERVER_URL;

  const opts = {
    headers: {
      cookie: cookies,
      referrer: referrer ?? '',
    },
  };

  const validationResponse = await fetch(`${GATEWAY_URL}${path}`, opts);
  const validationData: T = await validationResponse.json();

  return validationData;
}

// TODO: extract common functionality between these two
export async function reqHasuraWhileAuthenticating<T = any>(
  query: string,
  variables: QueryVariables = {},
  user: User, // we actually use the user parameter, since userStore not set yet
  signal?: AbortSignal,
): Promise<Record<string, T | null>> {
  const HASURA_URL = browser ? env.PUBLIC_HASURA_CLIENT_URL : env.PUBLIC_HASURA_SERVER_URL;

  const headers: HeadersInit = {
    Authorization: `Bearer ${user.token}`,
    'Content-Type': 'application/json',
  };
  const options: RequestInit = {
    body: JSON.stringify({ query, variables }),
    headers,
    method: 'POST',
    signal,
  };

  const response: Response = await fetch(HASURA_URL, options);
  const json = await response.json();

  if (!response.ok) {
    console.log(response);
    console.log(json);
    throw new Error(response.statusText);
  }

  if (json?.errors && json.errors.length) {
    console.log(response);
    console.log(json);

    const defaultError = 'An unexpected error occurred';
    const [error] = json.errors;
    const code = error?.extensions?.code;

    if (code === 'unexpected') {
      // This is often thrown when a Postgres exception is raised for a Hasura query.
      // @see https://github.com/hasura/graphql-engine/issues/3658
      throw new Error(error?.extensions?.internal?.error?.message ?? error?.message ?? defaultError);
    } else if (code === 'parse-failed') {
      if (error?.extensions?.internal?.response?.body?.errors?.length) {
        const errorMessage = error?.extensions?.internal?.response?.body?.errors[0];
        throw new Error(errorMessage ?? defaultError);
      }
    } else if (code === INVALID_JWT) {
      // awaiting here only works if SSR is disabled
      // This should never be triggered in the OIDC case, because we have refreshes.
      console.log('Oh no...Here (while authenticating)');
      logout(error?.message);
    }

    throw new Error(`while authenticating ${error?.message ?? defaultError}`);
  }

  const { data } = json;
  return data;
}

/**
 * Function to make HTTP POST requests to the Hasura GraphQL API.
 */
export async function reqHasura<T = any>(
  query: string,
  variables: QueryVariables = {},
  _: BaseUser | User | null, // TODO: phase this parameter out, like with subscribable. the store should never not be set if using this
  signal?: AbortSignal,
): Promise<Record<string, T | null>> {
  const HASURA_URL = browser ? env.PUBLIC_HASURA_CLIENT_URL : env.PUBLIC_HASURA_SERVER_URL;

  const realUser = get(userStore);
  if (!realUser) {
    console.log('In reqHasura, and userStore is null', query, variables);
    // TODO: throw?
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${realUser?.token ?? ''}`,
    'Content-Type': 'application/json',
    'x-hasura-role': realUser?.activeRole ?? '',
    'x-hasura-user-id': realUser?.id ?? '',
  };
  const options: RequestInit = {
    body: JSON.stringify({ query, variables }),
    headers,
    method: 'POST',
    signal,
  };

  const response: Response = await fetch(HASURA_URL, options);
  const json = await response.json();

  if (!response.ok) {
    console.log(response);
    console.log(json);
    throw new Error(response.statusText);
  }

  if (json?.errors && json.errors.length) {
    console.log(response);
    console.log(json);

    const defaultError = 'An unexpected error occurred';
    const [error] = json.errors;
    const code = error?.extensions?.code;

    if (code === 'unexpected') {
      // This is often thrown when a Postgres exception is raised for a Hasura query.
      // @see https://github.com/hasura/graphql-engine/issues/3658
      throw new Error(error?.extensions?.internal?.error?.message ?? error?.message ?? defaultError);
    } else if (code === 'parse-failed') {
      if (error?.extensions?.internal?.response?.body?.errors?.length) {
        const errorMessage = error?.extensions?.internal?.response?.body?.errors[0];
        throw new Error(errorMessage ?? defaultError);
      }
    } else if (code === INVALID_JWT) {
      // awaiting here only works if SSR is disabled
      // This should never be triggered in the OIDC case, because we have refreshes.
      console.log('Oh god...Here');
      logout(error?.message); // TODO: calling logout like this invokes a goto, which is flawed because if a request fails to load in a +page.ts, this will be invoked and a goto will be called from the server. NEED AN ALTERNATIVE FOR SERVER-LED LOGOUTS, OR NEED TO CHANGE THE GOTO TO SOMETHING NEUTRAL...
    }

    throw new Error(error?.message ?? defaultError);
  }

  const { data } = json;
  return data;
}
