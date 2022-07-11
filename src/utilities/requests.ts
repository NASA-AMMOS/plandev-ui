import { browser } from '$app/env';
import { get } from 'svelte/store';
import { env as envStore, user as userStore } from '../stores/app';

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
  const { GATEWAY_CLIENT_URL, GATEWAY_SERVER_URL } = get<Env>(envStore);
  const GATEWAY_URL = browser ? GATEWAY_CLIENT_URL : GATEWAY_SERVER_URL;
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
  const { HASURA_CLIENT_URL, HASURA_SERVER_URL } = get<Env>(envStore);
  const HASURA_URL = browser ? HASURA_CLIENT_URL : HASURA_SERVER_URL;
  const user = get<User | null>(userStore);

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
