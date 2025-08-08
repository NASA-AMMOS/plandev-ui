import { env } from '$env/dynamic/public';
import { jwtDecode } from 'jwt-decode';
import type { BaseUser, ParsedUserToken, User } from '../types/app';
import effects from './effects';

export async function computeRolesFromCookies(
  userCookie: string | null,
  activeRoleCookie: string | null,
): Promise<User | null> {
  const userBuffer = Buffer.from(userCookie ?? '', 'base64');
  const userStr = userBuffer.toString('utf-8');

  try {
    const baseUser: BaseUser = JSON.parse(userStr);
    return computeRolesFromJWT(baseUser, activeRoleCookie);
  } catch (err) {
    console.error(err);
    return null;
  }
}

/**
 * Consult Aerie Gateway to obtain fine grained permissions;
 */
export async function computeRolesFromJWT(baseUser: BaseUser, activeRole: string | null): Promise<User | null> {
  const { success, message } = await effects.session(baseUser);
  if (!success) {
    console.error(
      `Could not verify token and retrieve roles in Aerie-Gateway using the given JWT access token: ${message}`,
    );
    if (env.PUBLIC_AUTH_OIDC_ENABLED === 'true') {
      console.error(
        `OIDC is enabled, please ensure Aerie-Gateway's "HASURA_GRAPHQL_JWT_SECRET" environment variable specifies the same jwks_url as Aerie UI.`,
      );
    }

    return null; // expect to return in non-oidc case
  }

  const decodedToken: ParsedUserToken = jwtDecode(baseUser.token);

  if (baseUser.id === null && env.PUBLIC_AUTH_OIDC_ENABLED === 'true') {
    // since our scope is always one that includes email, and that's also a unique id, we can use that
    //    BUT sub is the one that matches hasura's expected x-hasura-user-id, which is important.
    baseUser.id = decodedToken.sub;
  }

  const allowedRoles = decodedToken['https://hasura.io/jwt/claims']['x-hasura-allowed-roles'];
  const defaultRole = decodedToken['https://hasura.io/jwt/claims']['x-hasura-default-role'];

  const user: User = {
    ...baseUser,
    activeRole: activeRole && allowedRoles.includes(activeRole) ? activeRole : defaultRole, // check to make sure whatever was passed in as activeRole if not null is still in allowedRoles
    allowedRoles,
    defaultRole,
    permissibleQueries: null,
    rolePermissions: null,
  };
  const permissibleQueries = await effects.getUserQueries(user);
  const rolePermissions = await effects.getRolePermissions(user);
  return {
    ...user,
    permissibleQueries,
    rolePermissions,
  };
}

export function goToLogin() {
  if (env.PUBLIC_AUTH_OIDC_ENABLED === 'true') {
    document.location.href = '/oidc/login';
  } else {
    document.location.href = '/login';
  }
}
