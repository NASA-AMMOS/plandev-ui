import type { User, UserId } from './app';
import type { Plan } from './plan';

export type AssetWithOwner<T = any> = Partial<T> & {
  owner: UserId;
};

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

export type ReadPermissionCheck<T = AssetWithOwner> = (user: User | null, asset?: T) => boolean;

export type CreatePermissionCheck = (user: User | null) => boolean;

export type UpdatePermissionCheck<T = AssetWithOwner> = (user: User | null, asset: T) => boolean;

export type PlanAssetReadPermissionCheck = (user: User | null) => boolean;

export type PlanAssetCreatePermissionCheck = (user: User | null, plan: PlanWithOwners) => boolean;

export type PlanAssetUpdatePermissionCheck<T = AssetWithOwner> = (
  user: User | null,
  plan: PlanWithOwners,
  asset?: T,
) => boolean;

export type PlanWithOwners = Pick<Plan, 'id' | 'owner' | 'collaborators'>;
