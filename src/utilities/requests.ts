import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
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
): Promise<T> {
  const GATEWAY_URL = browser ? env.PUBLIC_GATEWAY_CLIENT_URL : env.PUBLIC_GATEWAY_SERVER_URL;

  const headers: HeadersInit = {
    Authorization: `Bearer ${user?.token ?? ''}`,
    ...(excludeContentType ? {} : { 'Content-Type': 'application/json' }),
  };
  const options: RequestInit = {
    headers,
    method,
  };

  if (body !== null) {
    options.body = body;
  }

  const response = await fetch(`${GATEWAY_URL}${url}`, options);

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const data = await response.json();

  return data;
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

/**
 * Function to make HTTP POST requests to the Hasura GraphQL API.
 */
export async function reqHasura<T = any>(
  query: string,
  variables: QueryVariables = {},
  user: BaseUser | User | null,
  signal?: AbortSignal,
): Promise<Record<string, T | null>> {
  const HASURA_URL = browser ? env.PUBLIC_HASURA_CLIENT_URL : env.PUBLIC_HASURA_SERVER_URL;

  const headers: HeadersInit = {
    Authorization: `Bearer ${user?.token ?? ''}`,
    'Content-Type': 'application/json',
    'x-hasura-role': (user as User)?.activeRole ?? '',
    'x-hasura-user-id': user?.id ?? '',
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
      logout(error?.message);
    }

    throw new Error(error?.message ?? defaultError);
  }

  const { data } = json;
  return data;
}
