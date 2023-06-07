import type { Handle } from '@sveltejs/kit';
import { parse } from 'cookie';
import jwtDecode from 'jwt-decode';
import type { BaseUser, ParsedUserToken, User } from './types/app';
import effects from './utilities/effects';

export const handle: Handle = async ({ event, resolve }) => {
  const cookieHeader = event.request.headers.get('cookie') ?? '';
  const cookies = parse(cookieHeader);
  const { user: userCookie = null } = cookies;

  if (userCookie) {
    const userBuffer = Buffer.from(userCookie, 'base64');
    const userStr = userBuffer.toString('utf-8');
    const parsedUser: BaseUser = JSON.parse(userStr);
    const { success } = await effects.session(parsedUser.token);
    const decodedToken: ParsedUserToken = jwtDecode(parsedUser.token);

    if (success) {
      const user: User = {
        ...parsedUser,
        allowedRoles: decodedToken['https://hasura.io/jwt/claims']['x-hasura-allowed-roles'],
        defaultRole: decodedToken['https://hasura.io/jwt/claims']['x-hasura-default-role'],
      };
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
