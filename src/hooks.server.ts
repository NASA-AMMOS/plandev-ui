import type { Handle } from '@sveltejs/kit';
import { parse } from 'cookie';
import type { User } from './types/app';
import effects from './utilities/effects';

export const handle: Handle = async ({ event, resolve }) => {
  const cookieHeader = event.request.headers.get('cookie') ?? '';
  const cookies = parse(cookieHeader);
  const { user: userCookie = null } = cookies;

  if (userCookie) {
    const userBuffer = Buffer.from(userCookie, 'base64');
    const userStr = userBuffer.toString('utf-8');
    const user: User = JSON.parse(userStr);
    const { success } = await effects.session(user.token);

    if (success) {
      const permissibleQueries = await effects.getUserQueries(user.token);
      event.locals.user = user;
      event.locals.permissibleQueries = permissibleQueries ?? {};
    } else {
      event.locals.user = null;
      event.locals.permissibleQueries = null;
    }
  } else {
    event.locals.user = null;
    event.locals.permissibleQueries = null;
  }

  return await resolve(event);
};
