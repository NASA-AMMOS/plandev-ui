import type { Handle, RequestEvent } from '@sveltejs/kit';
import type { MaybePromise } from '@sveltejs/kit/types/helper';
import { parse } from 'cookie';
import { get } from 'svelte/store';
import { env as envStore } from '../stores/app';
import { reqSession } from '../utilities/requests';

export const handle: Handle = async ({ event, resolve }): Promise<Response> => {
  const { AUTH_TYPE } = get<Env>(envStore);

  if (AUTH_TYPE === 'none') {
    event.locals.user = { id: 'unknown', ssoToken: 'unknown' };
  } else {
    const cookies = parse(event.request.headers.get('cookie') || '');
    const { user: userCookie = null } = cookies;

    if (userCookie) {
      const userBuffer = Buffer.from(userCookie, 'base64');
      const userStr = userBuffer.toString('utf-8');
      const user: User = JSON.parse(userStr);

      const { success } = await reqSession(user.ssoToken);

      if (success) {
        event.locals.user = user;
      } else {
        event.locals.user = null;
      }
    } else {
      event.locals.user = null;
    }
  }

  return await resolve(event);
};

export const getSession = (event: RequestEvent): MaybePromise<App.Session> => {
  const { locals } = event;
  const { user = null } = locals;
  return {
    user,
  };
};
