import type { User } from './app';
import type { Plan } from './plan';

export type PermissibleQueriesMap = Record<string, true>;

export type PermissibleQueryResponse = {
  // mutationType is for the queries that directly mutate the db
  mutationType: {
    fields: PermissibleQuery[];
  };
  // queryType is for the queries that just read from the db
  queryType: {
    fields: PermissibleQuery[];
  };
};

export type PermissibleQuery = {
  name: string;
};

export type PermissionCheck<T = null> = ReadPermissionCheck<T> | CreatePermissionCheck | UpdatePermissionCheck<T>;

export type ReadPermissionCheck<T = null> = (user: User, asset?: T) => boolean;

export type CreatePermissionCheck = (user: User) => boolean;

export type UpdatePermissionCheck<T = null> = (user: User, asset: T) => boolean;

export type PlanAssetPermissionCheck<T = null> =
  | PlanAssetReadPermissionCheck
  | PlanAssetCreatePermissionCheck
  | PlanAssetUpdatePermissionCheck<T>;

export type PlanAssetReadPermissionCheck = (user: User) => boolean;

export type PlanAssetCreatePermissionCheck = (user: User, plan: PlanWithOwners) => boolean;

export type PlanAssetUpdatePermissionCheck<T = null> = (user: User, plan: PlanWithOwners, asset?: T) => boolean;

export type PlanWithOwners = Pick<Plan, 'id' | 'owner' | 'collaborators'>;
