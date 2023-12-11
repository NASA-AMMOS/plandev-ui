import { base } from '$app/paths';
import type { ActivityDirective, ActivityPreset } from '../types/activity';
import type { User, UserRole } from '../types/app';
import type { ReqAuthResponse } from '../types/auth';
import type { Constraint } from '../types/constraint';
import type { ExpansionRule, ExpansionSequence, ExpansionSet } from '../types/expansion';
import type { Model } from '../types/model';
import type {
  AssetWithOwner,
  CreatePermissionCheck,
  ModelWithOwner,
  PermissionCheck,
  PlanWithOwners,
  ReadPermissionCheck,
  UpdatePermissionCheck,
} from '../types/permissions';
import type { PlanSnapshot } from '../types/plan-snapshot';
import type { SchedulingCondition, SchedulingGoal } from '../types/scheduling';
import type { UserSequence } from '../types/sequencing';
import type { Simulation, SimulationTemplate } from '../types/simulation';
import type { Tag } from '../types/tags';
import type { View, ViewSlim } from '../types/view';
import { showFailureToast } from './toast';

export const ADMIN_ROLE = 'aerie_admin';

export const INVALID_JWT = 'invalid-jwt';
export const EXPIRED_JWT = 'JWTExpired';

function isAdminRole(userRole?: UserRole) {
  return userRole === ADMIN_ROLE;
}

function isUserAdmin(user: User | null) {
  return isAdminRole(user?.activeRole);
}

function isUserOwner(user: User | null, thingWithOwner?: AssetWithOwner | null): boolean {
  if (thingWithOwner !== null) {
    if (thingWithOwner && user) {
      return thingWithOwner.owner === user.id;
    }
  }
  return false;
}

function isPlanOwner(user: User | null, plan: AssetWithOwner<PlanWithOwners>): boolean {
  return isUserOwner(user, plan);
}

function isPlanCollaborator(user: User | null, plan: PlanWithOwners): boolean {
  if (plan && user) {
    return !!plan.collaborators.find(({ collaborator }) => collaborator === user.id);
  }
  return false;
}

function getPermission(queries: string[], user: User | null): boolean {
  if (user && user.permissibleQueries) {
    return queries.reduce((prevValue: boolean, queryName) => {
      return prevValue && !!user.permissibleQueries?.[queryName];
    }, true);
  }
  return false;
}

/**
 * This map is an implementation of https://nasa-ammos.github.io/aerie-docs/deployment/advanced-permissions/#action-and-function-permissions
 */
type QueryString = string;
type FunctionString = string;
const functionQueryMap: Record<QueryString, FunctionString> = {
  addCommandExpansionTypeScript: 'create_expansion_rule',
  addExternalDataset: 'insert_ext_dataset',
  apply_preset_to_activity: 'apply_preset',
  begin_merge: 'begin_merge',
  cancel_merge: 'cancel_merge',
  commit_merge: 'commit_merge',
  constraintViolations: 'check_constraints',
  createExpansionSet: 'create_expansion_set',
  create_merge_request: 'create_merge_rq',
  create_snapshot: 'create_snapshot',
  delete_activity_by_pk_delete_subtree: 'delete_activity_subtree',
  delete_activity_by_pk_delete_subtree_bulk: 'delete_activity_subtree_bulk',
  delete_activity_by_pk_reanchor_plan_start: 'delete_activity_reanchor_plan',
  delete_activity_by_pk_reanchor_plan_start_bulk: 'delete_activity_reanchor_plan_bulk',
  delete_activity_by_pk_reanchor_to_anchor: 'delete_activity_reanchor',
  delete_activity_by_pk_reanchor_to_anchor_bulk: 'delete_activity_reanchor_bulk',
  deny_merge: 'deny_merge',
  duplicate_plan: 'branch_plan',
  expandAllActivities: 'expand_all_activities',
  getSequenceSeqJsonBulk: 'sequence_seq_json_bulk',
  get_conflicting_activities: 'get_conflicting_activities',
  get_non_conflicting_activities: 'get_non_conflicting_activities',
  get_plan_history: 'get_plan_history',
  resourceSamples: 'resource_samples',
  restore_activity_changelog: 'restore_activity_changelog',
  restore_from_snapshot: 'restore_snapshot',
  schedule: 'schedule',
  set_resolution: 'set_resolution',
  set_resolution_bulk: 'set_resolution_bulk',
  simulate: 'simulate',
  withdraw_merge_request: 'withdraw_merge_rq',
};

function getFunctionPermission(query: string): string {
  return functionQueryMap[query];
}

function getRoleModelPermission(
  queries: string[],
  user: User | null,
  plans: PlanWithOwners[],
  model: ModelWithOwner,
): boolean {
  if (user && user.rolePermissions) {
    return queries.reduce((prevValue: boolean, queryName) => {
      let permission = false;
      if (user.rolePermissions != null) {
        switch (user.rolePermissions[getFunctionPermission(queryName)]) {
          case 'MISSION_MODEL_OWNER':
          case 'OWNER':
            permission = isUserOwner(user, model);
            break;
          case 'PLAN_OWNER':
            permission = plans.reduce((prevSubValue, plan) => {
              return prevSubValue || (plan.model_id === model.id && isPlanOwner(user, plan));
            }, false);
            break;
          case 'PLAN_COLLABORATOR':
            permission = plans.reduce((prevSubValue, plan) => {
              return prevSubValue || (plan.model_id === model.id && isPlanCollaborator(user, plan));
            }, false);
            break;
          case 'PLAN_OWNER_COLLABORATOR':
            permission = plans.reduce((prevSubValue, plan) => {
              return (
                prevSubValue ||
                (plan.model_id === model.id && (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
              );
            }, false);
            break;
          case 'NO_CHECK':
          default:
            permission = true;
        }
      }
      return prevValue && permission;
    }, true);
  }
  return false;
}

function getRolePlanPermission(
  queries: string[],
  user: User | null,
  plan: PlanWithOwners,
  model: ModelWithOwner,
  assetWithOwner?: AssetWithOwner,
): boolean {
  if (user && user.rolePermissions) {
    return queries.reduce((prevValue: boolean, queryName) => {
      let permission = false;
      if (user.rolePermissions != null) {
        switch (user.rolePermissions[getFunctionPermission(queryName)]) {
          case 'MISSION_MODEL_OWNER':
            permission = isUserOwner(user, model);
            break;
          case 'OWNER':
            permission = assetWithOwner
              ? isUserOwner(user, assetWithOwner) && isPlanOwner(user, plan)
              : isPlanOwner(user, plan);
            break;
          case 'PLAN_OWNER':
            permission = isPlanOwner(user, plan);
            break;
          case 'PLAN_COLLABORATOR':
            permission = isPlanCollaborator(user, plan);
            break;
          case 'PLAN_OWNER_COLLABORATOR':
            permission = isPlanOwner(user, plan) || isPlanCollaborator(user, plan);
            break;
          case 'NO_CHECK':
          default:
            permission = true;
        }
      }
      return prevValue && permission;
    }, true);
  }
  return false;
}

function getRolePlanBranchPermission(
  queries: string[],
  user: User | null,
  sourcePlan: PlanWithOwners,
  targetPlan: PlanWithOwners,
  model: Pick<Model, 'owner'>,
): boolean {
  if (user && user.rolePermissions) {
    return queries.reduce((prevValue: boolean, queryName) => {
      let permission = false;
      if (user.rolePermissions != null) {
        switch (user.rolePermissions[getFunctionPermission(queryName)]) {
          case 'OWNER':
            permission = isPlanOwner(user, sourcePlan) && isPlanOwner(user, targetPlan);
            break;
          case 'MISSION_MODEL_OWNER':
            permission = isUserOwner(user, model);
            break;
          case 'PLAN_OWNER':
            permission = isPlanOwner(user, sourcePlan) || isPlanOwner(user, targetPlan);
            break;
          case 'PLAN_COLLABORATOR':
            permission = isPlanCollaborator(user, sourcePlan) || isPlanCollaborator(user, targetPlan);
            break;
          case 'PLAN_OWNER_COLLABORATOR':
            permission =
              isPlanOwner(user, sourcePlan) ||
              isPlanCollaborator(user, sourcePlan) ||
              isPlanOwner(user, targetPlan) ||
              isPlanCollaborator(user, targetPlan);
            break;
          case 'PLAN_OWNER_SOURCE':
            permission = isPlanOwner(user, sourcePlan);
            break;
          case 'PLAN_COLLABORATOR_SOURCE':
            permission = isPlanCollaborator(user, sourcePlan);
            break;
          case 'PLAN_OWNER_COLLABORATOR_SOURCE':
            permission = isPlanOwner(user, sourcePlan) || isPlanCollaborator(user, sourcePlan);
            break;
          case 'PLAN_OWNER_TARGET':
            permission = isPlanOwner(user, targetPlan);
            break;
          case 'PLAN_COLLABORATOR_TARGET':
            permission = isPlanCollaborator(user, targetPlan);
            break;
          case 'PLAN_OWNER_COLLABORATOR_TARGET':
            permission = isPlanOwner(user, targetPlan) || isPlanCollaborator(user, targetPlan);
            break;
          case 'NO_CHECK':
          default:
            permission = true;
        }
      }
      return prevValue && permission;
    }, true);
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
  APPLY_PRESET_TO_ACTIVITY: (
    user: User | null,
    plan: PlanWithOwners,
    model: ModelWithOwner,
    preset: ActivityPreset,
  ): boolean => {
    const queries = ['apply_preset_to_activity'];
    return (
      isUserAdmin(user) || (getPermission(queries, user) && getRolePlanPermission(queries, user, plan, model, preset))
    );
  },
  CHECK_CONSTRAINTS: (user: User | null, plan: PlanWithOwners, model: ModelWithOwner): boolean => {
    const queries = ['constraintViolations'];
    return isUserAdmin(user) || (getPermission(queries, user) && getRolePlanPermission(queries, user, plan, model));
  },
  CREATE_ACTIVITY_DIRECTIVE: (user: User | null, plan: PlanWithOwners): boolean => {
    const queries = ['insert_activity_directive_one'];
    return (
      isUserAdmin(user) || (getPermission(queries, user) && (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  CREATE_ACTIVITY_DIRECTIVE_TAGS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['insert_activity_directive_tags'], user);
  },
  CREATE_ACTIVITY_PRESET: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['insert_activity_presets_one'], user);
  },
  CREATE_COMMAND_DICTIONARY: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['uploadDictionary'], user);
  },
  CREATE_CONSTRAINT: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission(['insert_constraint_one'], user) && (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  CREATE_CONSTRAINT_TAGS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['insert_constraint_tags'], user);
  },
  CREATE_EXPANSION_RULE: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['insert_expansion_rule_one'], user);
  },
  CREATE_EXPANSION_RULE_TAGS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['insert_expansion_rule_tags'], user);
  },
  CREATE_EXPANSION_SEQUENCE: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['insert_sequence_one'], user);
  },
  CREATE_EXPANSION_SET: (user: User | null, plans: PlanWithOwners[], model: ModelWithOwner): boolean => {
    const queries = ['createExpansionSet'];
    return isUserAdmin(user) || (getPermission(queries, user) && getRoleModelPermission(queries, user, plans, model));
  },
  CREATE_MODEL: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['insert_mission_model_one'], user);
  },
  CREATE_PLAN: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['insert_plan_one'], user);
  },
  CREATE_PLAN_MERGE_REQUEST: (
    user: User | null,
    sourcePlan: PlanWithOwners,
    targetPlan: PlanWithOwners,
    model: ModelWithOwner,
  ): boolean => {
    const queries = ['create_merge_request'];
    return (
      isUserAdmin(user) ||
      (getPermission(queries, user) && getRolePlanBranchPermission(queries, user, sourcePlan, targetPlan, model))
    );
  },
  CREATE_PLAN_SNAPSHOT: (user: User | null, plan: PlanWithOwners, model: ModelWithOwner): boolean => {
    const queries = ['create_snapshot'];
    return isUserAdmin(user) || (getPermission(queries, user) && getRolePlanPermission(queries, user, plan, model));
  },
  CREATE_PLAN_SNAPSHOT_TAGS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['insert_plan_snapshot_tags'], user);
  },
  CREATE_PLAN_TAGS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['insert_plan_tags'], user);
  },
  CREATE_SCHEDULING_CONDITION: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission(['insert_scheduling_condition_one'], user) &&
        (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  CREATE_SCHEDULING_GOAL: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission(['insert_scheduling_goal_one'], user) &&
        (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  CREATE_SCHEDULING_GOAL_TAGS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['insert_scheduling_goal_tags'], user);
  },
  CREATE_SCHEDULING_SPEC: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['insert_scheduling_specification_one'], user);
  },
  CREATE_SCHEDULING_SPEC_CONDITION: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['insert_scheduling_specification_conditions_one'], user);
  },
  CREATE_SCHEDULING_SPEC_GOAL: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['insert_scheduling_specification_goals_one'], user);
  },
  CREATE_SIMULATION_TEMPLATE: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['insert_simulation_template_one'], user);
  },
  CREATE_TAGS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['insert_tags'], user);
  },
  CREATE_USER_SEQUENCE: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['insert_user_sequence_one'], user);
  },
  CREATE_VIEW: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['insert_view_one'], user);
  },
  DELETE_ACTIVITY_DIRECTIVES: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission(['delete_activity_directive'], user) &&
        (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  DELETE_ACTIVITY_DIRECTIVES_REANCHOR_PLAN_START: (
    user: User | null,
    plan: PlanWithOwners,
    model: ModelWithOwner,
  ): boolean => {
    const queries = ['delete_activity_by_pk_reanchor_plan_start_bulk'];
    return isUserAdmin(user) || (getPermission(queries, user) && getRolePlanPermission(queries, user, plan, model));
  },
  DELETE_ACTIVITY_DIRECTIVES_REANCHOR_TO_ANCHOR: (
    user: User | null,
    plan: PlanWithOwners,
    model: ModelWithOwner,
  ): boolean => {
    const queries = ['delete_activity_by_pk_reanchor_to_anchor_bulk'];
    return isUserAdmin(user) || (getPermission(queries, user) && getRolePlanPermission(queries, user, plan, model));
  },
  DELETE_ACTIVITY_DIRECTIVES_SUBTREE: (user: User | null, plan: PlanWithOwners, model: ModelWithOwner): boolean => {
    const queries = ['delete_activity_by_pk_delete_subtree_bulk'];
    return isUserAdmin(user) || (getPermission(queries, user) && getRolePlanPermission(queries, user, plan, model));
  },
  DELETE_ACTIVITY_DIRECTIVE_TAGS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['delete_activity_directive_tags'], user);
  },
  DELETE_ACTIVITY_PRESET: (user: User | null, preset: AssetWithOwner<ActivityPreset>): boolean => {
    return isUserAdmin(user) || (getPermission(['delete_activity_presets_by_pk'], user) && isUserOwner(user, preset));
  },
  DELETE_COMMAND_DICTIONARY: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['delete_command_dictionary_by_pk'], user);
  },
  DELETE_CONSTRAINT: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission(['delete_constraint_by_pk'], user) && (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  DELETE_CONSTRAINT_TAGS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['delete_constraint_tags'], user);
  },
  DELETE_EXPANSION_RULE: (user: User | null, expansionRule: AssetWithOwner<ExpansionRule>): boolean => {
    return (
      isUserAdmin(user) || (getPermission(['delete_expansion_rule_by_pk'], user) && isUserOwner(user, expansionRule))
    );
  },
  DELETE_EXPANSION_RULE_TAGS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['delete_expansion_rule_tags'], user);
  },
  DELETE_EXPANSION_SEQUENCE: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['delete_sequence_by_pk'], user);
  },
  DELETE_EXPANSION_SEQUENCE_TO_ACTIVITY: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['delete_sequence_to_simulated_activity_by_pk'], user);
  },
  DELETE_EXPANSION_SET: (user: User | null, expansionSet: AssetWithOwner<ExpansionSet>): boolean => {
    return (
      isUserAdmin(user) || (getPermission(['delete_expansion_set_by_pk'], user) && isUserOwner(user, expansionSet))
    );
  },
  DELETE_MODEL: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['delete_mission_model_by_pk'], user);
  },
  DELETE_PLAN: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission(['delete_plan_by_pk', 'delete_scheduling_specification'], user) && isPlanOwner(user, plan))
    );
  },
  DELETE_PLAN_SNAPSHOT: (user: User | null): boolean => {
    return getPermission(['delete_plan_snapshot_by_pk'], user) && isUserAdmin(user);
  },
  DELETE_PLAN_TAGS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['delete_plan_tags'], user);
  },
  DELETE_PRESET_TO_DIRECTIVE: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission(['delete_preset_to_directive_by_pk'], user) &&
        (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  DELETE_SCHEDULING_CONDITION: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission(['delete_scheduling_condition_by_pk'], user) &&
        (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  DELETE_SCHEDULING_GOAL: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission(['delete_scheduling_goal_by_pk'], user) &&
        (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  DELETE_SCHEDULING_GOAL_TAGS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['delete_scheduling_goal_tags'], user);
  },
  DELETE_SCHEDULING_SPEC_GOAL: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['delete_scheduling_specification_goals_by_pk'], user);
  },
  DELETE_SIMULATION_TEMPLATE: (user: User | null, template: SimulationTemplate): boolean => {
    return (
      isUserAdmin(user) || (getPermission(['delete_simulation_template_by_pk'], user) && isUserOwner(user, template))
    );
  },
  DELETE_TAGS: (user: User | null, tag: Tag): boolean => {
    return isUserAdmin(user) || (getPermission(['delete_tags_by_pk'], user) && isUserOwner(user, tag));
  },
  DELETE_USER_SEQUENCE: (user: User | null, sequence: AssetWithOwner<UserSequence>): boolean => {
    return isUserAdmin(user) || (getPermission(['delete_user_sequence_by_pk'], user) && isUserOwner(user, sequence));
  },
  DELETE_VIEW: (user: User | null, view: ViewSlim): boolean => {
    return isUserAdmin(user) || (getPermission(['delete_view_by_pk'], user) && isUserOwner(user, view));
  },
  DELETE_VIEWS: (user: User | null, view: ViewSlim): boolean => {
    return isUserAdmin(user) || (getPermission(['delete_view'], user) && isUserOwner(user, view));
  },
  DUPLICATE_PLAN: (user: User | null, plan: PlanWithOwners, model: ModelWithOwner): boolean => {
    const queries = ['duplicate_plan'];
    return isUserAdmin(user) || (getPermission(queries, user) && getRolePlanPermission(queries, user, plan, model));
  },
  EXPAND: (user: User | null, plan: PlanWithOwners, model: ModelWithOwner): boolean => {
    const queries = ['expandAllActivities'];
    return isUserAdmin(user) || (getPermission(queries, user) && getRolePlanPermission(queries, user, plan, model));
  },
  GET_EXPANSION_RUNS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['expansion_run'], user);
  },
  GET_EXPANSION_SEQUENCE_ID: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['sequence_to_simulated_activity_by_pk'], user);
  },
  GET_PLAN: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['plan_by_pk'], user);
  },
  GET_PLANS_AND_MODELS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['mission_model'], user);
  },
  GET_PLAN_SNAPSHOT: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['plan_snapshot_by_pk'], user);
  },
  INITIAL_SIMULATION_UPDATE: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['update_simulation'], user);
  },
  INSERT_EXPANSION_SEQUENCE_TO_ACTIVITY: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['insert_sequence_to_simulated_activity_one'], user);
  },
  PLAN_MERGE_BEGIN: (
    user: User | null,
    sourcePlan: PlanWithOwners,
    targetPlan: PlanWithOwners,
    model: ModelWithOwner,
  ): boolean => {
    const queries = ['begin_merge'];
    return (
      isUserAdmin(user) ||
      (getPermission(queries, user) && getRolePlanBranchPermission(queries, user, sourcePlan, targetPlan, model))
    );
  },
  PLAN_MERGE_CANCEL: (
    user: User | null,
    sourcePlan: PlanWithOwners,
    targetPlan: PlanWithOwners,
    model: ModelWithOwner,
  ): boolean => {
    const queries = ['cancel_merge'];
    return (
      isUserAdmin(user) ||
      (getPermission(queries, user) && getRolePlanBranchPermission(queries, user, sourcePlan, targetPlan, model))
    );
  },
  PLAN_MERGE_COMMIT: (
    user: User | null,
    sourcePlan: PlanWithOwners,
    targetPlan: PlanWithOwners,
    model: ModelWithOwner,
  ): boolean => {
    const queries = ['commit_merge'];
    return (
      isUserAdmin(user) ||
      (getPermission(queries, user) && getRolePlanBranchPermission(queries, user, sourcePlan, targetPlan, model))
    );
  },
  PLAN_MERGE_DENY: (
    user: User | null,
    sourcePlan: PlanWithOwners,
    targetPlan: PlanWithOwners,
    model: ModelWithOwner,
  ): boolean => {
    const queries = ['deny_merge'];
    return (
      isUserAdmin(user) ||
      (getPermission(queries, user) && getRolePlanBranchPermission(queries, user, sourcePlan, targetPlan, model))
    );
  },
  PLAN_MERGE_REQUEST_WITHDRAW: (
    user: User | null,
    sourcePlan: PlanWithOwners,
    targetPlan: PlanWithOwners,
    model: ModelWithOwner,
  ): boolean => {
    const queries = ['withdraw_merge_request'];
    return (
      isUserAdmin(user) ||
      (getPermission(queries, user) && getRolePlanBranchPermission(queries, user, sourcePlan, targetPlan, model))
    );
  },
  PLAN_MERGE_RESOLVE_ALL_CONFLICTS: (
    user: User | null,
    sourcePlan: PlanWithOwners,
    targetPlan: PlanWithOwners,
    model: ModelWithOwner,
  ): boolean => {
    const queries = ['set_resolution_bulk'];
    return (
      isUserAdmin(user) ||
      (getPermission(queries, user) && getRolePlanBranchPermission(queries, user, sourcePlan, targetPlan, model))
    );
  },
  PLAN_MERGE_RESOLVE_CONFLICT: (
    user: User | null,
    sourcePlan: PlanWithOwners,
    targetPlan: PlanWithOwners,
    model: ModelWithOwner,
  ): boolean => {
    const queries = ['set_resolution'];
    return (
      isUserAdmin(user) ||
      (getPermission(queries, user) && getRolePlanBranchPermission(queries, user, sourcePlan, targetPlan, model))
    );
  },
  RESTORE_ACTIVITY_FROM_CHANGELOG: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission(['restoreActivityFromChangelog'], user) &&
        (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  RESTORE_PLAN_SNAPSHOT: (user: User | null, plan: PlanWithOwners, model: ModelWithOwner): boolean => {
    const queries = ['restore_from_snapshot'];
    return isUserAdmin(user) || (getPermission(queries, user) && getRolePlanPermission(queries, user, plan, model));
  },
  SCHEDULE: (user: User | null, plan: PlanWithOwners, model: ModelWithOwner): boolean => {
    const queries = ['schedule'];
    return isUserAdmin(user) || (getPermission(queries, user) && getRolePlanPermission(queries, user, plan, model));
  },
  SIMULATE: (user: User | null, plan: PlanWithOwners, model: ModelWithOwner): boolean => {
    const queries = ['simulate'];
    return isUserAdmin(user) || (getPermission(queries, user) && getRolePlanPermission(queries, user, plan, model));
  },
  SUB_ACTIVITY_PRESETS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['activity_presets'], user);
  },
  SUB_CONSTRAINTS_ALL: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['constraint'], user);
  },
  SUB_EXPANSION_RULES: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['expansion_rule'], user);
  },
  SUB_EXPANSION_SETS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['expansion_set'], user);
  },
  SUB_PLAN_SNAPSHOTS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['plan_snapshot'], user);
  },
  SUB_PLAN_SNAPSHOT_ACTIVITY_DIRECTIVES: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['plan_snapshot_activities'], user);
  },
  SUB_SIMULATION: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['simulation'], user);
  },
  SUB_SIMULATION_TEMPLATES: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['simulation_template'], user);
  },
  SUB_TAGS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['tag'], user);
  },
  SUB_USER_SEQUENCES: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['user_sequence'], user);
  },
  SUB_VIEWS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['view'], user);
  },
  UPDATE_ACTIVITY_DIRECTIVE: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission(['update_activity_directive_by_pk'], user) &&
        (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  UPDATE_ACTIVITY_PRESET: (user: User | null, preset: AssetWithOwner<ActivityPreset>): boolean => {
    return isUserAdmin(user) || (getPermission(['update_activity_presets_by_pk'], user) && isUserOwner(user, preset));
  },
  UPDATE_CONSTRAINT: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission(['update_constraint_by_pk'], user) && (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  UPDATE_EXPANSION_RULE: (user: User | null, expansionRule: AssetWithOwner<ExpansionRule>): boolean => {
    return (
      isUserAdmin(user) || (getPermission(['update_expansion_rule_by_pk'], user) && isUserOwner(user, expansionRule))
    );
  },
  UPDATE_PLAN: (user: User | null, plan: PlanWithOwners): boolean => {
    return isUserAdmin(user) || (getPermission(['update_plan_by_pk'], user) && isPlanOwner(user, plan));
  },
  UPDATE_PLAN_SNAPSHOT: (user: User | null): boolean => {
    return getPermission(['update_plan_snapshot_by_pk'], user);
  },
  UPDATE_SCHEDULING_CONDITION: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission(['update_scheduling_condition_by_pk'], user) &&
        (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  UPDATE_SCHEDULING_GOAL: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission(['update_scheduling_goal_by_pk'], user) &&
        (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  UPDATE_SCHEDULING_SPEC: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission(['update_scheduling_specification_by_pk'], user) &&
        (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  UPDATE_SCHEDULING_SPEC_CONDITION_ID: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['update_scheduling_specification_conditions_by_pk'], user);
  },
  UPDATE_SCHEDULING_SPEC_GOAL: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission(['update_scheduling_specification_goals_by_pk'], user) &&
        (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  UPDATE_SIMULATION: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission(['update_simulation_by_pk'], user) && (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  UPDATE_SIMULATION_DATASET: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission(['update_simulation_dataset_by_pk'], user);
  },
  UPDATE_SIMULATION_TEMPLATE: (user: User | null, plan: PlanWithOwners): boolean => {
    return isUserAdmin(user) || (getPermission(['update_simulation_template_by_pk'], user) && isUserOwner(user, plan));
  },
  UPDATE_TAG: (user: User | null, tag: AssetWithOwner<Tag>): boolean => {
    return isUserAdmin(user) || (getPermission(['update_tags_by_pk'], user) && isUserOwner(user, tag));
  },
  UPDATE_USER_SEQUENCE: (user: User | null, sequence: AssetWithOwner<UserSequence>): boolean => {
    return isUserAdmin(user) || (getPermission(['update_user_sequence_by_pk'], user) && isUserOwner(user, sequence));
  },
  UPDATE_VIEW: (user: User | null, view: AssetWithOwner<View>): boolean => {
    return isUserAdmin(user) || (getPermission(['update_view_by_pk'], user) && isUserOwner(user, view));
  },
};

type PlanAssetCreatePermissionCheck = (user: User | null, plan: PlanWithOwners) => boolean;

type PlanAssetUpdatePermissionCheck<T = AssetWithOwner> = (
  user: User | null,
  plan: PlanWithOwners,
  asset?: T,
) => boolean;

type RolePlanPermissionCheck = (user: User | null, plan: PlanWithOwners, model: ModelWithOwner) => boolean;
type RoleModelPermissionCheck = (user: User | null, plans: PlanWithOwners[], model: ModelWithOwner) => boolean;

type RolePlanPermissionCheckWithAsset<T = AssetWithOwner> = (
  user: User | null,
  plan: PlanWithOwners,
  model: ModelWithOwner,
  asset: T,
) => boolean;

type RolePlanBranchPermissionCheck = (
  user: User | null,
  sourcePlan: PlanWithOwners,
  targetPlan: PlanWithOwners,
  model: ModelWithOwner,
) => boolean;

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

interface PlanBranchCRUDPermission {
  canCreateBranch: RolePlanPermissionCheck;
  canCreateRequest: RolePlanBranchPermissionCheck;
  canDeleteRequest: RolePlanBranchPermissionCheck;
  canReviewRequest: RolePlanBranchPermissionCheck;
}

interface PlanAssetCRUDPermission<T = null> {
  canCreate: PlanAssetCreatePermissionCheck;
  canDelete: PlanAssetUpdatePermissionCheck<T>;
  canRead: ReadPermissionCheck<T>;
  canUpdate: PlanAssetUpdatePermissionCheck<T>;
}

interface PlanActivityPresetsCRUDPermission
  extends Omit<PlanAssetCRUDPermission<ActivityPreset>, 'canDelete' | 'canUpdate'> {
  canAssign: RolePlanPermissionCheckWithAsset<ActivityPreset>;
  canDelete: (user: User | null, plan: PlanWithOwners, asset: ActivityPreset) => boolean;
  canUnassign: (user: User | null, plan: PlanWithOwners) => boolean;
  canUpdate: (user: User | null, plan: PlanWithOwners, asset: ActivityPreset) => boolean;
}

interface PlanSimulationTemplateCRUDPermission extends Omit<PlanAssetCRUDPermission<SimulationTemplate>, 'canDelete'> {
  canAssign: (user: User | null, plan: PlanWithOwners) => boolean;
  canDelete: (user: User | null, plan: PlanWithOwners, asset: SimulationTemplate) => boolean;
}

interface RunnableCRUDPermission<T = null> extends PlanAssetCRUDPermission<T> {
  canRun: (user: User | null, plan: PlanWithOwners, model: ModelWithOwner) => boolean;
}

interface PlanSnapshotCRUDPermission extends Omit<PlanAssetCRUDPermission<PlanSnapshot>, 'canCreate' | 'canDelete'> {
  canCreate: RolePlanPermissionCheck;
  canDelete: (user: User | null) => boolean;
  canRestore: RolePlanPermissionCheck;
}

interface ConstraintCRUDPermission<T = null> extends PlanAssetCRUDPermission<T> {
  canCheck: RolePlanPermissionCheck;
}

interface ExpansionSetsCRUDPermission<T = null> extends Omit<CRUDPermission<T>, 'canCreate'> {
  canCreate: RoleModelPermissionCheck;
  canUpdate: () => boolean;
}

interface ExpansionSequenceCRUDPermission<T = null> extends CRUDPermission<T> {
  canExpand: RolePlanPermissionCheck;
}

interface SchedulingCRUDPermission<T = null> extends RunnableCRUDPermission<T> {
  canAnalyze: (user: User | null, plan: PlanWithOwners, model: ModelWithOwner) => boolean;
  canUpdateSpecification: (user: User | null, plan: PlanWithOwners) => boolean;
}

interface FeaturePermissions {
  activityDirective: PlanAssetCRUDPermission<ActivityDirective>;
  activityPresets: PlanActivityPresetsCRUDPermission;
  commandDictionary: CRUDPermission<void>;
  constraints: ConstraintCRUDPermission<AssetWithOwner<Constraint>>;
  expansionRules: CRUDPermission<AssetWithOwner>;
  expansionSequences: ExpansionSequenceCRUDPermission<AssetWithOwner<ExpansionSequence>>;
  expansionSets: ExpansionSetsCRUDPermission<AssetWithOwner<ExpansionSet>>;
  model: CRUDPermission<void>;
  plan: CRUDPermission<PlanWithOwners>;
  planBranch: PlanBranchCRUDPermission;
  planSnapshot: PlanSnapshotCRUDPermission;
  schedulingConditions: PlanAssetCRUDPermission<AssetWithOwner<SchedulingCondition>>;
  schedulingGoals: SchedulingCRUDPermission<AssetWithOwner<SchedulingGoal>>;
  sequences: CRUDPermission<AssetWithOwner<UserSequence>>;
  simulation: RunnableCRUDPermission<AssetWithOwner<Simulation>>;
  simulationTemplates: PlanSimulationTemplateCRUDPermission;
  tags: CRUDPermission<Tag>;
  view: CRUDPermission<ViewSlim>;
}

const featurePermissions: FeaturePermissions = {
  activityDirective: {
    canCreate: (user, plan) => queryPermissions.CREATE_ACTIVITY_DIRECTIVE(user, plan),
    canDelete: (user, plan) => queryPermissions.DELETE_ACTIVITY_DIRECTIVES(user, plan),
    canRead: user => queryPermissions.GET_PLAN(user),
    canUpdate: (user, plan) => queryPermissions.UPDATE_ACTIVITY_DIRECTIVE(user, plan),
  },
  activityPresets: {
    canAssign: (user, plan, model, preset) => queryPermissions.APPLY_PRESET_TO_ACTIVITY(user, plan, model, preset),
    canCreate: user => queryPermissions.CREATE_ACTIVITY_PRESET(user),
    canDelete: (user, _plan, preset) => queryPermissions.DELETE_ACTIVITY_PRESET(user, preset),
    canRead: user => queryPermissions.SUB_ACTIVITY_PRESETS(user),
    canUnassign: (user, plan) => queryPermissions.DELETE_PRESET_TO_DIRECTIVE(user, plan),
    canUpdate: (user, _plan, preset) => queryPermissions.UPDATE_ACTIVITY_PRESET(user, preset),
  },
  commandDictionary: {
    canCreate: user => queryPermissions.CREATE_COMMAND_DICTIONARY(user),
    canDelete: user => queryPermissions.DELETE_COMMAND_DICTIONARY(user),
    canRead: () => false, // Not implemented
    canUpdate: () => false, // Not implemented
  },
  constraints: {
    canCheck: (user, plan, model) => queryPermissions.CHECK_CONSTRAINTS(user, plan, model),
    canCreate: (user, plan) => queryPermissions.CREATE_CONSTRAINT(user, plan),
    canDelete: (user, plan) => queryPermissions.DELETE_CONSTRAINT(user, plan),
    canRead: user => queryPermissions.SUB_CONSTRAINTS_ALL(user),
    canUpdate: (user, plan) => queryPermissions.UPDATE_CONSTRAINT(user, plan),
  },
  expansionRules: {
    canCreate: user => queryPermissions.CREATE_EXPANSION_RULE(user),
    canDelete: (user, expansionRule) => queryPermissions.DELETE_EXPANSION_RULE(user, expansionRule),
    canRead: user => queryPermissions.SUB_EXPANSION_RULES(user),
    canUpdate: (user, expansionRule) => queryPermissions.UPDATE_EXPANSION_RULE(user, expansionRule),
  },
  expansionSequences: {
    canCreate: user => queryPermissions.CREATE_EXPANSION_SEQUENCE(user),
    canDelete: user => queryPermissions.DELETE_EXPANSION_SEQUENCE(user),
    canExpand: (user, plan, model) => queryPermissions.EXPAND(user, plan, model),
    canRead: user => queryPermissions.GET_EXPANSION_SEQUENCE_ID(user),
    canUpdate: () => false, // this is not a feature,
  },
  expansionSets: {
    canCreate: (user, plans, model) => queryPermissions.CREATE_EXPANSION_SET(user, plans, model),
    canDelete: (user, expansionSet) => queryPermissions.DELETE_EXPANSION_SET(user, expansionSet),
    canRead: user => queryPermissions.SUB_EXPANSION_SETS(user),
    canUpdate: () => false, // no feature to update expansion sets exists
  },
  model: {
    canCreate: user => queryPermissions.CREATE_MODEL(user),
    canDelete: user => queryPermissions.DELETE_MODEL(user),
    canRead: user => queryPermissions.GET_PLANS_AND_MODELS(user),
    canUpdate: () => false, // no feature to update models exists
  },
  plan: {
    canCreate: user => queryPermissions.CREATE_PLAN(user),
    canDelete: (user, plan) => queryPermissions.DELETE_PLAN(user, plan),
    canRead: user => queryPermissions.GET_PLAN(user),
    canUpdate: (user, plan) => queryPermissions.UPDATE_PLAN(user, plan),
  },
  planBranch: {
    canCreateBranch: (user, plan, model) => queryPermissions.DUPLICATE_PLAN(user, plan, model),
    canCreateRequest: (user, sourcePlan, targetPlan, model) =>
      queryPermissions.CREATE_PLAN_MERGE_REQUEST(user, sourcePlan, targetPlan, model),
    canDeleteRequest: (user, sourcePlan, targetPlan, model) =>
      queryPermissions.PLAN_MERGE_REQUEST_WITHDRAW(user, sourcePlan, targetPlan, model),
    canReviewRequest: (user, sourcePlan, targetPlan, model) =>
      queryPermissions.PLAN_MERGE_BEGIN(user, sourcePlan, targetPlan, model) &&
      queryPermissions.PLAN_MERGE_CANCEL(user, sourcePlan, targetPlan, model) &&
      queryPermissions.PLAN_MERGE_COMMIT(user, sourcePlan, targetPlan, model) &&
      queryPermissions.PLAN_MERGE_DENY(user, sourcePlan, targetPlan, model) &&
      queryPermissions.PLAN_MERGE_RESOLVE_CONFLICT(user, sourcePlan, targetPlan, model) &&
      queryPermissions.PLAN_MERGE_RESOLVE_ALL_CONFLICTS(user, sourcePlan, targetPlan, model),
  },
  planSnapshot: {
    canCreate: (user, plan, model) => queryPermissions.CREATE_PLAN_SNAPSHOT(user, plan, model),
    canDelete: user => queryPermissions.DELETE_PLAN_SNAPSHOT(user),
    canRead: user => queryPermissions.GET_PLAN_SNAPSHOT(user) && queryPermissions.SUB_PLAN_SNAPSHOTS(user),
    canRestore: (user, plan, model) => queryPermissions.RESTORE_PLAN_SNAPSHOT(user, plan, model),
    canUpdate: () => false, // no feature to update snapshots exists,
  },
  schedulingConditions: {
    canCreate: (user, plan) => queryPermissions.CREATE_SCHEDULING_CONDITION(user, plan),
    canDelete: (user, plan) => queryPermissions.DELETE_SCHEDULING_CONDITION(user, plan),
    canRead: () => false,
    canUpdate: (user, plan) => queryPermissions.UPDATE_SCHEDULING_CONDITION(user, plan),
  },
  schedulingGoals: {
    canAnalyze: (user, plan, model) =>
      queryPermissions.UPDATE_SCHEDULING_SPEC(user, plan) && queryPermissions.SCHEDULE(user, plan, model),
    canCreate: (user, plan) => queryPermissions.CREATE_SCHEDULING_GOAL(user, plan),
    canDelete: (user, plan) => queryPermissions.DELETE_SCHEDULING_GOAL(user, plan),
    canRead: () => false,
    canRun: (user, plan, model) =>
      queryPermissions.UPDATE_SCHEDULING_SPEC(user, plan) && queryPermissions.SCHEDULE(user, plan, model),
    canUpdate: (user, plan) => queryPermissions.UPDATE_SCHEDULING_GOAL(user, plan),
    canUpdateSpecification: (user, plan) => queryPermissions.UPDATE_SCHEDULING_SPEC_GOAL(user, plan),
  },
  sequences: {
    canCreate: user => queryPermissions.CREATE_USER_SEQUENCE(user),
    canDelete: (user, sequence) => queryPermissions.DELETE_USER_SEQUENCE(user, sequence),
    canRead: user => queryPermissions.SUB_USER_SEQUENCES(user),
    canUpdate: (user, sequence) => queryPermissions.UPDATE_USER_SEQUENCE(user, sequence),
  },
  simulation: {
    canCreate: () => false, // no feature to create a simulation exists
    canDelete: () => false, // no feature to delete a simulation exists
    canRead: user => queryPermissions.SUB_SIMULATION(user),
    canRun: (user, plan, model) => queryPermissions.SIMULATE(user, plan, model),
    canUpdate: (user, plan) => queryPermissions.UPDATE_SIMULATION(user, plan),
  },
  simulationTemplates: {
    canAssign: (user, plan) => queryPermissions.UPDATE_SIMULATION(user, plan),
    canCreate: user => queryPermissions.CREATE_SIMULATION_TEMPLATE(user),
    canDelete: (user, _plan, template) => queryPermissions.DELETE_SIMULATION_TEMPLATE(user, template),
    canRead: user => queryPermissions.SUB_SIMULATION_TEMPLATES(user),
    canUpdate: (user, plan) => queryPermissions.UPDATE_SIMULATION_TEMPLATE(user, plan),
  },
  tags: {
    canCreate: user => queryPermissions.CREATE_TAGS(user),
    canDelete: (user, tag) => queryPermissions.DELETE_TAGS(user, tag),
    canRead: user => queryPermissions.SUB_TAGS(user),
    canUpdate: (user, tag) => queryPermissions.UPDATE_TAG(user, tag),
  },
  view: {
    canCreate: user => queryPermissions.CREATE_VIEW(user),
    canDelete: (user, view) => queryPermissions.DELETE_VIEW(user, view) && queryPermissions.DELETE_VIEWS(user, view),
    canRead: user => queryPermissions.SUB_VIEWS(user),
    canUpdate: (user, view) => queryPermissions.UPDATE_VIEW(user, view),
  },
};

function hasNoAuthorization(user: User | null) {
  return !user || (user.permissibleQueries && !Object.keys(user.permissibleQueries).length);
}

export {
  changeUserRole,
  featurePermissions,
  hasNoAuthorization,
  isAdminRole,
  isPlanCollaborator,
  isPlanOwner,
  isUserAdmin,
  isUserOwner,
  queryPermissions,
};
