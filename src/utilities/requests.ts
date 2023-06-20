import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import type { BaseUser, User } from '../types/app';
import type { QueryVariables } from '../types/subscribable';

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
    'Content-Type': 'application/json',
  };
  const options: RequestInit = {
    headers,
    method,
  };

  if (excludeContentType === true) {
    delete options.headers['Content-Type'];
  }

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
 * Function to make HTTP POST requests to the Hasura GraphQL API.
 */
export async function reqHasura<T = any>(
  query: string,
  variables: QueryVariables = {},
  user: BaseUser | User | null,
  signal: AbortSignal = undefined,
): Promise<Record<string, T>> {
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
    } else {
      throw new Error(error?.message ?? defaultError);
    }
  }

  const { data } = json;
  return data;
}
