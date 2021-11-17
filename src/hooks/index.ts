import type { Request } from '@sveltejs/kit';
import type { MaybePromise } from '@sveltejs/kit/types/helper';
import type { ServerRequest, ServerResponse } from '@sveltejs/kit/types/hooks';
import { parse } from 'cookie';
import { get } from 'svelte/store';
import { env as envStore } from '../stores/app';
import type { Env, User } from '../types';
import { reqSession } from '../utilities/requests';

type HandleInput = {
  request: ServerRequest<Record<string, any>>;
  resolve: (
    request: ServerRequest<Record<string, any>>,
  ) => MaybePromise<ServerResponse>;
};

type Session = {
  user: User | null;
};

export async function handle({
  request,
  resolve,
}: HandleInput): Promise<ServerResponse> {
  const { AUTH_TYPE } = get<Env>(envStore);

  if (AUTH_TYPE === 'none') {
    request.locals.user = { id: 'unknown', ssoToken: 'unknown' };
  } else {
    const cookies = parse(request.headers.cookie || '');
    const { user: userCookie = null } = cookies;

    if (userCookie) {
      const userBuffer = Buffer.from(userCookie, 'base64');
      const userStr = userBuffer.toString('utf-8');
      const user: User = JSON.parse(userStr);

      const { success } = await reqSession(user.ssoToken);

      if (success) {
        request.locals.user = user;
      } else {
        request.locals.user = null;
      }
    } else {
      request.locals.user = null;
    }
  }

  return await resolve(request);
}

export function getSession(
  request: Request<Record<string, any>>,
): MaybePromise<Session> {
  const { locals } = request;
  const { user = null } = locals;
  return {
    user,
  };
}
