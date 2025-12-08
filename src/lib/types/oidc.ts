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
