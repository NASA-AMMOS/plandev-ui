import type { Handle } from '@sveltejs/kit';
import { parse } from 'cookie';
import jwtDecode from 'jwt-decode';
import type { BaseUser, ParsedUserToken, User } from './types/app';
import effects from './utilities/effects';
import { isLoginEnabled } from './utilities/login';
import { ADMIN_ROLE } from './utilities/permissions';

export const handle: Handle = async ({ event, resolve }) => {
  if (!isLoginEnabled()) {
    const permissibleQueries = await effects.getUserQueries(null);
    const rolePermissions = await effects.getRolePermissions(null);
    event.locals.user = {
      activeRole: ADMIN_ROLE,
      allowedRoles: [ADMIN_ROLE],
      defaultRole: ADMIN_ROLE,
      id: 'unknown',
      permissibleQueries,
      rolePermissions,
      token: '',
    };
  } else {
    const cookieHeader = event.request.headers.get('cookie') ?? '';
    const cookies = parse(cookieHeader);
    const { activeRole: activeRoleCookie = null, user: userCookie = null } = cookies;

    if (userCookie) {
      const userBuffer = Buffer.from(userCookie, 'base64');
      const userStr = userBuffer.toString('utf-8');
      const baseUser: BaseUser = JSON.parse(userStr);
      const { success } = await effects.session(baseUser);
      const decodedToken: ParsedUserToken = jwtDecode(baseUser.token);

      if (success) {
        const allowedRoles = decodedToken['https://hasura.io/jwt/claims']['x-hasura-allowed-roles'];
        const defaultRole = decodedToken['https://hasura.io/jwt/claims']['x-hasura-default-role'];
        const activeRole = activeRoleCookie ?? defaultRole;
        const user: User = {
          ...baseUser,
          activeRole,
          allowedRoles,
          defaultRole,
          permissibleQueries: null,
          rolePermissions: null,
        };
        const permissibleQueries = await effects.getUserQueries(user);

        const rolePermissions = await effects.getRolePermissions(user);
        event.locals.user = {
          ...user,
          permissibleQueries,
          rolePermissions,
        };
      } else {
        event.locals.user = null;
      }
    } else {
      event.locals.user = null;
    }
  }

  return await resolve(event);
};
