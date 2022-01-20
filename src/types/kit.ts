import type { RequestEvent, ResolveOpts } from '@sveltejs/kit';
import type { MaybePromise } from '@sveltejs/kit/types/helper';
import type { Session } from '../types';

export type Fetch = (
  info: RequestInfo,
  init?: RequestInit,
) => Promise<Response>;

export type HandleInput = {
  event: RequestEvent<Session>;
  resolve(
    event: RequestEvent<Session>,
    opts?: ResolveOpts,
  ): MaybePromise<Response>;
};
