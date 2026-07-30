import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import type { BaseUser, User } from '../types/app';
import type { ConsoleEntry, LogMessage } from '../types/console';
import type { ExtensionPayload, ExtensionResponse } from '../types/extension';
import type { QueryVariables } from '../types/subscribable';
import { logout } from '../utilities/login';
import { INVALID_JWT } from '../utilities/permissions';
import { ErrorTypes } from './errors';

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

export async function reqActionServer<T = any>(
  url: string,
  method: string,
  body: any | null,
  user: BaseUser | User | null,
  signal?: AbortSignal,
): Promise<T> {
  const ACTION_SERVER_URL = env.PUBLIC_ACTION_CLIENT_URL;

  const headers: HeadersInit = {
    Authorization: `Bearer ${user?.token ?? ''}`,
    'x-hasura-role': (user as User)?.activeRole ?? '',
    ...{ 'Content-Type': 'application/json' },
  };

  const options: RequestInit = {
    credentials: env.PUBLIC_ACTION_INCLUDE_CREDENTIALS === 'true' ? 'include' : 'omit',
    headers,
    method,
    signal,
  };

  if (body !== null) {
    options.body = body;
  }

  const response = await fetch(`${ACTION_SERVER_URL}${url}`, options);

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
  asBlob: boolean = false,
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

  if (asBlob) {
    return (await response.blob()) as T;
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

/**
 * Custom error thrown for a Hasura request that stores an array of type LogMessage
 */
export class CompoundError extends Error {
  errors: LogMessage[];
  name: string;

  constructor(message: string, error: LogMessage | LogMessage[]) {
    super(message);
    this.name = 'CompoundError';
    this.errors = Array.isArray(error) ? error : [error];
  }
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
  const defaultError: LogMessage = {
    cause: '',
    level: 'error',
    message: '',
    timestamp: new Date().toISOString(),
    type: ErrorTypes.CAUGHT_ERROR,
  };

  if (!response.ok) {
    console.log(response);
    console.log(json);
    throw new CompoundError(response.statusText, [{ ...defaultError }]);
  }
  const errors: LogMessage[] = [];
  if (json?.errors && json.errors.length) {
    console.log(response);
    console.log(json);

    const defaultErrorMessage = 'An unexpected error occurred';
    json.errors.forEach((error: any) => {
      const extensions:
        | (Omit<ConsoleEntry, 'message' | 'type'> & { code?: string; internal?: any; type?: string })
        | undefined = error?.extensions;

      const { data, service, timestamp, trace, cause, code, type } = extensions ?? {};
      const baseErrorFields = { data, service, timestamp: timestamp ?? defaultError.timestamp, trace };

      const errorMessage = extensions?.internal?.error?.message ?? error?.message ?? defaultErrorMessage;

      if (code === 'unexpected' || code === 'postgres-error') {
        // This is often thrown when a Postgres exception is raised for a Hasura query.
        // @see https://github.com/hasura/graphql-engine/issues/3658
        errors.push({ ...defaultError, message: errorMessage });
      } else if (code === 'parse-failed') {
        if (extensions?.internal?.response?.body?.errors?.length) {
          const parseFailedErrorMessages = extensions?.internal?.response?.body?.errors;
          if (parseFailedErrorMessages && parseFailedErrorMessages.length > 0) {
            parseFailedErrorMessages.forEach((message: any) => {
              errors.push({
                ...defaultError,
                ...baseErrorFields,
                cause,
                message: `${message}`,
              });
            });
          } else {
            errors.push({
              ...defaultError,
              ...baseErrorFields,
              cause,
              message: defaultErrorMessage,
            });
          }
        }
      } else if (code === INVALID_JWT) {
        // awaiting here only works if SSR is disabled
        logout(error?.message);
      } else {
        errors.push({
          ...defaultError,
          ...baseErrorFields,
          cause,
          message: error?.message ?? defaultErrorMessage,
          type: (type as ErrorTypes) ?? ErrorTypes.CAUGHT_ERROR,
        });
      }
    });
  }

  if (errors.length) {
    const message = errors.length === 1 ? errors[0].message : 'Multiple errors occurred';
    throw new CompoundError(message, errors);
  }

  const { data } = json;
  return data;
}

// Workspace endpoints respond with a raw FormattedError JSON body on non-OK responses
// (USE_HASURA_FORMATTING=false in WorkspaceBindings — no Hasura `extensions` wrapper).
// Wraps it as a CompoundError so callers' `catchError(...)` dispatches via the typed-ConsoleEntry
// branch and the rich metadata (type, service, data, trace) reaches the Console.
async function throwWorkspaceError(response: Response): Promise<never> {
  let body: any = null;
  try {
    body = await response.json();
  } catch {
    // Body wasn't JSON (e.g. proxy HTML, empty body).
  }
  if (body && typeof body === 'object' && typeof body.message === 'string' && typeof body.type === 'string') {
    throw new CompoundError(body.message, [
      {
        ...body,
        level: 'error',
        timestamp: typeof body.timestamp === 'string' ? body.timestamp : new Date().toISOString(),
      },
    ]);
  }
  // todo: improve this fallback case, add more error details even if body is missing/wrong format
  throw new Error(response.statusText);
}

/**
 * Function to make HTTP POST requests to the Workspace Service.
 */
export async function reqWorkspace<T = any>(
  url: string,
  method: string,
  body: any | null,
  user: BaseUser | User | null,
  signal?: AbortSignal,
  asJson: boolean = true,
  asBlob: boolean = false,
  headerOverrides: HeadersInit = {},
): Promise<T> {
  const WORKSPACE_URL = env.PUBLIC_WORKSPACE_CLIENT_URL;

  const headers: HeadersInit = {
    Authorization: `Bearer ${user?.token ?? ''}`,
    'x-hasura-role': (user as User)?.activeRole ?? '',
    'x-hasura-user-id': user?.id ?? '',
    ...headerOverrides,
  };
  const options: RequestInit = {
    headers,
    method,
    signal,
  };

  if (body !== null) {
    options.body = body;
  }

  const response = await fetch(`${WORKSPACE_URL}/ws/${url}`, options);

  if (!response.ok) {
    await throwWorkspaceError(response);
  }

  if (asBlob) {
    return (await response.blob()) as T;
  }

  if (asJson) {
    return await response.json();
  }

  return (await response.text()) as T;
}

/** Why a workspace save was rejected: the file changed, or it was deleted/moved. */
export type WorkspaceSaveConflictReason = 'conflict' | 'deleted';

/**
 * Thrown on a `412` save rejection (the file changed underneath since it was opened).
 * Carries the who/when fields from the response body for the conflict modal.
 */
export class WorkspaceSaveConflictError extends Error {
  currentETag: string | null;
  lastEditedAt?: string;
  lastEditedBy?: string;
  name: string;
  reason: WorkspaceSaveConflictReason;

  constructor(
    data: {
      currentETag: string | null;
      lastEditedAt?: string;
      lastEditedBy?: string;
      reason: WorkspaceSaveConflictReason;
    },
    message?: string,
  ) {
    super(message ?? 'The file was changed by someone else since you opened it.');
    this.currentETag = data.currentETag;
    this.lastEditedAt = data.lastEditedAt;
    this.lastEditedBy = data.lastEditedBy;
    this.name = 'WorkspaceSaveConflictError';
    this.reason = data.reason;
  }
}

/** A workspace response plus its `ETag` and HTTP status. */
export interface WorkspaceResponseWithEtag<T> {
  data: T;
  etag: string | null;
  status: number;
}

/**
 * Like {@link reqWorkspace}, but returns the response `ETag` + status and, on `412`,
 * throws a typed {@link WorkspaceSaveConflictError}. Used for the editor's file GET/save
 * so the save etag can be threaded through; `reqWorkspace` is left unchanged.
 */
export async function reqWorkspaceWithEtag<T = any>(
  url: string,
  method: string,
  body: any | null,
  user: BaseUser | User | null,
  signal?: AbortSignal,
  asJson: boolean = false,
  headerOverrides: HeadersInit = {},
): Promise<WorkspaceResponseWithEtag<T>> {
  const WORKSPACE_URL = env.PUBLIC_WORKSPACE_CLIENT_URL;

  const headers: HeadersInit = {
    Authorization: `Bearer ${user?.token ?? ''}`,
    'x-hasura-role': (user as User)?.activeRole ?? '',
    'x-hasura-user-id': user?.id ?? '',
    ...headerOverrides,
  };
  const options: RequestInit = {
    headers,
    method,
    signal,
  };

  if (body !== null) {
    options.body = body;
  }

  const response = await fetch(`${WORKSPACE_URL}/ws/${url}`, options);
  // Null unless the server exposes ETag via CORS; protection degrades gracefully if so.
  const etag = response.headers.get('ETag');

  if (response.status === 412) {
    // save was rejected specifically because the etag didn't match - ie. the file has changed since last save
    // throw a WorkspaceSaveConflictError (instead of usual CompoundError) so we can catch it and show modal
    let parsed: { data?: Record<string, any>; message?: string } | null = null;
    try {
      parsed = await response.json();
    } catch {
      // Body wasn't valid JSON — fall back to the defaults below.
    }
    const conflictData = parsed?.data ?? {};
    throw new WorkspaceSaveConflictError(
      {
        currentETag: conflictData.currentETag ?? null,
        lastEditedAt: conflictData.lastEditedAt,
        lastEditedBy: conflictData.lastEditedBy,
        reason: conflictData.reason === 'deleted' ? 'deleted' : 'conflict',
      },
      parsed?.message,
    );
  }

  if (!response.ok) {
    // wrap response details in a CompoundError and throw it so it can be properly logged
    await throwWorkspaceError(response);
  }

  const data = (asJson ? await response.json() : await response.text()) as T;

  return { data, etag, status: response.status };
}

export async function reqWorkspaceMetadata<T = any>(
  url: string,
  method: string,
  body: any | null,
  user: BaseUser | User | null,
  signal?: AbortSignal,
  asJson: boolean = true,
): Promise<T> {
  const WORKSPACE_URL = env.PUBLIC_WORKSPACE_CLIENT_URL;

  const headers: HeadersInit = {
    Authorization: `Bearer ${user?.token ?? ''}`,
    'Content-Type': 'application/json',
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

  const postSearchParameters = method.toLowerCase() === 'post' ? '?mergeBehavior=overwrite' : '';
  const response = await fetch(`${WORKSPACE_URL}/metadata/${url}${postSearchParameters}`, options);

  if (!response.ok) {
    await throwWorkspaceError(response);
  }

  if (asJson) {
    return await response.json();
  }

  return (await response.text()) as T;
}
