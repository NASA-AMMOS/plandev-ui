import { env } from '$env/dynamic/public';
import { type Cookies } from '@sveltejs/kit';
import { OAuth2Tokens } from 'arctic';
import { jwtDecode } from 'jwt-decode';
import { insertUser } from '../lib/client/oidc';
import { verify } from '../lib/server/oidc';
import { userStore } from '../lib/stores/auth';
import type { HasuraToken } from '../lib/types/oidc';
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
    console.log(`Could not retrieve roles using the given JWT access token: ${message}`);
    return null;
  }

  const decodedToken: ParsedUserToken = jwtDecode(baseUser.token);

  if (baseUser.id === null && env.PUBLIC_AUTH_OIDC_ENABLED === 'true') {
    // since our scope is always one that includes email, and that's also a unique id, we can use that
    //    BUT sub is the one that matches hasura's expected x-hasura-user-id, which is important.

    // TODO: we could expand the BaseUser object to have UserId (the hasura token, which would be valid regardless of auth mechanism), UserName, and then token
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
  const permissibleQueries = await effects.getUserQueries(user); // TODO: move out of effects maybe....
  const rolePermissions = await effects.getRolePermissions(user);
  return {
    ...user,
    permissibleQueries,
    rolePermissions,
  };
}

export async function updateWithNewTokens(cookies: Cookies, tokens: OAuth2Tokens): Promise<boolean> {
  // Check token validity.
  const accessJwt = await verify(tokens.accessToken());
  const idJwt = await verify(tokens.accessToken());

  if (accessJwt && idJwt) {
    // update cookies
    cookies.set('accessToken', tokens.accessToken(), { httpOnly: false, path: '/' });
    cookies.set('idToken', tokens.idToken(), { httpOnly: false, path: '/' });
    cookies.set('refreshToken', tokens.refreshToken(), { httpOnly: true, path: '/' });

    // sort of an edge case, but if default role does change at the idp, it wouldn't hurt to update the local entry
    insertUser(accessJwt as HasuraToken, tokens.accessToken());

    // TODO: set user store
    const baseUser: BaseUser = { id: null, token: tokens.accessToken() }; // id can be null because any time this function is used, its in the context of oidc, and we specifically catch id being null for oidc in computeRolesFromJWT
    const user: User | null = await computeRolesFromJWT(baseUser, null); // null role because if after a refresh a user has been demoted, wouldn't want to retain an invalid role
    userStore.set(user ?? undefined); // TODO: fix this :/

    return true;
  }
  return false;
}
