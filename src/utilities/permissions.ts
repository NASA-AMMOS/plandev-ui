import { base } from '$app/paths';
import type { ActivityDirective, ActivityPreset } from '../types/activity';
import type { User, UserId, UserRole } from '../types/app';
import type { ReqAuthResponse } from '../types/auth';
import type {
  AssetWithOwner,
  CreatePermissionCheck,
  PermissionCheck,
  PlanAssetCreatePermissionCheck,
  PlanAssetReadPermissionCheck,
  PlanAssetUpdatePermissionCheck,
  PlanWithOwners,
  ReadPermissionCheck,
  UpdatePermissionCheck,
} from '../types/permissions';
import { showFailureToast } from './toast';

export const ADMIN_ROLE = 'admin';

export const INVALID_JWT = 'invalid-jwt';
export const EXPIRED_JWT = 'JWTExpired';

function getPermission(queries: string[], user: User | null): boolean {
  if (user && user.permissibleQueries) {
    return queries.reduce((prevValue: boolean, queryName) => {
      return prevValue && !!user.permissibleQueries?.[queryName];
    }, true);
  }
  return false;
}

export function isUserAdmin(user: User | null) {
  return user?.activeRole === ADMIN_ROLE;
}

export function isUserOwner(user: User | null, thingWithOwner?: { owner: UserId } | null): boolean {
  if (thingWithOwner !== null) {
    if (thingWithOwner && user) {
      return thingWithOwner.owner === user.id;
    }
  }
  return false;
}

export function isPlanOwner(user: User | null, plan: PlanWithOwners): boolean {
  return isUserOwner(user, plan);
}

export function isPlanCollaborator(user: User | null, plan: PlanWithOwners): boolean {
  if (plan && user) {
    return !!plan.collaborators.find(({ collaborator }) => collaborator === user.id);
  }
  return false;
}

async function changeUserRole(role: UserRole): Promise<void> {
  try {
    const options = {
      body: JSON.stringify({ role }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    };
    const response = await fetch(`${base}/auth/changeRole`, options);
    const changeUserResponse: ReqAuthResponse = await response.json();
    const { message, success } = changeUserResponse;

    if (!success) {
      throw new Error(message);
    }
  } catch (e) {
    showFailureToast((e as Error).message);
  }
}

const queryPermissions = {
  APPLY_PRESET_TO_ACTIVITY: (user: User | null): boolean => {
    return getPermission(['apply_preset_to_activity'], user);
  },
  CREATE_ACTIVITY_DIRECTIVE: (user: User | null): boolean => {
    return getPermission(['insert_activity_directive_one'], user);
  },
  CREATE_ACTIVITY_DIRECTIVE_TAGS: (user: User | null): boolean => {
    return getPermission(['insert_activity_directive_tags'], user);
  },
  CREATE_ACTIVITY_PRESET: (user: User | null): boolean => {
    return getPermission(['insert_activity_presets_one'], user);
  },
  CREATE_COMMAND_DICTIONARY: (user: User | null): boolean => {
    return getPermission(['uploadDictionary'], user);
  },
  CREATE_CONSTRAINT: (user: User | null): boolean => {
    return getPermission(['insert_constraint_one'], user);
  },
  CREATE_CONSTRAINT_TAGS: (user: User | null): boolean => {
    return getPermission(['insert_constraint_tags'], user);
  },
  CREATE_EXPANSION_RULE: (user: User | null): boolean => {
    return getPermission(['insert_expansion_rule_one'], user);
  },
  CREATE_EXPANSION_RULE_TAGS: (user: User | null): boolean => {
    return getPermission(['insert_expansion_rule_tags'], user);
  },
  CREATE_EXPANSION_SEQUENCE: (user: User | null): boolean => {
    return getPermission(['insert_sequence_one'], user);
  },
  CREATE_EXPANSION_SET: (user: User | null): boolean => {
    return getPermission(['createExpansionSet'], user);
  },
  CREATE_MODEL: (user: User | null): boolean => {
    return getPermission(['insert_mission_model_one'], user);
  },
  CREATE_PLAN: (user: User | null): boolean => {
    return getPermission(['insert_plan_one'], user);
  },
  CREATE_PLAN_MERGE_REQUEST: (user: User | null): boolean => {
    return getPermission(['create_merge_request'], user);
  },
  CREATE_PLAN_TAGS: (user: User | null): boolean => {
    return getPermission(['insert_plan_tags'], user);
  },
  CREATE_SCHEDULING_CONDITION: (user: User | null): boolean => {
    return getPermission(['insert_scheduling_condition_one'], user);
  },
  CREATE_SCHEDULING_GOAL: (user: User | null): boolean => {
    return getPermission(['insert_scheduling_goal_one'], user);
  },
  CREATE_SCHEDULING_SPEC: (user: User | null): boolean => {
    return getPermission(['insert_scheduling_specification_one'], user);
  },
  CREATE_SCHEDULING_SPEC_CONDITION: (user: User | null): boolean => {
    return getPermission(['insert_scheduling_specification_conditions_one'], user);
  },
  CREATE_SCHEDULING_SPEC_GOAL: (user: User | null): boolean => {
    return getPermission(['insert_scheduling_specification_goals_one'], user);
  },
  CREATE_SIMULATION_TEMPLATE: (user: User | null): boolean => {
    return getPermission(['insert_simulation_template_one'], user);
  },
  CREATE_TAGS: (user: User | null): boolean => {
    return getPermission(['insert_tags'], user);
  },
  CREATE_USER_SEQUENCE: (user: User | null): boolean => {
    return getPermission(['insert_user_sequence_one'], user);
  },
  CREATE_VIEW: (user: User | null): boolean => {
    return getPermission(['insert_view_one'], user);
  },
  DELETE_ACTIVITY_DIRECTIVES: (user: User | null): boolean => {
    return getPermission(['delete_activity_directive'], user);
  },
  DELETE_ACTIVITY_DIRECTIVES_REANCHOR_PLAN_START: (user: User | null): boolean => {
    return getPermission(['delete_activity_by_pk_reanchor_plan_start_bulk'], user);
  },
  DELETE_ACTIVITY_DIRECTIVES_REANCHOR_TO_ANCHOR: (user: User | null): boolean => {
    return getPermission(['delete_activity_by_pk_reanchor_to_anchor_bulk'], user);
  },
  DELETE_ACTIVITY_DIRECTIVES_SUBTREE: (user: User | null): boolean => {
    return getPermission(['delete_activity_by_pk_delete_subtree_bulk'], user);
  },
  DELETE_ACTIVITY_DIRECTIVE_TAGS: (user: User | null): boolean => {
    return getPermission(['delete_activity_directive_tags'], user);
  },
  DELETE_ACTIVITY_PRESET: (user: User | null): boolean => {
    return getPermission(['delete_activity_presets_by_pk'], user);
  },
  DELETE_COMMAND_DICTIONARY: (user: User | null): boolean => {
    return getPermission(['delete_command_dictionary_by_pk'], user);
  },
  DELETE_CONSTRAINT: (user: User | null): boolean => {
    return getPermission(['delete_constraint_by_pk'], user);
  },
  DELETE_CONSTRAINT_TAGS: (user: User | null): boolean => {
    return getPermission(['delete_constraint_tags'], user);
  },
  DELETE_EXPANSION_RULE: (user: User | null): boolean => {
    return getPermission(['delete_expansion_rule_by_pk'], user);
  },
  DELETE_EXPANSION_RULE_TAGS: (user: User | null): boolean => {
    return getPermission(['delete_expansion_rule_tags'], user);
  },
  DELETE_EXPANSION_SEQUENCE: (user: User | null): boolean => {
    return getPermission(['delete_sequence_by_pk'], user);
  },
  DELETE_EXPANSION_SEQUENCE_TO_ACTIVITY: (user: User | null): boolean => {
    return getPermission(['delete_sequence_to_simulated_activity_by_pk'], user);
  },
  DELETE_EXPANSION_SET: (user: User | null): boolean => {
    return getPermission(['delete_expansion_set_by_pk'], user);
  },
  DELETE_MODEL: (user: User | null): boolean => {
    return getPermission(['delete_mission_model_by_pk'], user);
  },
  DELETE_PLAN: (user: User | null): boolean => {
    return getPermission(['delete_plan_by_pk', 'delete_scheduling_specification'], user);
  },
  DELETE_PLAN_TAGS: (user: User | null): boolean => {
    return getPermission(['delete_plan_tags'], user);
  },
  DELETE_PRESET_TO_DIRECTIVE: (user: User | null): boolean => {
    return getPermission(['delete_preset_to_directive_by_pk'], user);
  },
  DELETE_SCHEDULING_CONDITION: (user: User | null): boolean => {
    return getPermission(['delete_scheduling_condition_by_pk'], user);
  },
  DELETE_SCHEDULING_GOAL: (user: User | null): boolean => {
    return getPermission(['delete_scheduling_goal_by_pk'], user);
  },
  DELETE_SCHEDULING_SPEC_GOAL: (user: User | null): boolean => {
    return getPermission(['delete_scheduling_specification_goals_by_pk'], user);
  },
  DELETE_SIMULATION_TEMPLATE: (user: User | null): boolean => {
    return getPermission(['delete_simulation_template_by_pk'], user);
  },
  DELETE_USER_SEQUENCE: (user: User | null): boolean => {
    return getPermission(['delete_user_sequence_by_pk'], user);
  },
  DELETE_VIEW: (user: User | null): boolean => {
    return getPermission(['delete_view_by_pk'], user);
  },
  DELETE_VIEWS: (user: User | null): boolean => {
    return getPermission(['delete_view'], user);
  },
  DUPLICATE_PLAN: (user: User | null): boolean => {
    return getPermission(['duplicate_plan'], user);
  },
  EXPAND: (user: User | null): boolean => {
    return getPermission(['expandAllActivities'], user);
  },
  GET_EXPANSION_RUNS: (user: User | null): boolean => {
    return getPermission(['expansion_run'], user);
  },
  GET_PLAN: (user: User | null): boolean => {
    return getPermission(['plan_by_pk'], user);
  },
  GET_PLANS_AND_MODELS: (user: User | null): boolean => {
    return getPermission(['mission_model'], user);
  },
  INITIAL_SIMULATION_UPDATE: (user: User | null): boolean => {
    return getPermission(['update_simulation'], user);
  },
  INSERT_EXPANSION_SEQUENCE_TO_ACTIVITY: (user: User | null): boolean => {
    return getPermission(['insert_sequence_to_simulated_activity_one'], user);
  },
  PLAN_MERGE_BEGIN: (user: User | null): boolean => {
    return getPermission(['begin_merge'], user);
  },
  PLAN_MERGE_CANCEL: (user: User | null): boolean => {
    return getPermission(['cancel_merge'], user);
  },
  PLAN_MERGE_COMMIT: (user: User | null): boolean => {
    return getPermission(['commit_merge'], user);
  },
  PLAN_MERGE_DENY: (user: User | null): boolean => {
    return getPermission(['deny_merge'], user);
  },
  PLAN_MERGE_REQUEST_WITHDRAW: (user: User | null): boolean => {
    return getPermission(['withdraw_merge_request'], user);
  },
  PLAN_MERGE_RESOLVE_ALL_CONFLICTS: (user: User | null): boolean => {
    return getPermission(['set_resolution_bulk'], user);
  },
  PLAN_MERGE_RESOLVE_CONFLICT: (user: User | null): boolean => {
    return getPermission(['set_resolution'], user);
  },
  SIMULATE: (user: User | null): boolean => {
    return getPermission(['simulate'], user);
  },
  SUB_ACTIVITY_PRESETS: (user: User | null): boolean => {
    return getPermission(['activity_presets'], user);
  },
  SUB_CONSTRAINTS_ALL: (user: User | null): boolean => {
    return getPermission(['constraint'], user);
  },
  SUB_EXPANSION_RULES: (user: User | null): boolean => {
    return getPermission(['expansion_rule'], user);
  },
  SUB_EXPANSION_SETS: (user: User | null): boolean => {
    return getPermission(['expansion_set'], user);
  },
  SUB_USER_SEQUENCES: (user: User | null): boolean => {
    return getPermission(['user_sequence'], user);
  },
  UPDATE_ACTIVITY_DIRECTIVE: (user: User | null): boolean => {
    return getPermission(['update_activity_directive_by_pk'], user);
  },
  UPDATE_ACTIVITY_PRESET: (user: User | null): boolean => {
    return getPermission(['update_activity_presets_by_pk'], user);
  },
  UPDATE_CONSTRAINT: (user: User | null): boolean => {
    return getPermission(['update_constraint_by_pk'], user);
  },
  UPDATE_EXPANSION_RULE: (user: User | null): boolean => {
    return getPermission(['update_expansion_rule_by_pk'], user);
  },
  UPDATE_PLAN: (user: User | null): boolean => {
    return getPermission(['update_plan_by_pk'], user);
  },
  UPDATE_SCHEDULING_CONDITION: (user: User | null): boolean => {
    return getPermission(['update_scheduling_condition_by_pk'], user);
  },
  UPDATE_SCHEDULING_GOAL: (user: User | null): boolean => {
    return getPermission(['update_scheduling_goal_by_pk'], user);
  },
  UPDATE_SCHEDULING_SPEC: (user: User | null): boolean => {
    return getPermission(['update_scheduling_specification_by_pk'], user);
  },
  UPDATE_SCHEDULING_SPEC_CONDITION_ID: (user: User | null): boolean => {
    return getPermission(['update_scheduling_specification_conditions_by_pk'], user);
  },
  UPDATE_SCHEDULING_SPEC_GOAL: (user: User | null): boolean => {
    return getPermission(['update_scheduling_specification_goals_by_pk'], user);
  },
  UPDATE_SIMULATION: (user: User | null): boolean => {
    return getPermission(['update_simulation_by_pk'], user);
  },
  UPDATE_SIMULATION_TEMPLATE: (user: User | null): boolean => {
    return getPermission(['update_simulation_template_by_pk'], user);
  },
  UPDATE_USER_SEQUENCE: (user: User | null): boolean => {
    return getPermission(['update_user_sequence_by_pk'], user);
  },
  UPDATE_VIEW: (user: User | null): boolean => {
    return getPermission(['update_view_by_pk'], user);
  },
};

interface BaseCRUDPermission<T = null> {
  canCreate: PermissionCheck<T>;
  canDelete: PermissionCheck<T>;
  canRead: PermissionCheck<T>;
  canUpdate: PermissionCheck<T>;
}

interface CRUDPermission<T = null> extends BaseCRUDPermission<T> {
  canCreate: CreatePermissionCheck;
  canDelete: UpdatePermissionCheck<T>;
  canRead: ReadPermissionCheck<T>;
  canUpdate: UpdatePermissionCheck<T>;
}

interface PlanAssetCRUDPermission<T = null> {
  canCreate: PlanAssetCreatePermissionCheck;
  canDelete: PlanAssetUpdatePermissionCheck<T>;
  canRead: PlanAssetReadPermissionCheck;
  canUpdate: PlanAssetUpdatePermissionCheck<T>;
}

interface ExpansionSetsCRUDPermission<T = null> extends CRUDPermission<T> {
  canUpdate: () => boolean;
}

interface ExpansionSequenceCRUDPermission<T = null> extends CRUDPermission<T> {
  canExpand: (user: User | null, plan: PlanWithOwners) => boolean;
}

interface AssignablePlanAssetCRUDPermission<T = null> extends PlanAssetCRUDPermission<T> {
  canAssign: (user: User | null, plan: PlanWithOwners, asset?: T) => boolean;
}

interface FeaturePermissions {
  activityDirective: PlanAssetCRUDPermission<ActivityDirective>;
  activityPresets: AssignablePlanAssetCRUDPermission<ActivityPreset>;
  commandDictionary: CRUDPermission<void>;
  constraints: PlanAssetCRUDPermission<AssetWithOwner>;
  expansionRules: CRUDPermission<AssetWithOwner>;
  expansionSequences: ExpansionSequenceCRUDPermission<AssetWithOwner>;
  expansionSets: ExpansionSetsCRUDPermission<AssetWithOwner>;
  model: CRUDPermission<void>;
  plan: CRUDPermission<PlanWithOwners>;
  sequences: CRUDPermission<AssetWithOwner>;
}

const featurePermissions: FeaturePermissions = {
  activityDirective: {
    canCreate: (user, plan) =>
      isUserAdmin(user) ||
      ((isPlanOwner(user, plan) || isPlanCollaborator(user, plan)) && queryPermissions.CREATE_ACTIVITY_DIRECTIVE(user)),
    canDelete: (user, plan) =>
      isUserAdmin(user) ||
      ((isPlanOwner(user, plan) || isPlanCollaborator(user, plan)) &&
        queryPermissions.DELETE_ACTIVITY_DIRECTIVES(user)),
    canRead: user => isUserAdmin(user) || queryPermissions.GET_PLAN(user),
    canUpdate: (user, plan) =>
      isUserAdmin(user) ||
      ((isPlanOwner(user, plan) || isPlanCollaborator(user, plan)) && queryPermissions.UPDATE_ACTIVITY_DIRECTIVE(user)),
  },
  activityPresets: {
    canAssign: (user, plan) =>
      isUserAdmin(user) ||
      ((isPlanOwner(user, plan) || isPlanCollaborator(user, plan)) && queryPermissions.APPLY_PRESET_TO_ACTIVITY(user)),
    canCreate: user => isUserAdmin(user) || queryPermissions.CREATE_ACTIVITY_PRESET(user),
    canDelete: (user, _plan, preset) =>
      isUserAdmin(user) || (isUserOwner(user, preset) && queryPermissions.DELETE_ACTIVITY_PRESET(user)),
    canRead: user => isUserAdmin(user) || queryPermissions.SUB_ACTIVITY_PRESETS(user),
    canUpdate: (user, _plan, preset) =>
      isUserAdmin(user) || (isUserOwner(user, preset) && queryPermissions.UPDATE_ACTIVITY_PRESET(user)),
  },
  commandDictionary: {
    canCreate: user => isUserAdmin(user) || queryPermissions.CREATE_COMMAND_DICTIONARY(user),
    canDelete: user => isUserAdmin(user) || queryPermissions.DELETE_COMMAND_DICTIONARY(user),
    canRead: () => false, // Not implemented
    canUpdate: () => false, // Not implemented
  },
  constraints: {
    canCreate: (user, plan) =>
      isUserAdmin(user) ||
      ((isPlanOwner(user, plan) || isPlanCollaborator(user, plan)) && queryPermissions.CREATE_CONSTRAINT(user)),
    canDelete: (user, plan) =>
      isUserAdmin(user) ||
      ((isPlanOwner(user, plan) || isPlanCollaborator(user, plan)) && queryPermissions.DELETE_CONSTRAINT(user)),
    canRead: user => isUserAdmin(user) || queryPermissions.SUB_CONSTRAINTS_ALL(user),
    canUpdate: (user, plan) =>
      isUserAdmin(user) ||
      ((isPlanOwner(user, plan) || isPlanCollaborator(user, plan)) && queryPermissions.UPDATE_CONSTRAINT(user)),
  },
  expansionRules: {
    canCreate: user => isUserAdmin(user) || queryPermissions.CREATE_EXPANSION_RULE(user),
    canDelete: (user, expansionRule) =>
      isUserAdmin(user) || (isUserOwner(user, expansionRule) && queryPermissions.DELETE_EXPANSION_RULE(user)),
    canRead: user => isUserAdmin(user) || queryPermissions.SUB_EXPANSION_RULES(user),
    canUpdate: (user, expansionRule) =>
      isUserAdmin(user) || (isUserOwner(user, expansionRule) && queryPermissions.UPDATE_EXPANSION_RULE(user)),
  },
  expansionSequences: {
    canCreate: user => isUserAdmin(user) || queryPermissions.CREATE_EXPANSION_SEQUENCE(user),
    canDelete: user => isUserAdmin(user) || queryPermissions.DELETE_EXPANSION_SEQUENCE(user),
    canExpand: (user, plan) =>
      isUserAdmin(user) ||
      ((isPlanOwner(user, plan) || isPlanCollaborator(user, plan)) && queryPermissions.EXPAND(user)),
    canRead: user => isUserAdmin(user),
    canUpdate: () => false, // this is not a feature,
  },
  expansionSets: {
    canCreate: user => isUserAdmin(user) || queryPermissions.CREATE_EXPANSION_SET(user),
    canDelete: (user, expansionRule) =>
      isUserAdmin(user) || (isUserOwner(user, expansionRule) && queryPermissions.DELETE_EXPANSION_SET(user)),
    canRead: user => isUserAdmin(user) || queryPermissions.SUB_EXPANSION_SETS(user),
    canUpdate: () => false, // no feature to update expansion sets exists
  },
  model: {
    canCreate: user => isUserAdmin(user) || queryPermissions.CREATE_MODEL(user),
    canDelete: user => isUserAdmin(user) || queryPermissions.DELETE_MODEL(user),
    canRead: user => isUserAdmin(user) || queryPermissions.GET_PLANS_AND_MODELS(user),
    canUpdate: () => false, // no feature to update models exists
  },
  plan: {
    canCreate: user => isUserAdmin(user) || queryPermissions.CREATE_PLAN(user),
    canDelete: (user, plan) => isUserAdmin(user) || (isPlanOwner(user, plan) && queryPermissions.DELETE_PLAN(user)),
    canRead: user => isUserAdmin(user) || queryPermissions.GET_PLAN(user),
    canUpdate: (user, plan) => isUserAdmin(user) || (isPlanOwner(user, plan) && queryPermissions.UPDATE_PLAN(user)),
  },
  sequences: {
    canCreate: user => isUserAdmin(user) || queryPermissions.CREATE_USER_SEQUENCE(user),
    canDelete: (user, sequence) =>
      isUserAdmin(user) || (isUserOwner(user, sequence) && queryPermissions.DELETE_USER_SEQUENCE(user)),
    canRead: user => isUserAdmin(user) || queryPermissions.SUB_USER_SEQUENCES(user),
    canUpdate: (user, sequence) =>
      isUserAdmin(user) || (isUserOwner(user, sequence) && queryPermissions.UPDATE_USER_SEQUENCE(user)),
  },
};

function hasNoAuthorization(user: User | null) {
  return !user || (user.permissibleQueries && !Object.keys(user.permissibleQueries).length);
}

export { changeUserRole, featurePermissions, hasNoAuthorization, queryPermissions };
