import type { JwtPayload, VerifyOptions } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';

// 'auto' means refresh happens only in the Refresh component,
//      but 'always' means refresh on all reloads as well.
export type RefreshOpts = 'auto' | 'always';
export type AuthorizeOpts = { refresh: RefreshOpts };

export type MaybeToken = JwtPayload | undefined | null;

type HasuraToken = JwtPayload & {
  'https://hasura.io/jwt/claims': {
    'x-hasura-allowed-roles': string[];
    'x-hasura-default-role': string;
    'x-hasura-user-id': string;
  };
};

export type MaybeHasuraToken = HasuraToken | undefined | null;

export type Rule = (token?: MaybeHasuraToken) => boolean;

export type JwtSecret = {
  // either key or jwk_url
  jwksUri?: string;
  key?: string;
  type: string;
};

export type VerifierFunction = (
  accessToken: string,
  options: VerifyOptions,
) => Promise<string | jwt.Jwt | jwt.JwtPayload>;
