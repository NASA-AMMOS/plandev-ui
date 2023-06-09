import { env } from '$env/dynamic/public';
import type { Handle } from '@sveltejs/kit';
import { parse } from 'cookie';
import jwtDecode from 'jwt-decode';
import type { BaseUser, ParsedUserToken, User } from './types/app';
import effects from './utilities/effects';
import { ADMIN_ROLE } from './utilities/permissions';

export const handle: Handle = async ({ event, resolve }) => {
  if (env.PUBLIC_LOGIN_PAGE === 'disabled') {
    const permissibleQueries = await effects.getUserQueries(null);
    event.locals.user = {
      allowedRoles: [ADMIN_ROLE],
      defaultRole: ADMIN_ROLE,
      id: 'unknown',
      permissibleQueries,
      token: '',
    };
  } else {
    const cookieHeader = event.request.headers.get('cookie') ?? '';
    const cookies = parse(cookieHeader);
    const { user: userCookie = null } = cookies;

    if (userCookie) {
      const userBuffer = Buffer.from(userCookie, 'base64');
      const userStr = userBuffer.toString('utf-8');
      const baseUser: BaseUser = JSON.parse(userStr);
      const { success } = await effects.session(baseUser);
      const decodedToken: ParsedUserToken = jwtDecode(baseUser.token);

      if (success) {
        const permissibleQueries = await effects.getUserQueries(baseUser);
        const user: User = {
          ...baseUser,
          allowedRoles: decodedToken['https://hasura.io/jwt/claims']['x-hasura-allowed-roles'],
          defaultRole: decodedToken['https://hasura.io/jwt/claims']['x-hasura-default-role'],
          permissibleQueries,
        };
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
