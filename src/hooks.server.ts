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
      event.locals.user = user;
    } else {
      event.locals.user = null;
    }
  } else {
    event.locals.user = null;
  }

  return await resolve(event);
};
