import type { User, UserId, UserRole } from './app';
import type { Model } from './model';
import type { Plan } from './plan';

export type AssetWithOwner<T = any> = Partial<T> & {
  owner: UserId;
};

export type AssetWithAuthor<T = any> = Partial<T> & {
  author: UserId;
};

export type ModelWithOwner = Pick<Model, 'id' | 'owner'>;

export type PermissibleQueriesMap = Record<string, true>;

export type PermissibleQueryResponse = {
  // mutationType is for the queries that directly mutate the db
  mutationType: {
    fields: PermissibleQuery[];
  } | null;
  // queryType is for the queries that just read from the db
  queryType: {
    fields: PermissibleQuery[];
  } | null;
};

export type PermissibleQuery = {
  name: string;
};

export type PermissionCheck<T = AssetWithOwner> =
  | ReadPermissionCheck<T>
  | CreatePermissionCheck
  | UpdatePermissionCheck<T>;

export type PlanWithOwners = Pick<Plan, 'id' | 'owner' | 'collaborators' | 'model_id'>;

export type ReadPermissionCheck<T = AssetWithOwner> = (user: User | null, asset?: T) => boolean;

export type CreatePermissionCheck = (user: User | null) => boolean;

export type UpdatePermissionCheck<T = AssetWithOwner> = (user: User | null, asset: T) => boolean;

export type RolePermission =
  | 'NO_CHECK'
  | 'OWNER'
  | 'MISSION_MODEL_OWNER'
  | 'PLAN_OWNER'
  | 'PLAN_COLLABORATOR'
  | 'PLAN_OWNER_COLLABORATOR'
  | 'PLAN_OWNER_SOURCE'
  | 'PLAN_COLLABORATOR_SOURCE'
  | 'PLAN_OWNER_COLLABORATOR_SOURCE'
  | 'PLAN_OWNER_TARGET'
  | 'PLAN_COLLABORATOR_TARGET'
  | 'PLAN_OWNER_COLLABORATOR_TARGET';

export type RolePermissionResponse = {
  action_permissions: Record<string, RolePermission>;
  function_permissions: Record<string, RolePermission>;
  role: UserRole;
};

export type RolePermissionsMap = Record<string, RolePermission>;
