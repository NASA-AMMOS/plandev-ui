import type { JwtPayload } from 'jsonwebtoken';
import type { User } from '../../types/app';

export type MaybeToken = JwtPayload | undefined | null;

export type HasuraToken = JwtPayload & {
  'https://hasura.io/jwt/claims': {
    'x-hasura-allowed-roles': string[];
    'x-hasura-default-role': string;
    'x-hasura-user-id': string;
  };
};

export type Rule = (user: User | null) => boolean;

export type ClaimsConfig = {
  allowedRoles: string;
  defaultRole: string;
  namespace: string;
  userId: string;
};

export type ExtractedClaims = {
  allowedRoles: string[];
  defaultRole: string;
  userId: string;
};

/**
 * Extract the three Hasura claims from a decoded JWT payload, using the
 * configured claim paths. Pure function — no env imports, no jsonwebtoken
 * runtime dependency. Server and client both supply their own ClaimsConfig.
 */
export function extractClaims(token: Record<string, unknown>, config: ClaimsConfig): ExtractedClaims {
  const namespace = token[config.namespace];
  if (!namespace || typeof namespace !== 'object') {
    throw new Error(`JWT missing claims namespace: ${config.namespace}`);
  }
  const ns = namespace as Record<string, unknown>;
  const userId = ns[config.userId];
  const allowedRoles = ns[config.allowedRoles];
  const defaultRole = ns[config.defaultRole];

  if (!userId || typeof userId !== 'string') {
    throw new Error(`JWT missing or invalid user ID claim: ${config.namespace}.${config.userId}`);
  }
  if (!Array.isArray(allowedRoles)) {
    throw new Error(`JWT missing or invalid allowed roles claim: ${config.namespace}.${config.allowedRoles}`);
  }
  if (!defaultRole || typeof defaultRole !== 'string') {
    throw new Error(`JWT missing or invalid default role claim: ${config.namespace}.${config.defaultRole}`);
  }

  return { allowedRoles, defaultRole, userId };
}
