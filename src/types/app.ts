import type { PermissibleQueriesMap } from './permissions';

export type UserId = string;

export type BaseUser = {
  id: UserId;
  token: string;
};

export type User = BaseUser & {
  allowedRoles: string[];
  defaultRole: string;
  permissibleQueries: PermissibleQueriesMap;
};

export type ParsedUserToken = {
  camToken: string;
  exp: number;
  'https://hasura.io/jwt/claims': {
    'x-hasura-allowed-roles': string[];
    'x-hasura-default-role': string;
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
