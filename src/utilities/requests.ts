import { browser } from '$app/env';
import { env } from '$env/dynamic/public';
import { get } from 'svelte/store';
import { user as userStore } from '../stores/app';

/**
 * Function to make HTTP requests to the Aerie Gateway.
 */
export async function reqGateway<T = any>(
  url: string,
  method: string,
  body: any | null,
  ssoToken: string | null,
  excludeContentType: boolean,
): Promise<T> {
  const GATEWAY_URL = browser ? env.GATEWAY_CLIENT_URL : env.GATEWAY_SERVER_URL;
  const user = get<User | null>(userStore);

  const options: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      'x-auth-sso-token': user?.ssoToken ?? '',
    },
    method,
  };

  if (body !== null) {
    options.body = body;
  }

  if (ssoToken !== null) {
    options.headers['x-auth-sso-token'] = ssoToken;
  }

  if (excludeContentType === true) {
    delete options.headers['Content-Type'];
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
export async function reqHasura<T = any>(query: string, variables: QueryVariables = {}): Promise<Record<string, T>> {
  const HASURA_URL = browser ? env.HASURA_CLIENT_URL : env.HASURA_SERVER_URL;
  const user = get<User | null>(userStore);

  const options: RequestInit = {
    body: JSON.stringify({ query, variables }),
    headers: {
      'Content-Type': 'application/json',
      'x-auth-sso-token': user?.ssoToken ?? '',
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

  if (json?.errors && json.errors.length) {
    console.log(response);
    console.log(json);

    const defaultError = 'An unexpected error occurred';
    const [error] = json.errors;
    const code = error?.extensions?.code;

    if (code === 'unexpected') {
      // This is often thrown when a Postgres exception is raised for a Hasura query.
      // @see https://github.com/hasura/graphql-engine/issues/3658
      throw new Error(error?.extensions?.internal?.error?.message ?? defaultError);
    } else {
      throw new Error(error?.message ?? defaultError);
    }
  }

  const { data } = json;
  return data;
}
