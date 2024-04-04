import { base } from '$app/paths';
import type { ActivityDirective, ActivityPreset } from '../types/activity';
import type { User, UserRole } from '../types/app';
import type { ReqAuthResponse } from '../types/auth';
import type { ConstraintDefinition, ConstraintMetadata } from '../types/constraint';
import type { ExpansionRule, ExpansionSequence, ExpansionSet } from '../types/expansion';
import type { Model } from '../types/model';
import type {
  AssetWithAuthor,
  AssetWithOwner,
  CreatePermissionCheck,
  ModelWithOwner,
  PermissionCheck,
  PlanWithOwners,
  ReadPermissionCheck,
  UpdatePermissionCheck,
} from '../types/permissions';
import type { PlanSnapshot } from '../types/plan-snapshot';
import type {
  SchedulingConditionDefinition,
  SchedulingConditionMetadata,
  SchedulingGoalDefinition,
  SchedulingGoalMetadata,
} from '../types/scheduling';
import type { UserSequence } from '../types/sequencing';
import type { Simulation, SimulationTemplate } from '../types/simulation';
import type { Tag } from '../types/tags';
import type { View, ViewSlim } from '../types/view';
import gql, { Queries } from './gql';
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

function isUserAuthor(user: User | null, thingWithAuthor?: AssetWithAuthor | null): boolean {
  if (thingWithAuthor !== null) {
    if (thingWithAuthor && user) {
      return thingWithAuthor.author === user.id;
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
  [Queries.APPLY_PRESET_TO_ACTIVITY]: 'apply_preset',
  [Queries.BEGIN_MERGE]: 'begin_merge',
  [Queries.CANCEL_MERGE]: 'cancel_merge',
  [Queries.COMMIT_MERGE]: 'commit_merge',
  [Queries.CONSTRAINT_VIOLATIONS]: 'check_constraints',
  [Queries.CREATE_EXPANSION_SET]: 'create_expansion_set',
  [Queries.CREATE_MERGE_REQUEST]: 'create_merge_rq',
  [Queries.CREATE_SNAPSHOT]: 'create_snapshot',
  delete_activity_by_pk_delete_subtree: 'delete_activity_subtree',
  [Queries.DELETE_ACTIVITY_DELETE_SUBTREE_BULK]: 'delete_activity_subtree_bulk',
  delete_activity_by_pk_reanchor_plan_start: 'delete_activity_reanchor_plan',
  [Queries.DELETE_ACTIVITY_REANCHOR_PLAN_START_BULK]: 'delete_activity_reanchor_plan_bulk',
  delete_activity_by_pk_reanchor_to_anchor: 'delete_activity_reanchor',
  [Queries.DELETE_ACTIVITY_REANCHOR_TO_ANCHOR_BULK]: 'delete_activity_reanchor_bulk',
  [Queries.DENY_MERGE]: 'deny_merge',
  [Queries.DUPLICATE_PLAN]: 'branch_plan',
  [Queries.EXPAND_ALL_ACTIVITIES]: 'expand_all_activities',
  getSequenceSeqJsonBulk: 'sequence_seq_json_bulk',
  [Queries.GET_CONFLICTING_ACTIVITIES]: 'get_conflicting_activities',
  [Queries.GET_NON_CONFLICTING_ACTIVITIES]: 'get_non_conflicting_activities',
  get_plan_history: 'get_plan_history',
  resourceSamples: 'resource_samples',
  [Queries.RESTORE_FROM_SNAPSHOT]: 'restore_snapshot',
  [Queries.SCHEDULE]: 'schedule',
  [Queries.SET_RESOLUTION]: 'set_resolution',
  [Queries.SET_RESOLUTIONS]: 'set_resolution_bulk',
  [Queries.SIMULATE]: 'simulate',
  [Queries.WITHDRAW_MERGE_REQUEST]: 'withdraw_merge_rq',
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
    const queries = [Queries.APPLY_PRESET_TO_ACTIVITY];
    return (
      isUserAdmin(user) || (getPermission(queries, user) && getRolePlanPermission(queries, user, plan, model, preset))
    );
  },
  CANCEL_SCHEDULING_REQUEST: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.UPDATE_SCHEDULING_REQUEST], user);
  },
  CANCEL_SIMULATION: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.UPDATE_SIMULATION_DATASET], user);
  },
  CHECK_CONSTRAINTS: (user: User | null, plan: PlanWithOwners, model: ModelWithOwner): boolean => {
    const queries = [Queries.CONSTRAINT_VIOLATIONS];
    return isUserAdmin(user) || (getPermission(queries, user) && getRolePlanPermission(queries, user, plan, model));
  },
  CREATE_ACTIVITY_DIRECTIVE: (user: User | null, plan: PlanWithOwners): boolean => {
    const queries = [Queries.INSERT_ACTIVITY_DIRECTIVE];
    return (
      isUserAdmin(user) || (getPermission(queries, user) && (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  CREATE_ACTIVITY_DIRECTIVE_TAGS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.INSERT_ACTIVITY_DIRECTIVE_TAGS], user);
  },
  CREATE_ACTIVITY_PRESET: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.INSERT_ACTIVITY_PRESET], user);
  },
  CREATE_COMMAND_DICTIONARY: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.UPLOAD_DICTIONARY], user);
  },
  CREATE_CONSTRAINT: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.INSERT_CONSTRAINT_METADATA], user);
  },
  CREATE_CONSTRAINT_DEFINITION: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.INSERT_CONSTRAINT_DEFINITION], user);
  },
  CREATE_CONSTRAINT_MODEL_SPECIFICATION: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.INSERT_CONSTRAINT_MODEL_SPECIFICATION], user);
  },
  CREATE_EXPANSION_RULE: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.INSERT_EXPANSION_RULE], user);
  },
  CREATE_EXPANSION_RULE_TAGS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.INSERT_EXPANSION_RULE_TAGS], user);
  },
  CREATE_EXPANSION_SEQUENCE: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.INSERT_SEQUENCE], user);
  },
  CREATE_EXPANSION_SET: (user: User | null, plans: PlanWithOwners[], model: ModelWithOwner): boolean => {
    const queries = [Queries.CREATE_EXPANSION_SET];
    return isUserAdmin(user) || (getPermission(queries, user) && getRoleModelPermission(queries, user, plans, model));
  },
  CREATE_MODEL: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.INSERT_MISSION_MODEL], user);
  },
  CREATE_PLAN: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.INSERT_PLAN], user);
  },
  CREATE_PLAN_MERGE_REQUEST: (
    user: User | null,
    sourcePlan: PlanWithOwners,
    targetPlan: PlanWithOwners,
    model: ModelWithOwner,
  ): boolean => {
    const queries = [Queries.CREATE_MERGE_REQUEST];
    return (
      isUserAdmin(user) ||
      (getPermission(queries, user) && getRolePlanBranchPermission(queries, user, sourcePlan, targetPlan, model))
    );
  },
  CREATE_PLAN_SNAPSHOT: (user: User | null, plan: PlanWithOwners, model: ModelWithOwner): boolean => {
    const queries = [Queries.CREATE_SNAPSHOT];
    return isUserAdmin(user) || (getPermission(queries, user) && getRolePlanPermission(queries, user, plan, model));
  },
  CREATE_PLAN_SNAPSHOT_TAGS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.INSERT_PLAN_SNAPSHOT_TAGS], user);
  },
  CREATE_PLAN_TAGS: (user: User | null, plan: PlanWithOwners): boolean => {
    return isUserAdmin(user) || (getPermission([Queries.INSERT_PLAN_TAGS], user) && isPlanOwner(user, plan));
  },
  CREATE_SCHEDULING_CONDITION: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.INSERT_SCHEDULING_CONDITION_METADATA], user);
  },
  CREATE_SCHEDULING_CONDITION_DEFINITION: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.INSERT_SCHEDULING_CONDITION_DEFINITION], user);
  },
  CREATE_SCHEDULING_CONDITION_PLAN_SPECIFICATION: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.INSERT_SCHEDULING_SPECIFICATION_CONDITION], user);
  },
  CREATE_SCHEDULING_GOAL: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.INSERT_SCHEDULING_GOAL_METADATA], user);
  },
  CREATE_SCHEDULING_GOAL_DEFINITION: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.INSERT_SCHEDULING_GOAL_DEFINITION], user);
  },
  CREATE_SCHEDULING_GOAL_PLAN_SPECIFICATION: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.INSERT_SCHEDULING_SPECIFICATION_GOAL], user);
  },
  CREATE_SCHEDULING_PLAN_SPECIFICATION: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.INSERT_SCHEDULING_SPECIFICATION], user);
  },
  CREATE_SIMULATION_TEMPLATE: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.INSERT_SIMULATION_TEMPLATE], user);
  },
  CREATE_TAG: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.INSERT_TAG], user);
  },
  CREATE_TAGS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.INSERT_TAGS], user);
  },
  CREATE_USER_SEQUENCE: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.INSERT_USER_SEQUENCE], user);
  },
  CREATE_VIEW: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.INSERT_VIEW], user);
  },
  DELETE_ACTIVITY_DIRECTIVES: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission([Queries.DELETE_ACTIVITY_DIRECTIVES], user) &&
        (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  DELETE_ACTIVITY_DIRECTIVES_REANCHOR_PLAN_START: (
    user: User | null,
    plan: PlanWithOwners,
    model: ModelWithOwner,
  ): boolean => {
    const queries = [Queries.DELETE_ACTIVITY_REANCHOR_PLAN_START_BULK];
    return isUserAdmin(user) || (getPermission(queries, user) && getRolePlanPermission(queries, user, plan, model));
  },
  DELETE_ACTIVITY_DIRECTIVES_REANCHOR_TO_ANCHOR: (
    user: User | null,
    plan: PlanWithOwners,
    model: ModelWithOwner,
  ): boolean => {
    const queries = [Queries.DELETE_ACTIVITY_REANCHOR_TO_ANCHOR_BULK];
    return isUserAdmin(user) || (getPermission(queries, user) && getRolePlanPermission(queries, user, plan, model));
  },
  DELETE_ACTIVITY_DIRECTIVES_SUBTREE: (user: User | null, plan: PlanWithOwners, model: ModelWithOwner): boolean => {
    const queries = [Queries.DELETE_ACTIVITY_DELETE_SUBTREE_BULK];
    return isUserAdmin(user) || (getPermission(queries, user) && getRolePlanPermission(queries, user, plan, model));
  },
  DELETE_ACTIVITY_DIRECTIVE_TAGS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.DELETE_ACTIVITY_DIRECTIVE_TAGS], user);
  },
  DELETE_ACTIVITY_PRESET: (user: User | null, preset: AssetWithOwner<ActivityPreset>): boolean => {
    return isUserAdmin(user) || (getPermission([Queries.DELETE_ACTIVITY_PRESET], user) && isUserOwner(user, preset));
  },
  DELETE_COMMAND_DICTIONARY: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.DELETE_COMMAND_DICTIONARY], user);
  },
  DELETE_CONSTRAINT_METADATA: (user: User | null, constraintMetadata: AssetWithOwner<ConstraintMetadata>): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission([Queries.DELETE_CONSTRAINT_METADATA], user) && isUserOwner(user, constraintMetadata))
    );
  },
  DELETE_CONSTRAINT_MODEL_SPECIFICATIONS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.DELETE_CONSTRAINT_MODEL_SPECIFICATIONS], user);
  },
  DELETE_CONSTRAINT_PLAN_SPECIFICATIONS: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission([Queries.DELETE_CONSTRAINT_SPECIFICATIONS], user) &&
        (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  DELETE_EXPANSION_RULE: (user: User | null, expansionRule: AssetWithOwner<ExpansionRule>): boolean => {
    return (
      isUserAdmin(user) || (getPermission([Queries.DELETE_EXPANSION_RULE], user) && isUserOwner(user, expansionRule))
    );
  },
  DELETE_EXPANSION_RULE_TAGS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.DELETE_EXPANSION_RULE_TAGS], user);
  },
  DELETE_EXPANSION_SEQUENCE: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.DELETE_SEQUENCE], user);
  },
  DELETE_EXPANSION_SEQUENCE_TO_ACTIVITY: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.DELETE_SEQUENCE_TO_SIMULATED_ACTIVITY], user);
  },
  DELETE_EXPANSION_SET: (user: User | null, expansionSet: AssetWithOwner<ExpansionSet>): boolean => {
    return (
      isUserAdmin(user) || (getPermission([Queries.DELETE_EXPANSION_SET], user) && isUserOwner(user, expansionSet))
    );
  },
  DELETE_MODEL: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.DELETE_MISSION_MODEL], user);
  },
  DELETE_PLAN: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission([Queries.DELETE_PLAN, Queries.DELETE_SCHEDULING_SPECIFICATION], user) && isPlanOwner(user, plan))
    );
  },
  DELETE_PLAN_SNAPSHOT: (user: User | null): boolean => {
    return getPermission([Queries.DELETE_PLAN_SNAPSHOT], user) && isUserAdmin(user);
  },
  DELETE_PLAN_TAGS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.DELETE_PLAN_TAGS], user);
  },
  DELETE_PRESET_TO_DIRECTIVE: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission([Queries.DELETE_PRESET_TO_DIRECTIVE], user) &&
        (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  DELETE_SCHEDULING_CONDITION_METADATA: (
    user: User | null,
    conditionMetadata: AssetWithOwner<SchedulingConditionMetadata>,
  ): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission([Queries.DELETE_SCHEDULING_CONDITION_METADATA], user) && isUserOwner(user, conditionMetadata))
    );
  },
  DELETE_SCHEDULING_CONDITION_MODEL_SPECIFICATIONS: () => true,
  DELETE_SCHEDULING_CONDITION_PLAN_SPECIFICATIONS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.DELETE_SCHEDULING_SPECIFICATION_CONDITIONS], user);
  },
  DELETE_SCHEDULING_GOAL_METADATA: (
    user: User | null,
    goalMetadata: AssetWithOwner<SchedulingGoalMetadata>,
  ): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission([Queries.DELETE_SCHEDULING_GOAL_METADATA], user) && isUserOwner(user, goalMetadata))
    );
  },
  DELETE_SCHEDULING_GOAL_MODEL_SPECIFICATIONS: () => true,
  DELETE_SCHEDULING_GOAL_PLAN_SPECIFICATIONS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.DELETE_SCHEDULING_SPECIFICATION_GOALS], user);
  },
  DELETE_SIMULATION_TEMPLATE: (user: User | null, template: SimulationTemplate): boolean => {
    return (
      isUserAdmin(user) || (getPermission([Queries.DELETE_SIMULATION_TEMPLATE], user) && isUserOwner(user, template))
    );
  },
  DELETE_TAG: (user: User | null, tag: Tag): boolean => {
    return isUserAdmin(user) || (getPermission([Queries.DELETE_TAG], user) && isUserOwner(user, tag));
  },
  DELETE_USER_SEQUENCE: (user: User | null, sequence: AssetWithOwner<UserSequence>): boolean => {
    return isUserAdmin(user) || (getPermission([Queries.DELETE_USER_SEQUENCE], user) && isUserOwner(user, sequence));
  },
  DELETE_VIEW: (user: User | null, view: ViewSlim): boolean => {
    return isUserAdmin(user) || (getPermission([Queries.DELETE_VIEW], user) && isUserOwner(user, view));
  },
  DELETE_VIEWS: (user: User | null, view: ViewSlim): boolean => {
    return isUserAdmin(user) || (getPermission([Queries.DELETE_VIEWS], user) && isUserOwner(user, view));
  },
  DUPLICATE_PLAN: (user: User | null, plan: PlanWithOwners, model: ModelWithOwner): boolean => {
    const queries = [Queries.DUPLICATE_PLAN];
    return isUserAdmin(user) || (getPermission(queries, user) && getRolePlanPermission(queries, user, plan, model));
  },
  EXPAND: (user: User | null, plan: PlanWithOwners, model: ModelWithOwner): boolean => {
    const queries = [Queries.EXPAND_ALL_ACTIVITIES];
    return isUserAdmin(user) || (getPermission(queries, user) && getRolePlanPermission(queries, user, plan, model));
  },
  GET_ACTIVITY_DIRECTIVE_CHANGELOG: () => true,
  GET_ACTIVITY_TYPES_EXPANSION_RULES: () => true,
  GET_EFFECTIVE_ACTIVITY_ARGUMENTS: () => true,
  GET_EFFECTIVE_MODEL_ARGUMENTS: () => true,
  GET_EXPANSION_RULE: () => true,
  GET_EXPANSION_RUNS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.EXPANSION_RUNS], user);
  },
  GET_EXPANSION_SEQUENCE_ID: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.SEQUENCE_TO_SIMULATED_ACTIVITY], user);
  },
  GET_EXPANSION_SEQUENCE_SEQ_JSON: () => true,
  GET_EXTENSIONS: () => true,
  GET_MODELS: () => true,
  GET_PARSED_COMMAND_DICTIONARY: () => true,
  GET_PERMISSIBLE_QUERIES: () => true,
  GET_PLAN: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.PLAN], user);
  },
  GET_PLANS_AND_MODELS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.MISSION_MODELS, Queries.PLANS], user);
  },
  GET_PLAN_MERGE_NON_CONFLICTING_ACTIVITIES: () => true,
  GET_PLAN_SNAPSHOT_ACTIVITY_DIRECTIVES: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.PLAN_SNAPSHOT_ACTIVITIES], user);
  },
  GET_PROFILE: () => true,
  GET_PROFILES_EXTERNAL: () => true,
  GET_RESOURCE_TYPES: () => true,
  GET_ROLE_PERMISSIONS: () => true,
  GET_SCHEDULING_SPEC_CONDITIONS_FOR_CONDITION: () => true,
  GET_SCHEDULING_SPEC_GOALS_FOR_GOAL: () => true,
  GET_SIMULATION_DATASET_ID: () => true,
  GET_SPANS: () => true,
  GET_TYPESCRIPT_ACTIVITY_TYPE: () => true,
  GET_TYPESCRIPT_COMMAND_DICTIONARY: () => true,
  GET_TYPESCRIPT_CONSTRAINTS: () => true,
  GET_TYPESCRIPT_SCHEDULING: () => true,
  GET_UPLOADED_FILENAME: () => true,
  GET_USER_SEQUENCE: () => true,
  GET_USER_SEQUENCE_FROM_SEQ_JSON: () => true,
  GET_USER_SEQUENCE_SEQ_JSON: () => true,
  GET_VIEW: () => true,
  INITIAL_SIMULATION_UPDATE: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.UPDATE_SIMULATIONS], user);
  },
  INSERT_EXPANSION_SEQUENCE_TO_ACTIVITY: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.INSERT_SEQUENCE_TO_SIMULATED_ACTIVITY], user);
  },
  PLAN_MERGE_BEGIN: (
    user: User | null,
    sourcePlan: PlanWithOwners,
    targetPlan: PlanWithOwners,
    model: ModelWithOwner,
  ): boolean => {
    const queries = [Queries.BEGIN_MERGE];
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
    const queries = [Queries.CANCEL_MERGE];
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
    const queries = [Queries.COMMIT_MERGE];
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
    const queries = [Queries.DENY_MERGE];
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
    const queries = [Queries.WITHDRAW_MERGE_REQUEST];
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
    const queries = [Queries.SET_RESOLUTIONS];
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
    const queries = [Queries.SET_RESOLUTION];
    return (
      isUserAdmin(user) ||
      (getPermission(queries, user) && getRolePlanBranchPermission(queries, user, sourcePlan, targetPlan, model))
    );
  },
  RESTORE_ACTIVITY_FROM_CHANGELOG: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission([Queries.RESTORE_ACTIVITY_FROM_CHANGELOG], user) &&
        (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  RESTORE_PLAN_SNAPSHOT: (user: User | null, plan: PlanWithOwners, model: ModelWithOwner): boolean => {
    const queries = [Queries.RESTORE_FROM_SNAPSHOT];
    return isUserAdmin(user) || (getPermission(queries, user) && getRolePlanPermission(queries, user, plan, model));
  },
  SCHEDULE: (user: User | null, plan: PlanWithOwners, model: ModelWithOwner): boolean => {
    const queries = [Queries.SCHEDULE];
    return isUserAdmin(user) || (getPermission(queries, user) && getRolePlanPermission(queries, user, plan, model));
  },
  SIMULATE: (user: User | null, plan: PlanWithOwners, model: ModelWithOwner): boolean => {
    const queries = [Queries.SIMULATE];
    return isUserAdmin(user) || (getPermission(queries, user) && getRolePlanPermission(queries, user, plan, model));
  },
  SUB_ACTIVITY_DIRECTIVES: () => true,
  SUB_ACTIVITY_DIRECTIVE_METADATA_SCHEMAS: () => true,
  SUB_ACTIVITY_DIRECTIVE_VALIDATIONS: () => true,
  SUB_ACTIVITY_PRESETS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.ACTIVITY_PRESETS], user);
  },
  SUB_ACTIVITY_TYPES: () => true,
  SUB_ANCHOR_VALIDATION_STATUS: () => true,
  SUB_COMMAND_DICTIONARIES: () => true,
  SUB_CONSTRAINT: () => true,
  SUB_CONSTRAINTS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.CONSTRAINT_METADATAS], user);
  },
  SUB_CONSTRAINT_DEFINITION: () => true,
  SUB_CONSTRAINT_PLAN_SPECIFICATIONS: () => true,
  SUB_EXPANSION_RULES: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.EXPANSION_RULES], user);
  },
  SUB_EXPANSION_RULE_TAGS: () => true,
  SUB_EXPANSION_SEQUENCES: () => true,
  SUB_EXPANSION_SETS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.EXPANSION_SETS], user);
  },
  SUB_MODELS: () => true,
  SUB_PLAN_DATASET: () => true,
  SUB_PLAN_LOCKED: () => true,
  SUB_PLAN_MERGE_CONFLICTING_ACTIVITIES: () => true,
  SUB_PLAN_MERGE_REQUESTS_INCOMING: () => true,
  SUB_PLAN_MERGE_REQUESTS_OUTGOING: () => true,
  SUB_PLAN_MERGE_REQUEST_IN_PROGRESS: () => true,
  SUB_PLAN_MERGE_REQUEST_STATUS: () => true,
  SUB_PLAN_REVISION: () => true,
  SUB_PLAN_SNAPSHOTS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.PLAN_SNAPSHOTS], user);
  },
  SUB_PLAN_TAGS: () => true,
  SUB_SCHEDULING_CONDITION: () => true,
  SUB_SCHEDULING_CONDITIONS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.SCHEDULING_CONDITION_METADATAS], user);
  },
  SUB_SCHEDULING_GOAL: () => true,
  SUB_SCHEDULING_GOALS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.SCHEDULING_GOAL_METADATAS], user);
  },
  SUB_SCHEDULING_PLAN_SPECIFICATION: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.SCHEDULING_SPECIFICATION], user);
  },
  SUB_SCHEDULING_REQUESTS: () => true,
  SUB_SIMULATION: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.SIMULATIONS], user);
  },
  SUB_SIMULATION_DATASET: () => true,
  SUB_SIMULATION_DATASETS: () => true,
  SUB_SIMULATION_DATASETS_ALL: () => true,
  SUB_SIMULATION_DATASET_LATEST: () => true,
  SUB_SIMULATION_TEMPLATES: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.SIMULATION_TEMPLATES], user);
  },
  SUB_TAGS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.TAGS], user);
  },
  SUB_USER_SEQUENCES: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.USER_SEQUENCES], user);
  },
  SUB_VIEWS: (user: User | null): boolean => {
    return isUserAdmin(user) || getPermission([Queries.VIEWS], user);
  },
  UPDATE_ACTIVITY_DIRECTIVE: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission([Queries.UPDATE_ACTIVITY_DIRECTIVE], user) &&
        (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  UPDATE_ACTIVITY_PRESET: (user: User | null, preset: AssetWithOwner<ActivityPreset>): boolean => {
    return isUserAdmin(user) || (getPermission([Queries.UPDATE_ACTIVITY_PRESET], user) && isUserOwner(user, preset));
  },
  UPDATE_CONSTRAINT_DEFINITION_TAGS: (
    user: User | null,
    definition: AssetWithAuthor<ConstraintDefinition>,
  ): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission([Queries.INSERT_CONSTRAINT_DEFINITION_TAGS, Queries.DELETE_CONSTRAINT_DEFINITION_TAGS], user) &&
        isUserAuthor(user, definition))
    );
  },
  UPDATE_CONSTRAINT_METADATA: (user: User | null, constraintMetadata: AssetWithOwner<ConstraintMetadata>): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission(
        [Queries.UPDATE_CONSTRAINT_METADATA, Queries.INSERT_CONSTRAINT_TAGS, Queries.DELETE_CONSTRAINT_TAGS],
        user,
      ) &&
        (constraintMetadata?.public || isUserOwner(user, constraintMetadata)))
    );
  },
  UPDATE_CONSTRAINT_PLAN_SPECIFICATION: () => true,
  UPDATE_CONSTRAINT_PLAN_SPECIFICATIONS: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission([Queries.INSERT_CONSTRAINT_SPECIFICATIONS, Queries.DELETE_CONSTRAINT_SPECIFICATIONS], user) &&
        (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  UPDATE_EXPANSION_RULE: (user: User | null, expansionRule: AssetWithOwner<ExpansionRule>): boolean => {
    return (
      isUserAdmin(user) || (getPermission([Queries.UPDATE_EXPANSION_RULE], user) && isUserOwner(user, expansionRule))
    );
  },
  UPDATE_PLAN_SNAPSHOT: (user: User | null): boolean => {
    return getPermission([Queries.UPDATE_PLAN_SNAPSHOT], user);
  },
  UPDATE_SCHEDULING_CONDITION_DEFINITION_TAGS: (
    user: User | null,
    definition: AssetWithAuthor<SchedulingConditionDefinition>,
  ): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission(
        [Queries.INSERT_SCHEDULING_CONDITION_DEFINITION_TAGS, Queries.DELETE_SCHEDULING_CONDITION_DEFINITION_TAGS],
        user,
      ) &&
        isUserAuthor(user, definition))
    );
  },
  UPDATE_SCHEDULING_CONDITION_METADATA: (
    user: User | null,
    condition?: AssetWithOwner<SchedulingConditionMetadata>,
  ): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission(
        [
          Queries.UPDATE_SCHEDULING_CONDITION_METADATA,
          Queries.INSERT_SCHEDULING_CONDITION_TAGS,
          Queries.DELETE_SCHEDULING_CONDITION_METADATA_TAGS,
        ],
        user,
      ) &&
        // If there is a plan, ensure user is the plan owner or is a collaborator
        // Otherwise if no plan, user may update if they are condition author since associated plan may have been deleted
        (condition?.public || isUserOwner(user, condition)))
    );
  },
  UPDATE_SCHEDULING_CONDITION_PLAN_SPECIFICATION: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission([Queries.UPDATE_SCHEDULING_SPECIFICATION_CONDITION], user) &&
        (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  UPDATE_SCHEDULING_CONDITION_PLAN_SPECIFICATIONS: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission(
        [Queries.INSERT_SCHEDULING_SPECIFICATION_CONDITIONS, Queries.DELETE_SCHEDULING_SPECIFICATION_CONDITIONS],
        user,
      ) &&
        (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  UPDATE_SCHEDULING_GOAL_DEFINITION_TAGS: (
    user: User | null,
    definition: AssetWithAuthor<SchedulingGoalDefinition>,
  ): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission(
        [Queries.INSERT_SCHEDULING_GOAL_DEFINITION_TAGS, Queries.DELETE_SCHEDULING_GOAL_DEFINITION_TAGS],
        user,
      ) &&
        isUserAuthor(user, definition))
    );
  },
  UPDATE_SCHEDULING_GOAL_METADATA: (user: User | null, goal?: AssetWithOwner<SchedulingGoalMetadata>): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission(
        [
          Queries.UPDATE_SCHEDULING_GOAL_METADATA,
          Queries.INSERT_SCHEDULING_GOAL_TAGS,
          Queries.DELETE_SCHEDULING_GOAL_METADATA_TAGS,
        ],
        user,
      ) &&
        // If there is a plan, ensure user is the plan owner or is a collaborator
        // Otherwise if no plan, user may update if they are goal author since associated plan may have been deleted
        (goal?.public || isUserOwner(user, goal)))
    );
  },
  UPDATE_SCHEDULING_GOAL_PLAN_SPECIFICATION: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission([Queries.UPDATE_SCHEDULING_SPECIFICATION_GOAL], user) &&
        (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  UPDATE_SCHEDULING_GOAL_PLAN_SPECIFICATIONS: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission(
        [Queries.INSERT_SCHEDULING_SPECIFICATION_GOALS, Queries.DELETE_SCHEDULING_SPECIFICATION_GOALS],
        user,
      ) &&
        (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  UPDATE_SCHEDULING_SPECIFICATION: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission([Queries.UPDATE_SCHEDULING_SPECIFICATION], user) &&
        (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  UPDATE_SIMULATION: (user: User | null, plan: PlanWithOwners): boolean => {
    return (
      isUserAdmin(user) ||
      (getPermission([Queries.UPDATE_SIMULATION], user) && (isPlanOwner(user, plan) || isPlanCollaborator(user, plan)))
    );
  },
  UPDATE_SIMULATION_TEMPLATE: (user: User | null, plan: PlanWithOwners): boolean => {
    return isUserAdmin(user) || (getPermission([Queries.UPDATE_SIMULATION_TEMPLATE], user) && isUserOwner(user, plan));
  },
  UPDATE_TAG: (user: User | null, tag: AssetWithOwner<Tag>): boolean => {
    return isUserAdmin(user) || (getPermission([Queries.UPDATE_TAGS], user) && isUserOwner(user, tag));
  },
  UPDATE_USER_SEQUENCE: (user: User | null, sequence: AssetWithOwner<UserSequence>): boolean => {
    return isUserAdmin(user) || (getPermission([Queries.UPDATE_USER_SEQUENCE], user) && isUserOwner(user, sequence));
  },
  UPDATE_VIEW: (user: User | null, view: AssetWithOwner<View>): boolean => {
    return isUserAdmin(user) || (getPermission([Queries.UPDATE_VIEW], user) && isUserOwner(user, view));
  },
  VALIDATE_ACTIVITY_ARGUMENTS: () => true,
};

type ShapeOf<T> = Record<keyof T, any>;
type AssertKeysEqual<X extends ShapeOf<Y>, Y extends ShapeOf<X>> = never;
type GQLKeys = Record<keyof typeof gql, any>;
type QueryKeys = Record<keyof typeof queryPermissions, any>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Assertion = AssertKeysEqual<GQLKeys, QueryKeys>;

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

interface PlanSpecificationCRUDPermission<T = null> {
  canRead: ReadPermissionCheck<T>;
  canUpdate: (user: User | null, plan: PlanWithOwners) => boolean;
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
interface RunnableSpecificationCRUDPermission<T = null> extends PlanSpecificationCRUDPermission<T> {
  canRun: (user: User | null, plan: PlanWithOwners, model: ModelWithOwner) => boolean;
}

interface PlanSnapshotCRUDPermission extends Omit<PlanAssetCRUDPermission<PlanSnapshot>, 'canCreate' | 'canDelete'> {
  canCreate: RolePlanPermissionCheck;
  canDelete: (user: User | null) => boolean;
  canRestore: RolePlanPermissionCheck;
}

interface ConstraintPlanSpecCRUDPermission extends PlanSpecificationCRUDPermission {
  canCheck: RolePlanPermissionCheck;
}

interface ExpansionSetsCRUDPermission<T = null> extends Omit<CRUDPermission<T>, 'canCreate'> {
  canCreate: RoleModelPermissionCheck;
  canUpdate: () => boolean;
}

interface ExpansionSequenceCRUDPermission<T = null> extends CRUDPermission<T> {
  canExpand: RolePlanPermissionCheck;
}

interface SchedulingCRUDPermission<T = null> extends RunnableSpecificationCRUDPermission<T> {
  canAnalyze: (user: User | null, plan: PlanWithOwners, model: ModelWithOwner) => boolean;
}

interface AssociationCRUDPermission<M, D> extends CRUDPermission<AssetWithOwner<M>> {
  canUpdateDefinition: (user: User | null, definition: AssetWithAuthor<D>) => boolean;
}

interface FeaturePermissions {
  activityDirective: PlanAssetCRUDPermission<ActivityDirective>;
  activityPresets: PlanActivityPresetsCRUDPermission;
  commandDictionary: CRUDPermission<void>;
  constraintPlanSpec: ConstraintPlanSpecCRUDPermission;
  constraints: AssociationCRUDPermission<ConstraintMetadata, ConstraintDefinition>;
  expansionRules: CRUDPermission<AssetWithOwner>;
  expansionSequences: ExpansionSequenceCRUDPermission<AssetWithOwner<ExpansionSequence>>;
  expansionSets: ExpansionSetsCRUDPermission<AssetWithOwner<ExpansionSet>>;
  model: CRUDPermission<void>;
  plan: CRUDPermission<PlanWithOwners>;
  planBranch: PlanBranchCRUDPermission;
  planSnapshot: PlanSnapshotCRUDPermission;
  schedulingConditions: AssociationCRUDPermission<SchedulingConditionMetadata, SchedulingConditionDefinition>;
  schedulingConditionsPlanSpec: PlanSpecificationCRUDPermission<AssetWithOwner<SchedulingConditionMetadata>>;
  schedulingGoals: AssociationCRUDPermission<SchedulingGoalMetadata, SchedulingGoalDefinition>;
  schedulingGoalsPlanSpec: SchedulingCRUDPermission<AssetWithOwner<SchedulingGoalMetadata>>;
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
  constraintPlanSpec: {
    canCheck: (user, plan, model) => queryPermissions.CHECK_CONSTRAINTS(user, plan, model),
    canRead: user => queryPermissions.SUB_CONSTRAINTS(user),
    canUpdate: (user, plan) => queryPermissions.UPDATE_CONSTRAINT_PLAN_SPECIFICATIONS(user, plan),
  },
  constraints: {
    canCreate: user => queryPermissions.CREATE_CONSTRAINT(user),
    canDelete: (user, constraintMetadata) => queryPermissions.DELETE_CONSTRAINT_METADATA(user, constraintMetadata),
    canRead: user => queryPermissions.SUB_CONSTRAINTS(user),
    canUpdate: (user, constraintMetadata) => queryPermissions.UPDATE_CONSTRAINT_METADATA(user, constraintMetadata),
    canUpdateDefinition: (user, definition) => queryPermissions.UPDATE_CONSTRAINT_DEFINITION_TAGS(user, definition),
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
    canUpdate: (user, plan) => queryPermissions.CREATE_PLAN_TAGS(user, plan),
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
    canRead: user =>
      queryPermissions.GET_PLAN_SNAPSHOT_ACTIVITY_DIRECTIVES(user) && queryPermissions.SUB_PLAN_SNAPSHOTS(user),
    canRestore: (user, plan, model) => queryPermissions.RESTORE_PLAN_SNAPSHOT(user, plan, model),
    canUpdate: () => false, // no feature to update snapshots exists,
  },
  schedulingConditions: {
    canCreate: user => queryPermissions.CREATE_SCHEDULING_CONDITION(user),
    canDelete: (user, condition) => queryPermissions.DELETE_SCHEDULING_CONDITION_METADATA(user, condition),
    canRead: user => queryPermissions.SUB_SCHEDULING_CONDITIONS(user),
    canUpdate: (user, condition) => queryPermissions.UPDATE_SCHEDULING_CONDITION_METADATA(user, condition),
    canUpdateDefinition: (user, definition) =>
      queryPermissions.UPDATE_SCHEDULING_CONDITION_DEFINITION_TAGS(user, definition),
  },
  schedulingConditionsPlanSpec: {
    canRead: user => queryPermissions.SUB_SCHEDULING_PLAN_SPECIFICATION(user),
    canUpdate: (user, plan) => queryPermissions.UPDATE_SCHEDULING_CONDITION_PLAN_SPECIFICATIONS(user, plan),
  },
  schedulingGoals: {
    canCreate: user => queryPermissions.CREATE_SCHEDULING_GOAL(user),
    canDelete: (user, goal) => queryPermissions.DELETE_SCHEDULING_GOAL_METADATA(user, goal),
    canRead: user => queryPermissions.SUB_SCHEDULING_GOALS(user),
    canUpdate: (user, goal) => queryPermissions.UPDATE_SCHEDULING_GOAL_METADATA(user, goal),
    canUpdateDefinition: (user, definition) =>
      queryPermissions.UPDATE_SCHEDULING_GOAL_DEFINITION_TAGS(user, definition),
  },
  schedulingGoalsPlanSpec: {
    canAnalyze: (user, plan, model) =>
      queryPermissions.UPDATE_SCHEDULING_SPECIFICATION(user, plan) && queryPermissions.SCHEDULE(user, plan, model),
    canRead: user => queryPermissions.SUB_SCHEDULING_PLAN_SPECIFICATION(user),
    canRun: (user, plan, model) =>
      queryPermissions.UPDATE_SCHEDULING_SPECIFICATION(user, plan) && queryPermissions.SCHEDULE(user, plan, model),
    canUpdate: (user, plan) => queryPermissions.UPDATE_SCHEDULING_GOAL_PLAN_SPECIFICATION(user, plan),
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
    canDelete: (user, tag) => queryPermissions.DELETE_TAG(user, tag),
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
