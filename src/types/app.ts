import type { PermissibleQueriesMap } from './permissions';

export type UserId = string;

export type BaseUser = {
  id: UserId;
  token: string;
};

export type UserRole = string | 'aerie_admin';

export type User = BaseUser & {
  activeRole: UserRole;
  allowedRoles: UserRole[];
  defaultRole: UserRole;
  permissibleQueries: PermissibleQueriesMap | null;
};

export type ParsedUserToken = {
  activeRole: UserRole;
  camToken: string;
  exp: number;
  'https://hasura.io/jwt/claims': {
    'x-hasura-allowed-roles': UserRole[];
    'x-hasura-default-role': UserRole;
    'x-hasura-user-id': string;
  };
  iat: number;
  username: string;
};

export type Version = {
  branch: string;
  commit: string;
  commitUrl: string;
  date: string;
  name: string;
};
