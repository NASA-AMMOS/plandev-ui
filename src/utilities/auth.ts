import { env } from '$env/dynamic/public';
import { jwtDecode } from 'jwt-decode';
import type { BaseUser, User } from '../types/app';
import effects from './effects';

/**
 * JWT claim path configuration (client-side).
 * Must match the server-side CLAIMS_CONFIG in oidc.ts.
 *
 * Uses PUBLIC_ prefixed env vars for client accessibility.
 * Falls back to Hasura's standard claim namespace.
 */
const CLAIMS_CONFIG = {
  namespace: env.PUBLIC_OIDC_CLAIMS_NAMESPACE || 'https://hasura.io/jwt/claims',
  userId: env.PUBLIC_OIDC_CLAIMS_USER_ID || 'x-hasura-user-id',
  allowedRoles: env.PUBLIC_OIDC_CLAIMS_ALLOWED_ROLES || 'x-hasura-allowed-roles',
  defaultRole: env.PUBLIC_OIDC_CLAIMS_DEFAULT_ROLE || 'x-hasura-default-role',
};

/**
 * Extract claims from a decoded JWT token using the configured claim paths.
 */
function extractClaims(token: Record<string, unknown>): {
  userId: string;
  allowedRoles: string[];
  defaultRole: string;
} {
  const namespace = token[CLAIMS_CONFIG.namespace] as Record<string, unknown> | undefined;
  if (!namespace || typeof namespace !== 'object') {
    throw new Error(`JWT missing claims namespace: ${CLAIMS_CONFIG.namespace}`);
  }

  const userId = namespace[CLAIMS_CONFIG.userId] as string;
  const allowedRoles = namespace[CLAIMS_CONFIG.allowedRoles] as string[];
  const defaultRole = namespace[CLAIMS_CONFIG.defaultRole] as string;

  if (!userId || typeof userId !== 'string') {
    throw new Error(`JWT missing or invalid user ID claim: ${CLAIMS_CONFIG.namespace}.${CLAIMS_CONFIG.userId}`);
  }
  if (!Array.isArray(allowedRoles)) {
    throw new Error(
      `JWT missing or invalid allowed roles claim: ${CLAIMS_CONFIG.namespace}.${CLAIMS_CONFIG.allowedRoles}`,
    );
  }
  if (!defaultRole || typeof defaultRole !== 'string') {
    throw new Error(`JWT missing or invalid default role claim: ${CLAIMS_CONFIG.namespace}.${CLAIMS_CONFIG.defaultRole}`);
  }

  return { userId, allowedRoles, defaultRole };
}

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

  const decodedToken = jwtDecode(baseUser.token) as Record<string, unknown>;
  const claims = extractClaims(decodedToken);

  if (baseUser.id === null && env.PUBLIC_AUTH_OIDC_ENABLED === 'true') {
    // Use the configured user ID claim, which should match Hasura's expected x-hasura-user-id
    baseUser.id = claims.userId;
  }

  const { allowedRoles, defaultRole } = claims;

  const user: User = {
    ...baseUser,
    activeRole: activeRole && allowedRoles.includes(activeRole) ? activeRole : defaultRole,
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
