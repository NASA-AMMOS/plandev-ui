import { goto } from '$app/navigation';
import { base } from '$app/paths';
import { env } from '$env/dynamic/public';
import type { ActionValueSchema } from '@nasa-jpl/aerie-actions';
import {
  type ChannelDictionary as AmpcsChannelDictionary,
  type CommandDictionary as AmpcsCommandDictionary,
  type ParameterDictionary as AmpcsParameterDictionary,
} from '@nasa-jpl/aerie-ampcs';
import type { SeqJson } from '@nasa-jpl/seq-json-schema/types';
import { chunk } from 'lodash-es';
import { get } from 'svelte/store';
import { PATH_DELIMITER } from '../constants/workspaces';
import { ConstraintDefinitionType } from '../enums/constraint';
import { DictionaryTypes } from '../enums/dictionaryTypes';
import { SchedulingDefinitionType } from '../enums/scheduling';
import { SearchParameters } from '../enums/searchParameters';
import { Status } from '../enums/status';
import { WorkspaceContentType } from '../enums/workspace';
import {
  activityDirectivesDB as activityDirectivesDBStore,
  selectedActivityDirectiveId as selectedActivityDirectiveIdStore,
} from '../stores/activities';
import {
  checkConstraintsQueryStatus as checkConstraintsQueryStatusStore,
  resetConstraintStoresForSimulation,
} from '../stores/constraints';
import { catchError, catchSchedulingError } from '../stores/errors';
import {
  createExpansionRuleError as createExpansionRuleErrorStore,
  creatingExpansionSequence as creatingExpansionSequenceStore,
  planExpansionStatus as planExpansionStatusStore,
  savingExpansionRule as savingExpansionRuleStore,
  savingExpansionSet as savingExpansionSetStore,
} from '../stores/expansion';
import {
  createDerivationGroupError as createDerivationGroupErrorStore,
  createExternalSourceError as createExternalSourceErrorStore,
  createExternalSourceEventTypeError as createExternalSourceEventTypeErrorStore,
  creatingExternalSource as creatingExternalSourceStore,
  derivationGroupPlanLinkError as derivationGroupPlanLinkErrorStore,
} from '../stores/external-source';
import {
  createModelError as createModelErrorStore,
  creatingModel as creatingModelStore,
  models as modelsStore,
} from '../stores/model';
import {
  createPlanError as createPlanErrorStore,
  creatingPlan as creatingPlanStore,
  plan,
  planId as planIdStore,
} from '../stores/plan';
import {
  schedulingRequests as schedulingRequestsStore,
  selectedSchedulingSpecId as selectedSpecIdStore,
} from '../stores/scheduling';
import { sequenceAdaptations as sequenceAdaptationsStore } from '../stores/sequence-adaptation';
import { sequenceTemplateExpansionError, sequenceTemplateExpansionStatus } from '../stores/sequence-template';
import {
  channelDictionaries as channelDictionariesStore,
  commandDictionaries as commandDictionariesStore,
  creatingWorkspace,
  parameterDictionaries as parameterDictionariesStore,
} from '../stores/sequencing';
import {
  selectedSpanId as selectedSpanIdStore,
  simulationDatasetId as simulationDatasetIdStore,
  simulationDataset as simulationDatasetStore,
  spansMap,
  spanUtilityMaps,
} from '../stores/simulation';
import { createTagError as createTagErrorStore } from '../stores/tags';
import { applyViewUpdate, view as viewStore, viewUpdateRow, viewUpdateTimeline } from '../stores/views';
import type { ActionDefinition, ActionDefinitionSetInput, ActionParametersMap, ActionRun } from '../types/actions';
import type {
  ActivityDirective,
  ActivityDirectiveDB,
  ActivityDirectiveId,
  ActivityDirectiveInsertInput,
  ActivityDirectiveRevision,
  ActivityDirectiveSetInput,
  ActivityDirectiveValidationStatus,
  ActivityPreset,
  ActivityPresetId,
  ActivityPresetInsertInput,
  ActivityPresetSetInput,
  ActivityType,
  ActivityTypeExpansionRules,
  PlanSnapshotActivity,
} from '../types/activity';
import type { ActivityMetadata } from '../types/activity-metadata';
import type { BaseUser, User, UserId, Version } from '../types/app';
import type { ReqAuthResponse, ReqSessionResponse } from '../types/auth';
import type {
  CheckConstraintResponse,
  ConstraintDefinition,
  ConstraintDefinitionInsertInput,
  ConstraintInsertInput,
  ConstraintMetadata,
  ConstraintMetadataSetInput,
  ConstraintModelSpecInsertInput,
  ConstraintModelSpecSetInput,
  ConstraintPlanSpecification,
  ConstraintPlanSpecInsertInput,
  ConstraintPlanSpecSetInput,
  ConstraintResult,
} from '../types/constraint';
import type {
  ExpandedSequence,
  ExpansionRule,
  ExpansionRuleInsertInput,
  ExpansionRuleSetInput,
  ExpansionRun,
  ExpansionSequence,
  ExpansionSequenceInsertInput,
  ExpansionSequenceToActivityInsertInput,
  ExpansionSet,
  SeqId,
  SequenceFilter,
  SequenceFilterInsertInput,
} from '../types/expansion';
import type { Extension, ExtensionPayload } from '../types/extension';
import type { ExternalEvent, ExternalEventDB, ExternalEventType } from '../types/external-event';
import type {
  DerivationGroup,
  DerivationGroupInsertInput,
  ExternalSourcePkey,
  ExternalSourceSlim,
  PlanDerivationGroup,
} from '../types/external-source';
import type { Model, ModelInsertInput, ModelLog, ModelSchema, ModelSetInput, ModelSlim } from '../types/model';
import type { DslTypeScriptResponse, TypeScriptFile } from '../types/monaco';
import type {
  Argument,
  ArgumentsMap,
  DefaultEffectiveArguments,
  EffectiveArguments,
  ParametersMap,
  ParameterValidationError,
  ParameterValidationResponse,
} from '../types/parameter';
import type {
  PermissibleQueriesMap,
  PermissibleQueryResponse,
  PlanWithOwners,
  RolePermissionResponse,
  RolePermissionsMap,
} from '../types/permissions';
import type {
  ModelCompatabilityForPlan,
  Plan,
  PlanBranchRequestAction,
  PlanCollaborator,
  PlanForMerging,
  PlanInsertInput,
  PlanMergeConflictingActivity,
  PlanMergeNonConflictingActivity,
  PlanMergeRequestSchema,
  PlanMergeResolution,
  PlanMetadata,
  PlanSchema,
  PlanSlim,
} from '../types/plan';
import type { PlanSnapshot } from '../types/plan-snapshot';
import type {
  SchedulingConditionDefinition,
  SchedulingConditionDefinitionInsertInput,
  SchedulingConditionInsertInput,
  SchedulingConditionMetadata,
  SchedulingConditionMetadataResponse,
  SchedulingConditionMetadataSetInput,
  SchedulingConditionModelSpecificationInsertInput,
  SchedulingConditionModelSpecificationSetInput,
  SchedulingConditionPlanSpecification,
  SchedulingConditionPlanSpecInsertInput,
  SchedulingGoalDefinition,
  SchedulingGoalDefinitionInsertInput,
  SchedulingGoalInsertInput,
  SchedulingGoalMetadata,
  SchedulingGoalMetadataResponse,
  SchedulingGoalMetadataSetInput,
  SchedulingGoalModelSpecificationInsertInput,
  SchedulingGoalModelSpecificationSetInput,
  SchedulingGoalPlanSpecification,
  SchedulingGoalPlanSpecInsertInput,
  SchedulingGoalPlanSpecSetInput,
  SchedulingPlanSpecification,
  SchedulingPlanSpecificationInsertInput,
  SchedulingRequest,
  SchedulingResponse,
} from '../types/scheduling';
import type { ValueSchema, ValueSchemaStruct } from '../types/schema';
import type { SequenceTemplate } from '../types/sequence-template';
import {
  type ChannelDictionaryMetadata,
  type CommandDictionaryMetadata,
  type GetSeqJsonResponse,
  type ParameterDictionaryMetadata,
  type Parcel,
  type ParcelInsertInput,
  type ParcelToParameterDictionary,
  type SequenceAdaptationMetadata,
  type UserSequence,
} from '../types/sequencing';
import type {
  PlanDataset,
  Profile,
  Resource,
  ResourceType,
  SimulateResponse,
  Simulation,
  SimulationEvent,
  SimulationInitialUpdateInput,
  SimulationTemplate,
  SimulationTemplateInsertInput,
  SimulationTemplateSetInput,
  Span,
  SpanDB,
  Topic,
} from '../types/simulation';
import type {
  ActivityDirectiveTagsInsertInput,
  ConstraintDefinitionTagsInsertInput,
  ConstraintMetadataTagsInsertInput,
  ConstraintTagsInsertInput,
  ExpansionRuleTagsInsertInput,
  PlanSnapshotTagsInsertInput,
  PlanTagsInsertInput,
  SchedulingConditionDefinitionTagsInsertInput,
  SchedulingConditionMetadataTagsInsertInput,
  SchedulingGoalDefinitionTagsInsertInput,
  SchedulingGoalMetadataTagsInsertInput,
  SchedulingTagsInsertInput,
  Tag,
  TagsInsertInput,
  TagsSetInput,
} from '../types/tags';
import type { ActivityLayerFilter, Layer, Row, Timeline } from '../types/timeline';
import type { View, ViewDefinition, ViewInsertInput, ViewSlim, ViewUpdateInput } from '../types/view';
import type { Workspace, WorkspaceInsertInput } from '../types/workspace';
import type { WorkspaceTreeMap, WorkspaceTreeNode, WorkspaceTreeNodeWithFullPath } from '../types/workspace-tree-view';
import { ActivityDeletionAction, addAbsoluteTimeToRevision } from './activities';
import { compare, convertToQuery } from './generic';
import gql, { convertToGQLArray } from './gql';
import {
  showCancelActionRunModal,
  showConfirmModal,
  showCreatePlanBranchModal,
  showCreatePlanSnapshotModal,
  showCreateViewModal,
  showDeleteActivitiesModal,
  showDeleteDerivationGroupModal,
  showDeleteExternalEventSourceTypeModal,
  showDeleteExternalSourceModal,
  showEditViewModal,
  showImportWorkspaceFileModal,
  showLibrarySequenceModel,
  showManagePlanConstraintsModal,
  showManagePlanDerivationGroups,
  showManagePlanSchedulingConditionsModal,
  showManagePlanSchedulingGoalsModal,
  showMoveItemToWorkspaceModal,
  showMoveWorkspaceItemModal,
  showNewWorkspaceFolderModal,
  showNewWorkspaceSequenceModal,
  showPlanBranchRequestModal,
  showRenameWorkspaceItemModal,
  showRestorePlanSnapshotModal,
  showRunActionModal,
  showRunActionResultsModal,
  showTimeRangeModal,
  showUpdatePlanMissionModelModal,
  showUploadViewModal,
} from './modal';
import { featurePermissions, gatewayPermissions, queryPermissions } from './permissions';
import { reqExtension, reqGateway, reqHasura, reqWorkspace } from './requests';
import { sampleProfiles } from './resources';
import { convertResponseToMetadata } from './scheduling';
import { parseCdlDictionary, toAmpcsXml } from './sequence-editor/languages/vml/cdl-dictionary';
import { compareEvents } from './simulation';
import { pluralize } from './text';
import {
  convertUTCToMs,
  getDoyTime,
  getDoyTimeFromInterval,
  getIntervalFromDoyRange,
  getIntervalInMs,
  getUnixEpochTimeFromInterval,
} from './time';
import { createRow, duplicateRow } from './timeline';
import { showFailureToast, showSuccessToast } from './toast';
import { getSearchParameterNumber, setQueryParam } from './url';
import {
  applyViewDefinitionMigrations,
  applyViewMigrations,
  generateDefaultView,
  validateViewJSONAgainstSchema,
} from './view';
import { cleanPath, joinPath, mapWorkspaceTreePaths } from './workspaces';

function throwPermissionError(attemptedAction: string): never {
  throw Error(`You do not have permission to: ${attemptedAction}.`);
}

function createFormDataWithFile(fileName: string, fileContent: string, fileKey: string = 'file'): FormData {
  const file = new File([fileContent], fileName);
  const body = new FormData();
  body.append(fileKey, file, file.name);

  return body;
}

function createWorkspaceSequenceFileFormData(filePath: string, fileContent: string) {
  const pathParts = filePath.split(PATH_DELIMITER);
  const fileName = pathParts[pathParts.length - 1];

  return createFormDataWithFile(fileName, fileContent);
}

/**
 * Functions that have side-effects (e.g. HTTP requests, toasts, popovers, store updates, etc.).
 */
const effects = {
  async applyActivitiesByFilter(
    filter: SequenceFilter,
    simulationDatasetId: number,
    planId: number,
    defaultStartTime: string,
    defaultEndtime: string,
    user: User | null,
  ): Promise<void> {
    try {
      const { confirm: timeConfirmed, value } = await showTimeRangeModal(defaultStartTime, defaultEndtime);

      if (timeConfirmed && value !== undefined) {
        const { timeRangeEnd, timeRangeStart } = value;
        if (timeRangeStart !== null && timeRangeEnd !== null) {
          const sequenceId = await effects.createExpansionSequence(
            `${filter.name} Sequence (Plan ${planId})`,
            simulationDatasetId,
            user,
          );

          if (!sequenceId) {
            throw Error('Failed to create sequence');
          }

          const data = await reqHasura<{ success: boolean }>(
            gql.APPLY_ACTIVITIES_BY_FILTER,
            {
              filterId: filter.id,
              seqId: sequenceId,
              simulationDatasetId,
              timeRangeEnd,
              timeRangeStart,
            },
            user,
          );

          if (data !== null) {
            showSuccessToast('Filter Applied Successfully');
          } else {
            throw Error('Filter could not be applied successfully');
          }
        }
      }
    } catch (e) {
      catchError('Filter Application Failed');
      showFailureToast('Filter Application Failed');
    }
  },

  async applyPresetToActivity(
    preset: ActivityPreset,
    activityId: ActivityDirectiveId,
    plan: Plan,
    numOfUserChanges: number,
    user: User | null,
  ): Promise<void> {
    try {
      if (!queryPermissions.APPLY_PRESET_TO_ACTIVITY(user, plan, plan.model, preset)) {
        throwPermissionError('apply a preset to an activity directive');
      }

      let confirm: boolean = true;

      if (numOfUserChanges > 0) {
        ({ confirm } = await showConfirmModal(
          'Apply Preset',
          `There ${
            numOfUserChanges > 1 ? 'are' : 'is'
          } currently ${numOfUserChanges} manually edited parameter${pluralize(
            numOfUserChanges,
          )}. This will remove existing edits and apply preset parameters.`,
          'Apply Preset to Activity Directive',
        ));
      }

      if (confirm) {
        const data = await reqHasura(
          gql.APPLY_PRESET_TO_ACTIVITY,
          {
            activityId,
            planId: plan.id,
            presetId: preset.id,
          },
          user,
        );
        if (data.apply_preset_to_activity != null) {
          showSuccessToast('Preset Successfully Applied to Activity');
        } else {
          throw Error(`Unable to apply preset with ID: "${preset.id}" to directive with ID: "${activityId}"`);
        }
      }
    } catch (e) {
      catchError('Preset Unable To Be Applied To Activity', e as Error);
      showFailureToast('Preset Application Failed');
    }
  },

  async applyTemplateToSimulation(
    template: SimulationTemplate,
    simulation: Simulation,
    plan: Plan,
    numOfUserChanges: number,
    user: User | null,
  ): Promise<void> {
    try {
      if (!queryPermissions.UPDATE_SIMULATION(user, plan)) {
        throwPermissionError('apply a template to a simulation');
      }

      let confirm: boolean = true;
      if (numOfUserChanges > 0) {
        ({ confirm } = await showConfirmModal(
          'Apply Simulation Template',
          `There ${
            numOfUserChanges > 1 ? 'are' : 'is'
          } currently ${numOfUserChanges} manually edited parameter${pluralize(
            numOfUserChanges,
          )}. This will remove existing edits and apply template parameters.`,
          'Apply Template to Simulation',
        ));
      }

      if (confirm) {
        const newSimulation: Simulation = { ...simulation, arguments: template.arguments, template };

        await effects.updateSimulation(plan, newSimulation, user);
        showSuccessToast('Template Successfully Applied to Simulation');
      }
    } catch (e) {
      catchError('Template Unable To Be Applied To Simulation', e as Error);
      showFailureToast('Template Application Failed');
    }
  },

  async callExtension(
    extension: Extension,
    payload: ExtensionPayload & Record<'url', string>,
    user: User | null,
  ): Promise<void> {
    try {
      const response = await reqExtension(`${base}/extensions`, payload, user);

      if (response.success) {
        showSuccessToast(response.message);
        window.open(response.url, '_blank');
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      const failureMessage = `Extension: ${extension.label} was not executed successfully`;

      catchError(failureMessage, error as Error);
      showFailureToast(failureMessage);
    }
  },

  async cancelActionRun(id: number | undefined, user: User | null): Promise<void> {
    try {
      if (!queryPermissions.UPDATE_ACTION_DEFINITION(user)) {
        throwPermissionError('update this action definition');
      }

      const { confirm } = await showCancelActionRunModal();

      if (confirm && id !== undefined) {
        const result = await reqHasura<ActionRun>(
          gql.CANCEL_ACTION_RUN,
          {
            id,
          },
          user,
        );

        if (result != null) {
          showSuccessToast(`Action Cancelled`);
        } else {
          throw Error(`Unable to cancel action with ID: "${id}"`);
        }
      }
    } catch (e) {
      catchError('Action Cancellation Failed', e as Error);
      showFailureToast('Action Cancellation Failed');
    }
  },

  async cancelSchedulingRequest(analysisId: number, user: User | null): Promise<void> {
    try {
      if (!queryPermissions.CANCEL_SCHEDULING_REQUEST(user)) {
        throwPermissionError('cancel a scheduling request dataset');
      }
      const { confirm } = await showConfirmModal(
        'Cancel Scheduling Request',
        `This will cancel the scheduling request with Analysis ID: ${analysisId}.`,
        'Cancel Scheduling Request',
        true,
        'Keep Scheduling',
      );

      if (confirm) {
        await reqHasura<SeqId>(gql.CANCEL_SCHEDULING_REQUEST, { id: analysisId }, user);
        showSuccessToast('Scheduling Request Successfully Canceled');
      }
    } catch (e) {
      catchError('Scheduling Request Unable To Be Canceled', e as Error);
      showFailureToast('Scheduling Request Cancel Failed');
    }
  },

  async cancelSimulation(simulationDatasetId: number, user: User | null): Promise<void> {
    try {
      if (!queryPermissions.CANCEL_SIMULATION(user)) {
        throwPermissionError('cancel a simulation');
      }
      const { confirm } = await showConfirmModal(
        'Cancel Simulation',
        `This will cancel the simulation with ID: ${simulationDatasetId}. Once canceled, the simulation cannot be restarted.`,
        'Cancel Simulation',
        true,
        'Keep Simulating',
      );

      if (confirm) {
        await reqHasura<SeqId>(gql.CANCEL_SIMULATION, { id: simulationDatasetId }, user);
        showSuccessToast('Simulation Successfully Canceled');
      }
    } catch (e) {
      catchError('Simulation Unable To Be Canceled', e as Error);
      showFailureToast('Simulation Cancel Failed');
    }
  },

  async checkConstraints(plan: Plan, user: User | null, force: boolean = false): Promise<void> {
    try {
      checkConstraintsQueryStatusStore.set(Status.Incomplete);
      if (plan !== null) {
        const { id: planId } = plan;
        const data = await reqHasura<CheckConstraintResponse>(
          gql.CHECK_CONSTRAINTS,
          {
            force,
            planId,
          },
          user,
        );
        if (data.constraintRunResponses) {
          const {
            constraintRunResponses: { constraintsRun },
          } = data;

          // find only the constraints compiled.
          const successfulConstraintResults: ConstraintResult[] = constraintsRun
            .filter(constraintResponse => constraintResponse.success)
            .map(constraintResponse => constraintResponse.results);

          const failedConstraintResponses = constraintsRun.filter(constraintResponse => !constraintResponse.success);
          if (successfulConstraintResults.length === 0 && constraintsRun.length > 0) {
            showFailureToast('All Constraints Failed');
            checkConstraintsQueryStatusStore.set(Status.Failed);
          } else if (successfulConstraintResults.length !== constraintsRun.length) {
            showFailureToast('Constraints Partially Checked');
            checkConstraintsQueryStatusStore.set(Status.Failed);
          } else {
            showSuccessToast('All Constraints Checked');
            checkConstraintsQueryStatusStore.set(Status.Complete);
          }

          if (failedConstraintResponses.length > 0) {
            failedConstraintResponses.forEach(failedConstraint => {
              failedConstraint.errors.forEach(error => {
                catchError(`${error.message}`, error.stack);
              });
            });
          }
        } else {
          throw Error(`Unable to check constraints for plan with ID: "${plan.id}"`);
        }
      } else {
        throw Error('Plan is not defined.');
      }
    } catch (e) {
      checkConstraintsQueryStatusStore.set(Status.Failed);
      catchError('Check Constraints Failed', e as Error);
      showFailureToast('Check Constraints Failed');
    }
  },

  async checkMigrationCompatability(
    planId: number,
    newModelId: number,
    user: User | null,
  ): Promise<ModelCompatabilityForPlan | undefined> {
    try {
      const data = await reqHasura(
        gql.CHECK_MODEL_COMPATIBILITY_FOR_PLAN,
        { new_model_id: newModelId, plan_id: planId },
        user,
      );
      const modelCompatabilityForPlan: ModelCompatabilityForPlan = data.check_model_compatibility_for_plan?.result;
      return modelCompatabilityForPlan;
    } catch (e) {
      catchError('Check Plan Model Migration Compatibility Failed', e as Error);
    }
  },

  async cloneActivityDirectives(
    activities: ActivityDirective[],
    plan: Plan,
    user: User | null,
  ): Promise<ActivityDirectiveDB[] | undefined> {
    try {
      if (plan === null) {
        throw Error(`Plan is not defined`);
      }
      if (!queryPermissions.CREATE_ACTIVITY_DIRECTIVE(user, plan)) {
        throwPermissionError('clone activity directives into the plan');
      }

      const activityRemap: Record<number, number> = {};
      const activityDirectivesInsertInput = activities.map(
        ({ anchored_to_start, arguments: activityArguments, metadata, name, start_offset, type }) => {
          const activityDirectiveInsertInput: ActivityDirectiveInsertInput = {
            anchor_id: null,
            anchored_to_start,
            arguments: activityArguments,
            metadata,
            name,
            plan_id: plan.id,
            start_offset,
            type,
          };
          return activityDirectiveInsertInput;
        },
      );

      const response = await reqHasura<{ returning: ActivityDirectiveDB[] }>(
        gql.CREATE_ACTIVITY_DIRECTIVES,
        { activityDirectivesInsertInput },
        user,
      );

      // re-anchor activity directive clones
      const { insert_activity_directive: createdActivities } = response;
      if (createdActivities !== null) {
        const { returning: clonedActivitiesReferences } = createdActivities;
        clonedActivitiesReferences.forEach((directive, index) => {
          const { id } = activities[index];
          activityRemap[id] = directive.id;
        });

        const anchorUpdates = activities
          .filter(({ anchor_id: anchorId }) => anchorId !== null)
          .map(({ anchor_id: anchorId, id }) => ({
            _set: { anchor_id: activityRemap[anchorId as number] },
            where: { id: { _eq: activityRemap[id] }, plan_id: { _eq: (plan as PlanSchema).id } },
          }));

        await reqHasura<ActivityDirectiveDB>(gql.UPDATE_ACTIVITY_DIRECTIVES, { updates: anchorUpdates }, user);
        showSuccessToast(`Pasted ${activities.length} Activity Directive${activities.length === 1 ? '' : 's'}`);
        return clonedActivitiesReferences;
      }
    } catch (e) {
      catchError('Activity Directive Paste Failed', e as Error);
      showFailureToast('Activity Directive Paste Failed');
    }
  },

  async confirmOpenActionRunResults(actionRunId: number): Promise<boolean | null> {
    try {
      const { confirm } = await showRunActionResultsModal(actionRunId);
      return confirm;
    } catch (e) {
      return null;
    }
  },

  async createActionDefinition(
    file: File,
    name: string,
    description: string,
    workspaceId: number,
    user: User | null,
  ): Promise<boolean> {
    try {
      if (!queryPermissions.CREATE_ACTION_DEFINITION(user)) {
        throwPermissionError('create action definition');
      }

      const actionFileId = await effects.uploadFile(file, user);

      if (actionFileId !== null) {
        const actionDefinitionInsertInput = {
          action_file_id: actionFileId,
          description,
          name,
          workspace_id: workspaceId,
        };
        const data = await reqHasura<ActionDefinition>(
          gql.CREATE_ACTION_DEFINITION,
          { actionDefinitionInsertInput },
          user,
        );
        const { insert_action_definition_one } = data;
        if (insert_action_definition_one) {
          showSuccessToast('Action Created Successfully');
          return true;
        } else {
          throw new Error('Action Creation Failed');
        }
      } else {
        throw new Error('Action Creation Failed');
      }
    } catch (e) {
      catchError('Action Creation Failed', e as Error);
      showFailureToast('Action Creation Failed');
      return false;
    }
  },

  async createActionRun(
    actionDefinitionId: number,
    parameters: any,
    settings: any,
    user: User | null,
  ): Promise<number | null> {
    try {
      if (!queryPermissions.CREATE_ACTION_RUN(user)) {
        throwPermissionError('create action run');
      }

      const actionRunInsertInput = {
        action_definition_id: actionDefinitionId,
        parameters,
        settings,
      };
      const response = await reqHasura<{ id: number }>(gql.CREATE_ACTION_RUN, { actionRunInsertInput }, user);
      const { insert_action_run_one: actionRunId } = response;
      if (actionRunId !== null) {
        return actionRunId.id;
      } else {
        throw Error(`Unable to run action`);
      }
    } catch (e) {
      catchError('Action Run Creation Failed', e as Error);
      showFailureToast('Action Run Creation Failed');
      return null;
    }
  },

  async createActivityDirective(
    argumentsMap: ArgumentsMap,
    startTimeDoy: string,
    type: string,
    name: string,
    metadata: ActivityMetadata,
    plan: Plan | null,
    user: User | null,
  ): Promise<void> {
    try {
      if ((plan && !queryPermissions.CREATE_ACTIVITY_DIRECTIVE(user, plan)) || !plan) {
        throwPermissionError('add a directive to the plan');
      }

      if (plan !== null) {
        const startOffset = getIntervalFromDoyRange(plan.start_time_doy, startTimeDoy);
        const activityDirectiveInsertInput: ActivityDirectiveInsertInput = {
          anchor_id: null,
          anchored_to_start: true,
          arguments: argumentsMap,
          metadata,
          name,
          plan_id: plan.id,
          start_offset: startOffset,
          type,
        };
        const data = await reqHasura<ActivityDirectiveDB>(
          gql.CREATE_ACTIVITY_DIRECTIVE,
          {
            activityDirectiveInsertInput,
          },
          user,
        );
        const { insert_activity_directive_one: newActivityDirective } = data;
        if (newActivityDirective != null) {
          const { id } = newActivityDirective;

          activityDirectivesDBStore.updateValue(directives => {
            return (directives || []).map(directive => {
              if (directive.id === id) {
                return newActivityDirective;
              }
              return directive;
            });
          });
          selectedActivityDirectiveIdStore.set(id);
          selectedSpanIdStore.set(null);

          showSuccessToast('Activity Directive Created Successfully');
        } else {
          throw Error(`Unable to create activity directive "${name}" on plan with ID ${plan.id}`);
        }
      } else {
        throw Error('Plan is not defined.');
      }
    } catch (e) {
      catchError('Activity Directive Create Failed', e as Error);
      showFailureToast('Activity Directive Create Failed');
    }
  },

  async createActivityDirectiveTags(
    tags: ActivityDirectiveTagsInsertInput[],
    user: User | null,
  ): Promise<number | null> {
    try {
      if (!queryPermissions.CREATE_ACTIVITY_DIRECTIVE_TAGS(user)) {
        throwPermissionError('create activity directive tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(gql.CREATE_ACTIVITY_DIRECTIVE_TAGS, { tags }, user);
      const { insert_activity_directive_tags: insertActivityDirectiveTags } = data;
      if (insertActivityDirectiveTags != null) {
        const { affected_rows: affectedRows } = insertActivityDirectiveTags;

        if (affectedRows !== tags.length) {
          throw Error('Some activity directive tags were not successfully created');
        }

        showSuccessToast('Activity Directive Updated Successfully');
        return affectedRows;
      } else {
        throw Error('Unable to create activity directive tags');
      }
    } catch (e) {
      catchError('Create Activity Directive Tags Failed', e as Error);
      showFailureToast('Create Activity Directive Tags Failed');
      return null;
    }
  },

  async createActivityPreset(
    argumentsMap: ArgumentsMap,
    associatedActivityType: string,
    name: string,
    modelId: number,
    user: User | null,
  ): Promise<ActivityPreset | null> {
    try {
      if (!queryPermissions.CREATE_ACTIVITY_PRESET(user)) {
        throwPermissionError('create an activity preset');
      }

      const activityPresetInsertInput: ActivityPresetInsertInput = {
        arguments: argumentsMap,
        associated_activity_type: associatedActivityType,
        model_id: modelId,
        name,
      };

      const data = await reqHasura<ActivityPreset>(gql.CREATE_ACTIVITY_PRESET, { activityPresetInsertInput }, user);

      if (data.insert_activity_presets_one != null) {
        const { insert_activity_presets_one: activityPreset } = data;
        showSuccessToast(`Activity Preset ${activityPreset.name} Created Successfully`);
        return activityPreset;
      } else {
        throw Error(`Unable to create activity preset "${name}"`);
      }
    } catch (e) {
      catchError('Activity Preset Create Failed', e as Error);
      showFailureToast('Activity Preset Create Failed');
      return null;
    }
  },

  async createConstraint(
    constraintToCreate: Omit<ConstraintInsertInput, 'versions'>,
    definitionType: ConstraintDefinitionType,
    definition: string,
    file: File | null,
    definitionTags: ConstraintTagsInsertInput[],
    user: User | null,
  ): Promise<number | null> {
    try {
      if (!queryPermissions.CREATE_CONSTRAINT(user)) {
        throwPermissionError('create a constraint');
      }

      let jarId: number | null = null;
      let codeDefinition: string | null = null;

      if (definitionType === ConstraintDefinitionType.EDSL) {
        codeDefinition = definition;
      } else if (definitionType === ConstraintDefinitionType.JAR && file) {
        jarId = await effects.uploadFile(file, user);
      }

      const constraintInsertInput: ConstraintInsertInput = {
        ...constraintToCreate,
        versions: {
          data: [
            {
              definition: codeDefinition,
              tags: {
                data: definitionTags,
              },
              type: definitionType,
              uploaded_jar_id: jarId,
            },
          ],
        },
      };

      const data = await reqHasura<ConstraintMetadata>(
        gql.CREATE_CONSTRAINT,
        { constraint: constraintInsertInput },
        user,
      );
      const { constraint } = data;
      if (constraint != null) {
        const { id } = constraint;

        showSuccessToast('Constraint Created Successfully');
        return id;
      } else {
        throw Error(`Unable to create constraint "${constraintToCreate.name}"`);
      }
    } catch (e) {
      catchError('Constraint Creation Failed', e as Error);
      showFailureToast('Constraint Creation Failed');
      return null;
    }
  },

  async createConstraintDefinition(
    constraintId: number,
    definitionType: ConstraintDefinitionType,
    definition: string,
    file: File | null,
    definitionTags: ConstraintTagsInsertInput[],
    user: User | null,
  ): Promise<Pick<ConstraintDefinition, 'constraint_id' | 'definition' | 'revision'> | null> {
    try {
      if (!queryPermissions.CREATE_CONSTRAINT_DEFINITION(user)) {
        throwPermissionError('create a constraint');
      }

      let jarId: number | null = null;
      let codeDefinition: string | null = null;

      if (definitionType === ConstraintDefinitionType.EDSL) {
        codeDefinition = definition;
      } else if (definitionType === ConstraintDefinitionType.JAR && file !== null) {
        jarId = await effects.uploadFile(file, user);
      }

      const constraintDefinitionInsertInput: ConstraintDefinitionInsertInput = {
        constraint_id: constraintId,
        definition: codeDefinition,
        tags: {
          data: definitionTags,
        },
        type: definitionType,
        uploaded_jar_id: jarId,
      };
      const data = await reqHasura<ConstraintDefinition>(
        gql.CREATE_CONSTRAINT_DEFINITION,
        { constraintDefinition: constraintDefinitionInsertInput },
        user,
      );
      const { constraintDefinition } = data;
      if (constraintDefinition != null) {
        showSuccessToast('New Constraint Revision Created Successfully');
        return constraintDefinition;
      } else {
        throw Error(`Unable to create constraint definition for constraint "${constraintId}"`);
      }
    } catch (e) {
      catchError('Constraint Creation Failed', e as Error);
      showFailureToast('Constraint Creation Failed');
      return null;
    }
  },

  async createConstraintPlanSpecification(
    constraintPlanSpecification: ConstraintPlanSpecInsertInput,
    user: User | null,
  ): Promise<number | null> {
    try {
      if (!queryPermissions.CREATE_CONSTRAINT_PLAN_SPECIFICATION(user)) {
        throwPermissionError('create a scheduling spec goal');
      }
      const data = await reqHasura<ConstraintPlanSpecification>(
        gql.CREATE_CONSTRAINT_PLAN_SPECIFICATION,
        { constraintPlanSpecification },
        user,
      );
      const { createConstraintSpec } = data;
      if (createConstraintSpec != null) {
        const { invocation_id: invocationId } = createConstraintSpec;
        showSuccessToast('New Constraint Invocation Created Successfully');
        return invocationId ?? null;
      } else {
        throw Error('Unable to create a constraint spec invocation');
      }
    } catch (e) {
      catchError(e as Error);
      showFailureToast('Constraint Invocation Creation Failed');
      return null;
    }
  },

  async createCustomAdaptation(
    adaptation: { adaptation: string; name: string },
    user: User | null,
  ): Promise<SequenceAdaptationMetadata | null> {
    try {
      if (!queryPermissions.CREATE_SEQUENCE_ADAPTATION(user)) {
        throwPermissionError('upload a custom adaptation');
      }

      if (adaptation?.adaptation) {
        const data = await reqHasura<SequenceAdaptationMetadata>(gql.CREATE_SEQUENCE_ADAPTATION, { adaptation }, user);
        const { createSequenceAdaptation: newSequenceAdaptation } = data;

        if (newSequenceAdaptation != null) {
          return { ...newSequenceAdaptation, type: DictionaryTypes.ADAPTATION };
        } else {
          throw Error('Unable to upload sequence adaptation');
        }
      }
    } catch (e) {
      catchError('Sequence Adaptation Upload Failed', e as Error);
    }

    return null;
  },

  async createDerivationGroup(
    derivationGroup: DerivationGroupInsertInput,
    user: User | null,
  ): Promise<DerivationGroup | undefined> {
    try {
      createDerivationGroupErrorStore.set(null);
      const { createDerivationGroup: created } = await reqHasura(
        gql.CREATE_DERIVATION_GROUP,
        { derivationGroup },
        user,
      );
      if (created !== null) {
        showSuccessToast('Derivation Group Created Successfully');
        return created as DerivationGroup;
      } else {
        throw Error(`Unable to create derivation group`);
      }
    } catch (e) {
      catchError('Derivation Group Create Failed', e as Error);
      showFailureToast('Derivation Group Create Failed');
      createDerivationGroupErrorStore.set((e as Error).message);
      return undefined;
    }
  },

  async createExpansionRule(rule: ExpansionRuleInsertInput, user: User | null): Promise<number | null> {
    try {
      createExpansionRuleErrorStore.set(null);

      if (!queryPermissions.CREATE_EXPANSION_RULE(user)) {
        throwPermissionError('create an expansion rule');
      }

      savingExpansionRuleStore.set(true);
      const data = await reqHasura<ExpansionRule>(gql.CREATE_EXPANSION_RULE, { rule }, user);
      const { createExpansionRule } = data;
      if (createExpansionRule != null) {
        const { id } = createExpansionRule;
        showSuccessToast('Expansion Rule Created Successfully');
        savingExpansionRuleStore.set(false);
        return id;
      } else {
        throw Error(`Unable to create expansion rule "${rule.name}"`);
      }
    } catch (e) {
      catchError('Expansion Rule Create Failed', e as Error);
      showFailureToast('Expansion Rule Create Failed');
      savingExpansionRuleStore.set(false);
      createExpansionRuleErrorStore.set((e as Error).message);
      return null;
    }
  },

  async createExpansionRuleTags(tags: ExpansionRuleTagsInsertInput[], user: User | null): Promise<number | null> {
    try {
      if (!queryPermissions.CREATE_EXPANSION_RULE_TAGS(user)) {
        throwPermissionError('create expansion rule tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(gql.CREATE_EXPANSION_RULE_TAGS, { tags }, user);
      const { insert_expansion_rule_tags: insertExpansionRuleTags } = data;
      if (insertExpansionRuleTags != null) {
        const { affected_rows: affectedRows } = insertExpansionRuleTags;

        if (affectedRows !== tags.length) {
          throw Error('Some expansion rule tags were not successfully created');
        }

        return affectedRows;
      } else {
        throw Error(`Unable to create expansion rule tags`);
      }
    } catch (e) {
      catchError('Create Expansion Rule Tags Failed', e as Error);
      showFailureToast('Create Expansion Rule Tags Failed');
      return null;
    }
  },

  async createExpansionSequence(seqId: string, simulationDatasetId: number, user: User | null): Promise<string | null> {
    try {
      if (!queryPermissions.CREATE_EXPANSION_SEQUENCE(user)) {
        throwPermissionError('create an expansion sequence');
      }

      creatingExpansionSequenceStore.set(true);
      const sequence: ExpansionSequenceInsertInput = {
        metadata: {},
        seq_id: seqId,
        simulation_dataset_id: simulationDatasetId,
      };
      const data = await reqHasura<SeqId>(gql.CREATE_EXPANSION_SEQUENCE, { sequence }, user);
      if (data.createExpansionSequence != null) {
        showSuccessToast('Expansion Sequence Created Successfully');
        creatingExpansionSequenceStore.set(false);
        return data.createExpansionSequence.seq_id;
      } else {
        throw Error(`Unable to create expansion sequence with ID: "${seqId}"`);
      }
    } catch (e) {
      catchError('Expansion Sequence Create Failed', e as Error);
      showFailureToast('Expansion Sequence Create Failed');
      creatingExpansionSequenceStore.set(false);
      return null;
    }
  },

  async createExpansionSet(
    parcelId: number,
    model: ModelSlim,
    expansionRuleIds: number[],
    user: User | null,
    plans: PlanSlim[],
    name?: string,
    description?: string,
  ): Promise<number | null> {
    try {
      if (!queryPermissions.CREATE_EXPANSION_SET(user, plans, model)) {
        throwPermissionError('create an expansion set');
      }

      savingExpansionSetStore.set(true);
      const data = await reqHasura<ExpansionSet>(
        gql.CREATE_EXPANSION_SET,
        {
          expansionRuleIds,
          modelId: model.id,
          ...(name && { name }),
          parcelId,
          ...(description && { description }),
        },
        user,
      );
      const { createExpansionSet } = data;
      if (createExpansionSet != null) {
        const { id } = createExpansionSet;
        showSuccessToast('Expansion Set Created Successfully');
        savingExpansionSetStore.set(false);
        return id;
      } else {
        throw Error('Unable to create expansion set');
      }
    } catch (e) {
      catchError('Expansion Set Create Failed', e as Error);
      showFailureToast('Expansion Set Create Failed');
      savingExpansionSetStore.set(false);
      return null;
    }
  },

  async createExternalSource(
    derivationGroupName: string | null,
    externalSourceFile: File,
    user: User | null,
  ): Promise<ExternalSourceSlim | null> {
    try {
      if (!gatewayPermissions.CREATE_EXTERNAL_SOURCE(user)) {
        throwPermissionError('upload an external source');
      }
      creatingExternalSourceStore.set(true);
      createExternalSourceErrorStore.set(null);

      const body = new FormData();
      if (derivationGroupName) {
        body.append('derivation_group_name', derivationGroupName);
      }
      body.append('external_source_file', externalSourceFile);

      const reqResponse = await reqGateway(`/uploadExternalSource`, 'POST', body, user, true);
      if (reqResponse?.errors === undefined) {
        const { createExternalSource: newExternalSource } = reqResponse;
        showSuccessToast('External Source Created Successfully');
        creatingExternalSourceStore.set(false);
        return newExternalSource;
      } else {
        const respErrors = reqResponse.errors.map((respError: { message: string }) => respError.message);
        showFailureToast('External Source Create Failed');
        throw new Error(respErrors);
      }
    } catch (e) {
      catchError('External Source Create Failed', e as Error);
      showFailureToast('External Source Create Failed');
      if ((e as Error).message.includes('external_source_type_matches_derivation_group')) {
        createExternalSourceErrorStore.set('Cannot duplicate derivation groups!');
      } else {
        createExternalSourceErrorStore.set((e as Error).message);
      }
      creatingExternalSourceStore.set(false);
      return null;
    }
  },

  async createExternalSourceEventTypes(
    eventTypes: object | undefined,
    sourceTypes: object | undefined,
    user: User | null,
  ): Promise<boolean> {
    if (!gatewayPermissions.CREATE_EXTERNAL_EVENT_TYPE(user) || !gatewayPermissions.CREATE_EXTERNAL_SOURCE_TYPE(user)) {
      throwPermissionError('create en external source or event type');
    }
    createExternalSourceEventTypeErrorStore.set(null);

    try {
      if (eventTypes === undefined && sourceTypes === undefined) {
        throw new Error('No External Source or Event Types Defined');
      }
      const body = {
        event_types: JSON.stringify(eventTypes ?? {}),
        source_types: JSON.stringify(sourceTypes ?? {}),
      };

      const response = await reqGateway(`/uploadExternalSourceEventTypes`, 'POST', JSON.stringify(body), user, false);
      if (response?.errors === undefined) {
        showSuccessToast('External Source & Event Type Created Successfully');
        return true;
      } else {
        showFailureToast('External Source & Event Type Create Failed');
        return false;
      }
    } catch (e) {
      showFailureToast('External Source & Event Type Create Failed');
      createExternalSourceEventTypeErrorStore.set((e as Error).message);
      catchError(e as Error);
      return false;
    }
  },

  async createModel(
    name: string,
    version: string,
    files: FileList,
    user: User | null,
    description?: string,
  ): Promise<number | null> {
    try {
      createModelErrorStore.set(null);

      if (!queryPermissions.CREATE_MODEL(user)) {
        throwPermissionError('upload a model');
      }

      creatingModelStore.set(true);

      const file: File = files[0];
      const jarId = await effects.uploadFile(file, user);
      showSuccessToast('Model Uploaded Successfully. Processing model...');

      if (jarId !== null) {
        const modelInsertInput: ModelInsertInput = {
          description,
          jar_id: jarId,
          mission: '',
          name,
          version,
        };
        const data = await reqHasura<Model>(gql.CREATE_MODEL, { model: modelInsertInput }, user);
        const { createModel } = data;
        if (createModel != null) {
          const { id } = createModel;

          showSuccessToast('Model Created Successfully');
          createModelErrorStore.set(null);
          creatingModelStore.set(false);

          return id;
        } else {
          throw Error(`Unable to create model "${name}"`);
        }
      }
    } catch (e) {
      catchError('Model Create Failed', e as Error);
      showFailureToast('Model Create Failed');
      createModelErrorStore.set((e as Error).message);
      creatingModelStore.set(false);
    }

    return null;
  },

  async createParcel(parcel: ParcelInsertInput, user: User | null): Promise<number | null> {
    try {
      if (!queryPermissions.CREATE_PARCEL(user)) {
        throwPermissionError('create a parcel');
      }

      const data = await reqHasura<Pick<Parcel, 'id'>>(gql.CREATE_PARCEL, { parcel }, user);
      const { createParcel } = data;

      if (createParcel === null) {
        throw Error(`Unable to create parcel "${parcel.name}"`);
      }

      const { id } = createParcel;
      showSuccessToast('Parcel Created Successfully');
      return id;
    } catch (e) {
      catchError('Parcel Create Failed', e as Error);
      showFailureToast('Parcel Create Failed');
      return null;
    }
  },

  async createParcelToParameterDictionaries(
    parcelToParameterDictionariesToAdd: Omit<ParcelToParameterDictionary, 'id'>[],
    user: User | null,
  ): Promise<ParcelToParameterDictionary[] | null> {
    try {
      if (!queryPermissions.CREATE_PARCEL_TO_PARAMETER_DICTIONARIES(user)) {
        throwPermissionError('create parcel to parameter dictionary');
      }
      const data = await reqHasura<{ returning: ParcelToParameterDictionary[] }>(
        gql.CREATE_PARCEL_TO_PARAMETER_DICTIONARIES,
        { parcelToParameterDictionaries: parcelToParameterDictionariesToAdd },
        user,
      );
      const { insert_parcel_to_parameter_dictionary: insertParcelToParameterDictionary } = data;

      if (insertParcelToParameterDictionary) {
        showSuccessToast('Parcel to parameter dictionaries created successfully');
      } else {
        throw Error('Unable to create parcel to parameter dictionaries');
      }

      return insertParcelToParameterDictionary.returning;
    } catch (e) {
      catchError('Create parcel to parameter dictionaries failed', e as Error);
      showFailureToast('Create parcel to parameter dictionaries failed');
    }

    return null;
  },

  async createPlan(
    endTimeDoy: string,
    modelId: number,
    name: string,
    startTimeDoy: string,
    simulationTemplateId: number | null,
    user: User | null,
  ): Promise<PlanSlim | null> {
    try {
      createPlanErrorStore.set(null);

      if (!queryPermissions.CREATE_PLAN(user)) {
        throwPermissionError('create a plan');
      }

      creatingPlanStore.set(true);

      const planInsertInput: PlanInsertInput = {
        duration: getIntervalFromDoyRange(startTimeDoy, endTimeDoy),
        model_id: modelId,
        name,
        start_time: startTimeDoy, // Postgres accepts DOY dates for it's 'timestamptz' type.
      };
      const data = await reqHasura<PlanSlim>(
        gql.CREATE_PLAN,
        {
          plan: planInsertInput,
        },
        user,
      );
      const { createPlan } = data;
      if (createPlan != null) {
        const { collaborators, created_at, duration, id, owner, revision, start_time, updated_at, updated_by } =
          createPlan;

        if (!(await effects.initialSimulationUpdate(id, simulationTemplateId, startTimeDoy, endTimeDoy, user))) {
          throw Error('Failed to update simulation.');
        }

        const plan: PlanSlim = {
          collaborators,
          created_at,
          duration,
          end_time_doy: endTimeDoy,
          id,
          model_id: modelId,
          name,
          owner,
          revision,
          start_time,
          start_time_doy: startTimeDoy,
          tags: [],
          updated_at,
          updated_by,
        };

        showSuccessToast('Plan Created Successfully');
        createPlanErrorStore.set(null);
        creatingPlanStore.set(false);

        return plan;
      } else {
        throw Error(`Unable to create plan "${name}"`);
      }
    } catch (e) {
      catchError('Plan Create Failed', e as Error);
      showFailureToast('Plan Create Failed');
      createPlanErrorStore.set((e as Error).message);
      creatingPlanStore.set(false);

      return null;
    }
  },

  async createPlanBranch(plan: Plan, user: User | null): Promise<void> {
    try {
      if (!queryPermissions.DUPLICATE_PLAN(user, plan, plan.model)) {
        throwPermissionError('create a branch');
      }

      const { confirm, value = null } = await showCreatePlanBranchModal(plan);

      if (confirm && value) {
        const { name, plan: planToBranch } = value;
        const data = await reqHasura(gql.DUPLICATE_PLAN, { new_plan_name: name, plan_id: planToBranch.id }, user);
        const { duplicate_plan: duplicatePlan } = data;
        if (duplicatePlan != null) {
          goto(`${base}/plans/${duplicatePlan.new_plan_id}`);
          showSuccessToast('Branch Created Successfully');
        } else {
          throw Error('');
        }
      }
    } catch (e) {
      catchError('Branch Creation Failed', e as Error);
      showFailureToast('Branch Creation Failed');
    }
  },

  async createPlanBranchRequest(plan: Plan, action: PlanBranchRequestAction, user: User | null): Promise<void> {
    try {
      const { confirm, value } = await showPlanBranchRequestModal(plan, action);

      if (confirm && value) {
        const { source_plan: sourcePlan, target_plan: targetPlan } = value;

        if (!queryPermissions.CREATE_PLAN_MERGE_REQUEST(user, sourcePlan, targetPlan, plan.model)) {
          throwPermissionError('create a branch merge request');
        }

        if (action === 'merge') {
          await effects.createPlanMergeRequest(
            { ...sourcePlan, model_id: plan.model_id },
            targetPlan,
            plan.model,
            user,
          );
        }
      }
    } catch (e) {
      catchError(e as Error);
    }
  },

  async createPlanCollaborators(plan: Plan, collaborators: PlanCollaborator[], user: User | null): Promise<void> {
    try {
      if (!queryPermissions.CREATE_PLAN_COLLABORATORS(user, plan)) {
        throwPermissionError('update this plan');
      }

      const data = await reqHasura(gql.CREATE_PLAN_COLLABORATORS, { collaborators }, user);
      const { insert_plan_collaborators: insertPlanCollaborators } = data;

      if (insertPlanCollaborators != null) {
        const { affected_rows: affectedRows } = insertPlanCollaborators;

        if (affectedRows !== collaborators.length) {
          throw Error('Some plan collaborators were not successfully added');
        }
        showSuccessToast('Plan Collaborators Updated');
        return affectedRows;
      } else {
        throw Error('Unable to create plan collaborators');
      }
    } catch (e) {
      catchError('Plan Collaborator Create Failed', e as Error);
      showFailureToast('Plan Collaborator Create Failed');
      return;
    }
  },

  async createPlanMergeRequest(
    sourcePlan: PlanForMerging,
    targetPlan: PlanForMerging,
    model: ModelSchema,
    user: User | null,
  ): Promise<number | null> {
    try {
      if (!queryPermissions.CREATE_PLAN_MERGE_REQUEST(user, sourcePlan, targetPlan, model)) {
        throwPermissionError('create a branch merge request');
      }

      const data = await reqHasura<{ merge_request_id: number }>(
        gql.CREATE_PLAN_MERGE_REQUEST,
        {
          source_plan_id: sourcePlan.id,
          target_plan_id: targetPlan.id,
        },
        user,
      );
      const { create_merge_request: createMergeRequest } = data;
      if (createMergeRequest != null) {
        const { merge_request_id: mergeRequestId } = createMergeRequest;
        showSuccessToast('Merge Request Created Successfully');
        return mergeRequestId;
      } else {
        throw Error('Unable to create a branch merge request');
      }
    } catch (e) {
      catchError('Merge Request Create Failed', e as Error);
      showFailureToast('Merge Request Create Failed');
      return null;
    }
  },

  async createPlanSnapshot(plan: Plan, user: User | null): Promise<void> {
    try {
      if (!queryPermissions.CREATE_PLAN_SNAPSHOT(user, plan, plan.model)) {
        throwPermissionError('create a snapshot');
      }

      const { confirm, value = null } = await showCreatePlanSnapshotModal(plan, user);

      if (confirm && value) {
        const { description, name, plan: planToSnapshot, tags } = value;
        await effects.createPlanSnapshotHelper(planToSnapshot.id, name, description, tags, user);
        showSuccessToast('Snapshot Created Successfully');
      }
    } catch (e) {
      catchError('Snapshot Creation Failed', e as Error);
      showFailureToast('Snapshot Creation Failed');
    }
  },

  /**
   * This helper function is for handling the creation of a snapshot and associating tags in one go
   *
   * @param planIdToSnapshot
   * @param name
   * @param description
   * @param tags
   * @param user
   */
  async createPlanSnapshotHelper(
    planIdToSnapshot: number,
    name: string,
    description: string,
    tags: Tag[],
    user: User | null,
  ): Promise<void> {
    const data = await reqHasura<{ snapshot_id: number }>(
      gql.CREATE_PLAN_SNAPSHOT,
      { description, plan_id: planIdToSnapshot, snapshot_name: name },
      user,
    );
    const { createSnapshot } = data;
    if (createSnapshot != null) {
      const { snapshot_id } = createSnapshot;
      // Associate tags with the snapshot
      const newPlanSnapshotTags: PlanSnapshotTagsInsertInput[] =
        tags?.map(({ id: tagId }) => ({
          snapshot_id,
          tag_id: tagId,
        })) ?? [];
      await effects.createPlanSnapshotTags(newPlanSnapshotTags, user, false);
    }
  },

  async createPlanSnapshotTags(
    tags: PlanSnapshotTagsInsertInput[],
    user: User | null,
    notify: boolean = true,
  ): Promise<number | null> {
    try {
      if (!queryPermissions.CREATE_PLAN_SNAPSHOT_TAGS(user)) {
        throwPermissionError('create plan snapshot tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(gql.CREATE_PLAN_SNAPSHOT_TAGS, { tags }, user);
      const { insert_plan_snapshot_tags: insertPlanSnapshotTags } = data;
      if (insertPlanSnapshotTags != null) {
        const { affected_rows: affectedRows } = insertPlanSnapshotTags;

        if (affectedRows !== tags.length) {
          throw Error('Some plan snapshot tags were not successfully created');
        }
        if (notify) {
          showSuccessToast('Plan Snapshot Updated Successfully');
        }
        return affectedRows;
      } else {
        throw Error('Unable to create plan snapshot tags');
      }
    } catch (e) {
      catchError('Create Plan Snapshot Tags Failed', e as Error);
      showFailureToast('Create Plan Snapshot Tags Failed');
      return null;
    }
  },

  async createPlanTags(
    tags: PlanTagsInsertInput[],
    plan: PlanWithOwners,
    user: User | null,
    notify: boolean = true,
  ): Promise<number | null> {
    try {
      if (!queryPermissions.CREATE_PLAN_TAGS(user, plan)) {
        throwPermissionError('create plan tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(gql.CREATE_PLAN_TAGS, { tags }, user);
      const { insert_plan_tags: insertPlanTags } = data;
      if (insertPlanTags != null) {
        const { affected_rows: affectedRows } = insertPlanTags;

        if (affectedRows !== tags.length) {
          throw Error('Some plan tags were not successfully created');
        }
        if (notify) {
          showSuccessToast('Plan Updated Successfully');
        }
        return affectedRows;
      } else {
        throw Error('Unable to create plan tags');
      }
    } catch (e) {
      catchError('Create Plan Tags Failed', e as Error);
      showFailureToast('Create Plan Tags Failed');
      return null;
    }
  },

  async createSchedulingCondition(
    name: string,
    isPublic: boolean,
    metadataTags: SchedulingTagsInsertInput[],
    definition: string,
    definitionTags: SchedulingTagsInsertInput[],
    user: User | null,
    description?: string,
  ): Promise<number | null> {
    try {
      if (!queryPermissions.CREATE_SCHEDULING_CONDITION(user)) {
        throwPermissionError('create a scheduling condition');
      }

      const conditionInsertInput: SchedulingConditionInsertInput = {
        ...(description ? { description } : {}),
        name,
        public: isPublic,
        tags: {
          data: metadataTags,
        },
        versions: {
          data: [
            {
              definition,
              tags: {
                data: definitionTags,
              },
            },
          ],
        },
      };
      const data = await reqHasura<SchedulingConditionMetadata>(
        gql.CREATE_SCHEDULING_CONDITION,
        { condition: conditionInsertInput },
        user,
      );
      const { createSchedulingCondition } = data;
      if (createSchedulingCondition != null) {
        const { id } = createSchedulingCondition;

        showSuccessToast('Scheduling Condition Created Successfully');
        return id;
      } else {
        throw Error(`Unable to create scheduling condition "${name}"`);
      }
    } catch (e) {
      catchError('Scheduling Condition Creation Failed', e as Error);
      showFailureToast('Scheduling Condition Creation Failed');
      return null;
    }
  },

  async createSchedulingConditionDefinition(
    conditionId: number,
    definition: string,
    definitionTags: SchedulingTagsInsertInput[],
    user: User | null,
  ): Promise<Pick<SchedulingConditionDefinition, 'condition_id' | 'definition' | 'revision'> | null> {
    try {
      if (!queryPermissions.CREATE_SCHEDULING_CONDITION_DEFINITION(user)) {
        throwPermissionError('create a scheduling condition definition');
      }

      const conditionDefinitionInsertInput: SchedulingConditionDefinitionInsertInput = {
        condition_id: conditionId,
        definition,
        tags: {
          data: definitionTags,
        },
      };
      const data = await reqHasura<SchedulingConditionDefinition>(
        gql.CREATE_SCHEDULING_CONDITION_DEFINITION,
        { conditionDefinition: conditionDefinitionInsertInput },
        user,
      );
      const { conditionDefinition } = data;
      if (conditionDefinition != null) {
        showSuccessToast('New Scheduling Condition Revision Created Successfully');
        return conditionDefinition;
      } else {
        throw Error(`Unable to create condition definition for scheduling condition "${conditionId}"`);
      }
    } catch (e) {
      catchError('Scheduling Condition Creation Failed', e as Error);
      showFailureToast('Scheduling Condition Creation Failed');
      return null;
    }
  },

  async createSchedulingGoal(
    name: string,
    isPublic: boolean,
    metadataTags: SchedulingTagsInsertInput[],
    definitionType: SchedulingDefinitionType,
    definition: string | null,
    file: File | null,
    definitionTags: SchedulingTagsInsertInput[],
    user: User | null,
    description?: string,
  ): Promise<number | null> {
    try {
      if (!queryPermissions.CREATE_SCHEDULING_CONDITION(user)) {
        throwPermissionError('create a scheduling condition');
      }

      let jarId: number | null = null;
      let codeDefinition: string | null = null;

      if (definitionType === SchedulingDefinitionType.EDSL) {
        codeDefinition = definition;
      } else if (definitionType === SchedulingDefinitionType.JAR && file) {
        jarId = await effects.uploadFile(file, user);
      }

      const goalInsertInput: SchedulingGoalInsertInput = {
        ...(description ? { description } : {}),
        name,
        public: isPublic,
        tags: {
          data: metadataTags,
        },
        versions: {
          data: [
            {
              definition: codeDefinition,
              tags: {
                data: definitionTags,
              },
              type: definitionType,
              uploaded_jar_id: jarId,
            },
          ],
        },
      };

      const data = await reqHasura<SchedulingGoalMetadata>(gql.CREATE_SCHEDULING_GOAL, { goal: goalInsertInput }, user);
      const { createSchedulingGoal } = data;
      if (createSchedulingGoal != null) {
        const { id } = createSchedulingGoal;

        showSuccessToast('Scheduling Goal Created Successfully');
        return id;
      } else {
        throw Error(`Unable to create scheduling goal "${name}"`);
      }
    } catch (e) {
      catchError('Scheduling Goal Creation Failed', e as Error);
      showFailureToast('Scheduling Goal Creation Failed');
      return null;
    }
  },

  async createSchedulingGoalDefinition(
    goalId: number,
    definitionType: SchedulingDefinitionType,
    definition: string | null,
    file: File | null,
    definitionTags: SchedulingTagsInsertInput[],
    user: User | null,
  ): Promise<Pick<SchedulingGoalDefinition, 'goal_id' | 'definition' | 'revision'> | null> {
    try {
      if (!queryPermissions.CREATE_SCHEDULING_GOAL_DEFINITION(user)) {
        throwPermissionError('create a scheduling goal definition');
      }

      let jarId: number | null = null;
      let codeDefinition: string | null = null;

      if (definitionType === SchedulingDefinitionType.EDSL) {
        codeDefinition = definition;
      } else if (definitionType === SchedulingDefinitionType.JAR && file !== null) {
        jarId = await effects.uploadFile(file, user);
      }

      const goalDefinitionInsertInput: SchedulingGoalDefinitionInsertInput = {
        definition: codeDefinition,
        goal_id: goalId,
        tags: {
          data: definitionTags,
        },
        type: definitionType,
        uploaded_jar_id: jarId,
      };
      const data = await reqHasura<SchedulingGoalDefinition>(
        gql.CREATE_SCHEDULING_GOAL_DEFINITION,
        { goalDefinition: goalDefinitionInsertInput },
        user,
      );
      const { goalDefinition } = data;
      if (goalDefinition != null) {
        showSuccessToast('New Scheduling Goal Revision Created Successfully');
        return goalDefinition;
      } else {
        throw Error(`Unable to create goal definition for scheduling goal "${goalId}"`);
      }
    } catch (e) {
      catchError('Scheduling Goal Creation Failed', e as Error);
      showFailureToast('Scheduling Goal Creation Failed');
      return null;
    }
  },

  async createSchedulingGoalPlanSpecification(
    specGoal: SchedulingGoalPlanSpecInsertInput,
    user: User | null,
  ): Promise<number | null> {
    try {
      if (!queryPermissions.CREATE_SCHEDULING_GOAL_PLAN_SPECIFICATION(user)) {
        throwPermissionError('create a scheduling spec goal');
      }

      const data = await reqHasura<SchedulingGoalPlanSpecification>(
        gql.CREATE_SCHEDULING_GOAL_PLAN_SPECIFICATION,
        { spec_goal: specGoal },
        user,
      );
      const { createSchedulingSpecGoal } = data;
      if (createSchedulingSpecGoal != null) {
        const { specification_id: specificationId } = createSchedulingSpecGoal;
        showSuccessToast('New Scheduling Goal Invocation Created Successfully');
        return specificationId;
      } else {
        throw Error('Unable to create a scheduling spec goal invocation');
      }
    } catch (e) {
      catchError(e as Error);
      showFailureToast('Scheduling Goal Invocation Creation Failed');
      return null;
    }
  },

  async createSchedulingPlanSpecification(
    spec: SchedulingPlanSpecificationInsertInput,
    user: User | null,
  ): Promise<Pick<SchedulingPlanSpecification, 'id'> | null> {
    try {
      if (!queryPermissions.CREATE_SCHEDULING_PLAN_SPECIFICATION(user)) {
        throwPermissionError('create a scheduling spec');
      }

      const data = await reqHasura<Pick<SchedulingPlanSpecification, 'id'>>(
        gql.CREATE_SCHEDULING_PLAN_SPECIFICATION,
        { spec },
        user,
      );
      const { createSchedulingSpec: newSchedulingSpec } = data;
      return newSchedulingSpec;
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async createSequenceFilter(
    filter: ActivityLayerFilter,
    seqName: string,
    modelId: number,
    user: User | null,
  ): Promise<number | undefined> {
    try {
      if (!queryPermissions.CREATE_SEQUENCE_FILTER(user)) {
        throwPermissionError('create a sequence filter');
      }

      const sequenceFilterInsertInput: SequenceFilterInsertInput = {
        filter,
        model_id: modelId,
        name: seqName,
      };

      const result = await reqHasura<SequenceFilter>(
        gql.CREATE_SEQUENCE_FILTER,
        { definition: sequenceFilterInsertInput },
        user,
      );

      const { createSequenceFilter: createSequenceFilter } = result;

      if (createSequenceFilter != null) {
        showSuccessToast('Sequence Filter Created Successfully');
        return result.createSequenceFilter?.id;
      } else {
        throw Error('Create Sequence Filter Failed');
      }
    } catch (e) {
      catchError('Create Sequence Filter Failed', e as Error);
      showFailureToast('Create Sequence Filter Failed');
    }
    return undefined;
  },

  async createSequenceTemplate(
    activityType: string,
    language: string,
    modelId: number,
    name: string,
    parcelId: number,
    templateDefinition: string,
    user: User | null,
  ): Promise<void> {
    try {
      if (!queryPermissions.CREATE_SEQUENCE_TEMPLATE(user)) {
        throwPermissionError('create a sequence template');
      }

      const result = await reqHasura<SequenceTemplate>(
        gql.CREATE_SEQUENCE_TEMPLATE,
        {
          activityTypeName: activityType,
          language,
          modelId,
          name,
          parcelId,
          templateDefinition,
        },
        user,
      );
      const { insert_sequence_template_one: insertSequenceTemplateOne } = result;

      if (insertSequenceTemplateOne !== null) {
        showSuccessToast('Sequence Template Created Successfully');
      } else {
        throw Error('Create Sequence Template Failed');
      }
    } catch (e) {
      catchError('Create Sequence Template Failed', e as Error);
      showFailureToast('Create Sequence Template Failed');
    }
  },

  async createSimulationTemplate(
    argumentsMap: ArgumentsMap,
    name: string,
    modelId: number,
    user: User | null,
  ): Promise<SimulationTemplate | null> {
    try {
      if (!queryPermissions.CREATE_SIMULATION_TEMPLATE(user)) {
        throwPermissionError('create a simulation template');
      }

      const simulationTemplateInsertInput: SimulationTemplateInsertInput = {
        arguments: argumentsMap,
        description: name,
        model_id: modelId,
      };
      const { insert_simulation_template_one: newTemplate } = await reqHasura<SimulationTemplate>(
        gql.CREATE_SIMULATION_TEMPLATE,
        { simulationTemplateInsertInput },
        user,
      );

      if (newTemplate != null) {
        showSuccessToast(`Simulation Template ${name} Created Successfully`);
        return newTemplate;
      } else {
        throw Error(`Unable to create simulation template "${name}"`);
      }
    } catch (e) {
      catchError('Simulation Template Create Failed', e as Error);
      showFailureToast('Simulation Template Create Failed');
      return null;
    }
  },

  async createTag(tag: TagsInsertInput, user: User | null, notify: boolean = true): Promise<Tag | null> {
    try {
      createTagErrorStore.set(null);
      if (!queryPermissions.CREATE_TAGS(user)) {
        throwPermissionError('create tags');
      }

      const data = await reqHasura<{ affected_row: number; tag: Tag }>(gql.CREATE_TAG, { tag }, user);
      const { insert_tags_one: insertTagsOne } = data;
      if (insertTagsOne != null) {
        const { tag: insertedTag } = insertTagsOne;
        if (notify) {
          showSuccessToast('Tag Created Successfully');
        }
        createTagErrorStore.set(null);
        return insertedTag;
      } else {
        throw Error(`Unable to create tag "${tag.name}"`);
      }
    } catch (e) {
      createTagErrorStore.set((e as Error).message);
      catchError('Create Tags Failed', e as Error);
      showFailureToast('Create Tags Failed');
      return null;
    }
  },

  async createTags(tags: TagsInsertInput[], user: User | null, notify: boolean = true): Promise<Tag[] | null> {
    try {
      if (!queryPermissions.CREATE_TAGS(user)) {
        throwPermissionError('create tags');
      }

      const data = await reqHasura<{ affected_rows: number; returning: Tag[] }>(gql.CREATE_TAGS, { tags }, user);
      const { insert_tags: insertTags } = data;
      if (insertTags != null) {
        const { returning } = insertTags;

        const createdTags = returning.map(({ name }) => name);

        // If there are tags that did not get created
        const leftoverTagNames = tags.filter(({ name }) => !createdTags.includes(name)).map(({ name }) => name);
        if (leftoverTagNames.length > 0) {
          throw new Error(`Some tags were not successfully created: ${leftoverTagNames.join(', ')}`);
        }
        if (notify) {
          showSuccessToast('Tags Created Successfully');
        }
        return returning;
      } else {
        throw Error('Unable to create tags');
      }
    } catch (e) {
      catchError('Create Tags Failed', e as Error);
      showFailureToast('Create Tags Failed');
      return null;
    }
  },

  // TODO: remove this after expansion runs are made to work in new workspaces
  // async createUserSequence(sequence: UserSequenceInsertInput, user: User | null): Promise<number | null> {
  //   try {
  //     if (!queryPermissions.CREATE_USER_SEQUENCE(user)) {
  //       throwPermissionError('create a user sequence');
  //     }

  //     const data = await reqHasura<Pick<UserSequence, 'id'>>(gql.CREATE_USER_SEQUENCE, { sequence }, user);
  //     const { createUserSequence } = data;
  //     if (createUserSequence != null) {
  //       const { id } = createUserSequence;
  //       showSuccessToast('User Sequence Created Successfully');
  //       return id;
  //     } else {
  //       throw Error(`Unable to create user sequence "${sequence.name}"`);
  //     }
  //   } catch (e) {
  //     catchError('User Sequence Create Failed', e as Error);
  //     showFailureToast('User Sequence Create Failed');
  //     return null;
  //   }
  // },

  async createView(definition: ViewDefinition, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.CREATE_VIEW(user)) {
        throwPermissionError('create a view');
      }

      const { confirm, value = null } = await showCreateViewModal();

      if (confirm && value) {
        const { name } = value;
        const viewInsertInput: ViewInsertInput = { definition, name };
        const data = await reqHasura<View>(gql.CREATE_VIEW, { view: viewInsertInput }, user);
        const { newView } = data;

        if (newView != null) {
          viewStore.update(() => newView);
          setQueryParam(SearchParameters.VIEW_ID, `${newView.id}`);
          showSuccessToast('View Created Successfully');
          return true;
        } else {
          throw Error(`Unable to create view "${viewInsertInput.name}"`);
        }
      }
    } catch (e) {
      catchError('View Create Failed', e as Error);
      showFailureToast('View Create Failed');
    }

    return false;
  },

  async createWorkspace(
    location: string,
    parcelId: number,
    user: User | null,
    name?: string | null,
  ): Promise<Workspace | null> {
    try {
      if (!queryPermissions.CREATE_WORKSPACE(user)) {
        throwPermissionError('create a workspace');
      }

      creatingWorkspace.set(true);

      const workspaceInsert: WorkspaceInsertInput | null = {
        parcelId: parcelId,
        workspaceLocation: location,
        ...(name ? { workspaceName: name } : {}),
      };

      const newWorkspace = await reqWorkspace<Workspace>(`create`, 'POST', JSON.stringify(workspaceInsert), user);

      creatingWorkspace.set(false);

      if (newWorkspace != null) {
        showSuccessToast('Workspace Created Successfully');
        return newWorkspace;
      } else {
        throw Error(`Unable to create workspace at "${location}"`);
      }
    } catch (e) {
      catchError('Workspace Create Failed', e as Error);
      showFailureToast('Workspace Create Failed');
    }

    return null;
  },

  async deleteActivityDirective(id: ActivityDirectiveId, plan: Plan, user: User | null): Promise<boolean> {
    try {
      if (
        !(
          queryPermissions.DELETE_ACTIVITY_DIRECTIVES(user, plan) &&
          queryPermissions.DELETE_ACTIVITY_DIRECTIVES_REANCHOR_PLAN_START(user, plan, plan.model) &&
          queryPermissions.DELETE_ACTIVITY_DIRECTIVES_REANCHOR_TO_ANCHOR(user, plan, plan.model) &&
          queryPermissions.DELETE_ACTIVITY_DIRECTIVES_SUBTREE(user, plan, plan.model)
        )
      ) {
        throwPermissionError('delete an activity directive');
      }

      return effects.deleteActivityDirectives([id], plan, user);
    } catch (e) {
      catchError('Activity Directive Delete Failed', e as Error);
    }

    return false;
  },

  async deleteActivityDirectiveTag(
    tagId: Tag['id'],
    directiveId: ActivityDirectiveId,
    planId: number,
    user: User | null,
  ): Promise<number | null> {
    try {
      if (!queryPermissions.DELETE_ACTIVITY_DIRECTIVE_TAG(user)) {
        throwPermissionError('delete activity directive tags');
      }

      const data = await reqHasura<{ tag_id: number }>(
        gql.DELETE_ACTIVITY_DIRECTIVE_TAG,
        { directive_id: directiveId, plan_id: planId, tag_id: tagId },
        user,
      );
      if (data.delete_activity_directive_tags_by_pk != null) {
        showSuccessToast('Activity Directive Updated Successfully');
        return data.delete_activity_directive_tags_by_pk.tag_id;
      } else {
        throw Error('Unable to delete activity directive tag');
      }
    } catch (e) {
      catchError('Delete Activity Directive Tag Failed', e as Error);
      showFailureToast('Delete Activity Directive Tag Failed');
      return null;
    }
  },

  async deleteActivityDirectives(ids: ActivityDirectiveId[], plan: Plan, user: User | null): Promise<boolean> {
    try {
      if (
        !(
          queryPermissions.DELETE_ACTIVITY_DIRECTIVES(user, plan) &&
          queryPermissions.DELETE_ACTIVITY_DIRECTIVES_REANCHOR_PLAN_START(user, plan, plan.model) &&
          queryPermissions.DELETE_ACTIVITY_DIRECTIVES_REANCHOR_TO_ANCHOR(user, plan, plan.model) &&
          queryPermissions.DELETE_ACTIVITY_DIRECTIVES_SUBTREE(user, plan, plan.model)
        )
      ) {
        throwPermissionError('delete activity directives');
      }

      type SortedDeletions = {
        [key in ActivityDeletionAction]?: ActivityDirectiveId[];
      };

      const { confirm, value } = await showDeleteActivitiesModal(ids);

      if (confirm && value !== undefined) {
        const sortedActions = Object.keys(value)
          .map(Number)
          .reduce((previousValue: SortedDeletions, activityId: ActivityDirectiveId) => {
            const action = value[activityId];
            if (previousValue[action]) {
              return {
                ...previousValue,
                [action]: [...(previousValue[action] ?? []), activityId],
              };
            }
            return {
              ...previousValue,
              [action]: [activityId],
            };
          }, {});

        const reanchorPlanDeletions = sortedActions[ActivityDeletionAction.ANCHOR_PLAN] ?? [];
        const reanchorRootDeletions = sortedActions[ActivityDeletionAction.ANCHOR_ROOT] ?? [];
        const subtreeDeletions = sortedActions[ActivityDeletionAction.DELETE_CHAIN] ?? [];
        const normalDeletions = sortedActions[ActivityDeletionAction.NORMAL] ?? [];

        // The following deletion queries must occur in a specific order to avoid errors from deleting
        // directives that still have other activities dependent on them
        if (reanchorRootDeletions.length) {
          const response = await reqHasura<
            {
              affected_row: ActivityDirective;
              change_type: string;
            }[]
          >(
            gql.DELETE_ACTIVITY_DIRECTIVES_REANCHOR_TO_ANCHOR,
            {
              activity_ids: convertToGQLArray(reanchorRootDeletions),
              plan_id: plan.id,
            },
            user,
          );

          if (response.delete_activity_by_pk_reanchor_to_anchor_bulk != null) {
            const deletedActivityIds = response.delete_activity_by_pk_reanchor_to_anchor_bulk
              .filter(({ change_type: changeType }) => {
                return changeType === 'deleted';
              })
              .map(({ affected_row: { id } }) => id);

            activityDirectivesDBStore.updateValue(directives => {
              return (directives || []).filter(directive => {
                return deletedActivityIds.indexOf(directive.id) < 1;
              });
            });

            // If there are activities that did not get deleted
            const leftoverActivities = reanchorRootDeletions.filter(id => !deletedActivityIds.includes(id));
            if (leftoverActivities.length > 0) {
              throw new Error(`Some activities were not successfully deleted: ${leftoverActivities.join(', ')}`);
            }
          } else {
            throw new Error(
              'Something went wrong when attempting to delete and reanchor directives to their closest ancestor',
            );
          }
        }

        if (reanchorPlanDeletions.length) {
          const response = await reqHasura<
            {
              affected_row: ActivityDirective;
              change_type: string;
            }[]
          >(
            gql.DELETE_ACTIVITY_DIRECTIVES_REANCHOR_PLAN_START,
            {
              activity_ids: convertToGQLArray(reanchorPlanDeletions),
              plan_id: plan.id,
            },
            user,
          );

          if (response.delete_activity_by_pk_reanchor_plan_start_bulk != null) {
            const deletedActivityIds = response.delete_activity_by_pk_reanchor_plan_start_bulk
              .filter(({ change_type: changeType }) => {
                return changeType === 'deleted';
              })
              .map(({ affected_row: { id } }) => id);

            activityDirectivesDBStore.updateValue(directives => {
              return (directives || []).filter(directive => {
                return deletedActivityIds.indexOf(directive.id) < 1;
              });
            });

            // If there are activities that did not get deleted
            const leftoverActivities = reanchorPlanDeletions.filter(id => !deletedActivityIds.includes(id));
            if (leftoverActivities.length > 0) {
              throw new Error(`Some activities were not successfully deleted: ${leftoverActivities.join(', ')}`);
            }
          } else {
            throw new Error('Something went wrong when attempting to delete and reanchor directives to the plan start');
          }
        }

        if (subtreeDeletions.length) {
          const response = await reqHasura<
            {
              affected_row: ActivityDirective;
              change_type: string;
            }[]
          >(
            gql.DELETE_ACTIVITY_DIRECTIVES_SUBTREE,
            {
              activity_ids: convertToGQLArray(subtreeDeletions),
              plan_id: plan.id,
            },
            user,
          );

          if (response.delete_activity_by_pk_delete_subtree_bulk) {
            const deletedActivityIds = response.delete_activity_by_pk_delete_subtree_bulk
              .filter(({ change_type: changeType }) => {
                return changeType === 'deleted';
              })
              .map(({ affected_row: { id } }) => id);

            activityDirectivesDBStore.updateValue(directives => {
              return (directives || []).filter(directive => {
                return deletedActivityIds.indexOf(directive.id) < 1;
              });
            });
            // If there are activities that did not get deleted
            const leftoverActivities = subtreeDeletions.filter(id => !deletedActivityIds.includes(id));
            if (leftoverActivities.length > 0) {
              throw new Error(`Some activities were not successfully deleted: ${leftoverActivities.join(', ')}`);
            }
          } else {
            throw new Error('Something went wrong when attempting to delete directives and their children');
          }
        }

        if (normalDeletions.length) {
          const response = await reqHasura<{ returning: { id: number }[] }>(
            gql.DELETE_ACTIVITY_DIRECTIVES,
            {
              activity_ids: normalDeletions,
              plan_id: plan.id,
            },
            user,
          );

          if (response.deleteActivityDirectives) {
            const deletedActivityIds = response.deleteActivityDirectives.returning.map(({ id }) => id);
            activityDirectivesDBStore.updateValue(directives => {
              return (directives || []).filter(directive => {
                return deletedActivityIds.indexOf(directive.id) < 1;
              });
            });
            // If there are activities that did not get deleted
            const leftoverActivities = normalDeletions.filter(id => !deletedActivityIds.includes(id));
            if (leftoverActivities.length > 0) {
              throw new Error(`Some activities were not successfully deleted: ${leftoverActivities.join(', ')}`);
            }
          } else {
            throw new Error('Something went wrong when attempting to delete directives');
          }
        }

        showSuccessToast('Activity Directives Deleted Successfully');
        return true;
      }
    } catch (e) {
      catchError('Activity Directives Delete Failed', e as Error);
      showFailureToast('Activity Directives Delete Failed');
    }

    return false;
  },

  async deleteActivityPreset(activityPreset: ActivityPreset, modelName: string, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_ACTIVITY_PRESET(user, activityPreset)) {
        throwPermissionError('delete an activity preset');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `This will permanently delete the preset for the mission model: ${modelName}`,
        'Delete Permanently',
      );

      if (confirm) {
        const data = await reqHasura<{ id: number }>(gql.DELETE_ACTIVITY_PRESET, { id: activityPreset.id }, user);
        if (data.deleteActivityPreset != null) {
          showSuccessToast('Activity Preset Deleted Successfully');
          return true;
        } else {
          throw Error(`Unable to delete activity preset with ID: "${activityPreset.id}"`);
        }
      }
    } catch (e) {
      catchError('Activity Preset Delete Failed', e as Error);
      showFailureToast('Activity Preset Delete Failed');
    }

    return false;
  },

  async deleteChannelDictionary(id: number, user: User | null): Promise<void> {
    try {
      if (!queryPermissions.DELETE_CHANNEL_DICTIONARY(user)) {
        throwPermissionError('delete this channel dictionary');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `Are you sure you want to delete the dictionary with ID: "${id}"?`,
        'Delete Channel Dictionary',
      );

      if (confirm) {
        const data = await reqHasura<{ id: number }>(gql.DELETE_CHANNEL_DICTIONARY, { id }, user);
        if (data.deleteChannelDictionary != null) {
          showSuccessToast('Channel Dictionary Deleted Successfully');
          channelDictionariesStore.filterValueById(id);
        } else {
          throw Error(`Unable to delete channel dictionary with ID: "${id}"`);
        }
      }
    } catch (e) {
      catchError('Channel Dictionary Delete Failed', e as Error);
      showFailureToast('Channel Dictionary Delete Failed');
    }
  },

  async deleteCommandDictionary(id: number, user: User | null): Promise<void> {
    try {
      if (!queryPermissions.DELETE_COMMAND_DICTIONARY(user)) {
        throwPermissionError('delete this command dictionary');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `Are you sure you want to delete the dictionary with ID: "${id}"?`,
        'Delete Command Dictionary',
      );

      if (confirm) {
        const data = await reqHasura<{ id: number }>(gql.DELETE_COMMAND_DICTIONARY, { id }, user);
        if (data.deleteCommandDictionary != null) {
          showSuccessToast('Command Dictionary Deleted Successfully');
          commandDictionariesStore.filterValueById(id);
        } else {
          throw Error(`Unable to delete command dictionary with ID: "${id}"`);
        }
      }
    } catch (e) {
      catchError('Command Dictionary Delete Failed', e as Error);
      showFailureToast('Command Dictionary Delete Failed');
    }
  },

  async deleteConstraint(constraint: ConstraintMetadata, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_CONSTRAINT_METADATA(user, constraint)) {
        throwPermissionError('delete this constraint');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `Are you sure you want to delete "${constraint.name}"?`,
        'Delete Constraint',
      );

      if (confirm) {
        const data = await reqHasura<{ id: number }>(gql.DELETE_CONSTRAINT_METADATA, { id: constraint.id }, user);
        if (data.deleteConstraintMetadata != null) {
          showSuccessToast('Constraint Deleted Successfully');
          return true;
        } else {
          throw Error(`Unable to delete constraint "${constraint.name}"`);
        }
      }
    } catch (e) {
      catchError('Constraint Delete Failed', e as Error);
      showFailureToast('Constraint Delete Failed');
    }

    return false;
  },

  async deleteConstraintInvocations(
    plan: Plan,
    constraintInvocationIdsToDelete: (number | undefined)[],
    user: User | null,
  ) {
    try {
      if (!queryPermissions.DELETE_CONSTRAINT_INVOCATIONS(user, plan)) {
        throwPermissionError("delete this constraint's invocations");
      }
      const { deleteConstraintPlanSpecifications } = await reqHasura(
        gql.DELETE_CONSTRAINT_INVOCATIONS,
        {
          constraintInvocationIdsToDelete,
        },
        user,
      );

      if (deleteConstraintPlanSpecifications !== null) {
        showSuccessToast(`Constraints Updated Successfully`);
      } else {
        throw Error('Unable to update the constraint specifications for the plan');
      }
    } catch (e) {
      catchError('Constraint Plan Specifications Update Failed', e as Error);
      showFailureToast('Constraint Plan Specifications Update Failed');
    }
  },

  async deleteDerivationGroup(derivationGroups: DerivationGroup[] | null, user: User | null): Promise<void> {
    try {
      if (!queryPermissions.DELETE_DERIVATION_GROUPS(user, derivationGroups)) {
        throwPermissionError('delete a derivation group');
      }

      if (derivationGroups !== null) {
        const derivationGroupNames: string[] = derivationGroups.map(derivationGroup => derivationGroup.name);

        // Show confirmation modal prior to running deletion
        // TODO: Account for non-empty Derivation Groups which cannot be deleted
        const { confirm } = await showDeleteDerivationGroupModal(derivationGroups);
        if (confirm) {
          const data = await reqHasura<{ name: string }>(
            gql.DELETE_DERIVATION_GROUPS,
            { derivationGroupNames: derivationGroupNames },
            user,
          );
          if (data.deleteDerivationGroup === null) {
            throw Error('Unable to delete derivation group');
          } else {
            showSuccessToast('Derivation Group Deleted Successfully');
          }
        }
      }
    } catch (e) {
      catchError('Derivation Group Deletion Failed', e as Error);
      showFailureToast('Derivation Group Deletion Failed');
    }
  },

  async deleteDerivationGroupForPlan(
    derivation_group_name: string,
    plan: Plan | null,
    user: User | null,
  ): Promise<void> {
    try {
      if ((plan && !queryPermissions.DELETE_PLAN_DERIVATION_GROUP(user, plan)) || !plan) {
        throwPermissionError('delete a derivation group from the plan');
      }

      // (use the same as above store, as the behavior is employed on the same panel, therefore so would the error)
      derivationGroupPlanLinkErrorStore.set(null);
      if (plan !== null) {
        const data = await reqHasura<{
          returning: {
            derivation_group_name: string;
            plan_id: number;
          }[];
        }>(
          gql.DELETE_PLAN_DERIVATION_GROUP,
          {
            where: {
              _and: {
                derivation_group_name: { _eq: derivation_group_name },
                plan_id: { _eq: plan.id },
              },
            },
          },
          user,
        );
        const sourceDissociation = data.planDerivationGroupLink?.returning[0];
        // If the return was null, do nothing - only act on success or non-null
        if (sourceDissociation) {
          showSuccessToast('Derivation Group Disassociated Successfully');
        }
      } else {
        throw Error('Plan is not defined.');
      }
    } catch (e) {
      catchError('Derivation Group De-linking Failed', e as Error);
      showFailureToast('Derivation Group De-linking Failed');
      derivationGroupPlanLinkErrorStore.set((e as Error).message);
    }
  },

  async deleteExpansionRule(rule: ExpansionRule, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_EXPANSION_RULE(user, rule)) {
        throwPermissionError('delete an expansion rule');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `Are you sure you want to delete "${rule.name}"?`,
        'Delete Expansion Rule',
      );

      if (confirm) {
        const data = await reqHasura(gql.DELETE_EXPANSION_RULE, { id: rule.id }, user);

        if (data.deleteExpansionRule != null) {
          showSuccessToast('Expansion Rule Deleted Successfully');
          return true;
        } else {
          throw Error(`Unable to delete expansion rule "${rule.name}"`);
        }
      }
    } catch (e) {
      catchError('Expansion Rule Delete Failed', e as Error);
      showFailureToast('Expansion Rule Delete Failed');
    }

    return false;
  },

  async deleteExpansionRuleTags(tagIds: Tag['id'][], ruleId: number, user: User | null): Promise<number | null> {
    try {
      if (!queryPermissions.DELETE_EXPANSION_RULE_TAGS(user)) {
        throwPermissionError('delete expansion rule tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(
        gql.DELETE_EXPANSION_RULE_TAGS,
        { rule_id: ruleId, tag_ids: tagIds },
        user,
      );
      const { delete_expansion_rule_tags: deleteExpansionRuleTags } = data;
      if (deleteExpansionRuleTags != null) {
        const { affected_rows: affectedRows } = deleteExpansionRuleTags;
        return affectedRows;
      } else {
        throw Error('Unable to delete expansion rule tags');
      }
    } catch (e) {
      catchError('Delete Expansion Rule Tags Failed', e as Error);
      showFailureToast('Delete Expansion Rule Tags Failed');
      return null;
    }
  },

  async deleteExpansionSequence(sequence: ExpansionSequence, user: User | null): Promise<void> {
    try {
      if (!queryPermissions.DELETE_EXPANSION_SEQUENCE(user)) {
        throwPermissionError('delete an expansion sequence');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `Are you sure you want to delete expansion sequence with sequence ID: "${sequence.seq_id}"?`,
        'Delete Expansion Sequence',
      );

      if (confirm) {
        const { seq_id: seqId, simulation_dataset_id: simulationDatasetId } = sequence;
        const data = await reqHasura<SeqId>(gql.DELETE_EXPANSION_SEQUENCE, { seqId, simulationDatasetId }, user);
        if (data.deleteExpansionSequence != null) {
          showSuccessToast('Expansion Sequence Deleted Successfully');
        } else {
          throw Error(`Unable to delete expansion sequence with ID: "${seqId}"`);
        }
      }
    } catch (e) {
      catchError('Expansion Sequence Delete Failed', e as Error);
      showFailureToast('Expansion Sequence Delete Failed');
    }
  },

  async deleteExpansionSequenceToActivity(
    simulationDatasetId: number,
    simulatedActivityId: number,
    user: User | null,
  ): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_EXPANSION_SEQUENCE_TO_ACTIVITY(user)) {
        throwPermissionError('delete an expansion sequence from an activity');
      }

      const data = await reqHasura<SeqId>(
        gql.DELETE_EXPANSION_SEQUENCE_TO_ACTIVITY,
        {
          simulated_activity_id: simulatedActivityId,
          simulation_dataset_id: simulationDatasetId,
        },
        user,
      );
      if (data.expansionSequence != null) {
        showSuccessToast('Expansion Sequence Deleted From Activity Successfully');
        return true;
      } else {
        throw Error(
          `Unable to remove the associated expansion sequence from the dataset ${simulationDatasetId} and the activity ${simulatedActivityId}`,
        );
      }
    } catch (e) {
      catchError('Delete Expansion Sequence From Activity Failed', e as Error);
      showFailureToast('Delete Expansion Sequence From Activity Failed');
      return false;
    }
  },

  async deleteExpansionSet(set: ExpansionSet, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_EXPANSION_SET(user, set)) {
        throwPermissionError('delete an expansion set');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `Are you sure you want to delete "${set.name}"?`,
        'Delete Expansion Set',
      );

      if (confirm) {
        const data = await reqHasura<{ id: number }>(gql.DELETE_EXPANSION_SET, { id: set.id }, user);
        if (data.deleteExpansionSet != null) {
          showSuccessToast('Expansion Set Deleted Successfully');
          return true;
        } else {
          throw Error(`Unable to delete expansion set "${set.name}"`);
        }
      }

      return false;
    } catch (e) {
      catchError('Expansion Set Delete Failed', e as Error);
      showFailureToast('Expansion Set Delete Failed');
      return false;
    }
  },

  async deleteExternalEventType(
    externalEventTypes: string[] | null,
    externalEventTypesInUse: ExternalEventType[],
    user: User | null,
  ): Promise<void> {
    try {
      if (!queryPermissions.DELETE_EXTERNAL_EVENT_TYPE(user)) {
        throwPermissionError('delete an external event type');
      }

      if (externalEventTypes !== null) {
        const associatedItems = externalEventTypesInUse.map(externalEventType => externalEventType.name);
        const { confirm } = await showDeleteExternalEventSourceTypeModal(
          externalEventTypes,
          'External Event Type(s)',
          new Set(associatedItems),
        );

        if (confirm) {
          const data = await reqHasura<{ id: number }>(
            gql.DELETE_EXTERNAL_EVENT_TYPE,
            { names: externalEventTypes },
            user,
          );
          if (data.deleteDerivationGroup === null) {
            throw Error('Unable to delete external event type');
          }
          showSuccessToast('External Event Type Deleted Successfully');
        }
      }
    } catch (e) {
      catchError('External Event Type Deletion Failed', e as Error);
      showFailureToast('External Event Type Deletion Failed');
    }
  },

  async deleteExternalSource(
    externalSources: ExternalSourceSlim[] | null,
    planDerivationGroupLinks: PlanDerivationGroup[],
    user: User | null,
  ): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_EXTERNAL_SOURCES(user, externalSources)) {
        throwPermissionError('delete an external source');
      }
      if (externalSources !== null) {
        // Check if any of the external sources still have associations, in which case they need to be removed from the to-be-deleted array
        const currentlyLinked: { pkey: ExternalSourcePkey; plan_ids: number[] }[] = [];
        const unassociatedSources: ExternalSourceSlim[] = [];
        for (const externalSource of externalSources) {
          const currentExternalSourcePlanLinks: PlanDerivationGroup[] = planDerivationGroupLinks.filter(
            planDerivationGroupLink =>
              planDerivationGroupLink.derivation_group_name === externalSource.derivation_group_name,
          );
          const linkedPlanIds: (number | undefined)[] = currentExternalSourcePlanLinks.map(
            planDerivationGroupLink => planDerivationGroupLink.plan_id,
          );
          const definedPlanIds: number[] = linkedPlanIds.filter(
            (currentPlanId): currentPlanId is number => currentPlanId !== undefined,
          );
          if (definedPlanIds !== undefined && definedPlanIds.length > 0) {
            currentlyLinked.push({
              pkey: { derivation_group_name: externalSource.derivation_group_name, key: externalSource.key },
              plan_ids: definedPlanIds,
            });
          } else {
            unassociatedSources.push(externalSource);
          }
        }

        // Show confirmation modal prior to running deletion
        const { confirm } = await showDeleteExternalSourceModal(currentlyLinked, externalSources, unassociatedSources);
        if (confirm) {
          // cannot easily do composite keys in GraphQL, so we group by derivation group and send a query per group of keys
          const derivationGroups: { [derivationGroupName: string]: string[] } = {};
          for (const externalSource of unassociatedSources) {
            if (derivationGroups[externalSource.derivation_group_name]) {
              derivationGroups[externalSource.derivation_group_name].push(externalSource.key);
            } else {
              derivationGroups[externalSource.derivation_group_name] = [externalSource.key];
            }
          }

          // send each group's query out
          for (const derivationGroupName of Object.keys(derivationGroups)) {
            const data = await reqHasura<{ derivationGroupName: string; sourceKeys: string[] }>(
              gql.DELETE_EXTERNAL_SOURCES,
              {
                derivationGroupName: derivationGroupName,
                sourceKeys: derivationGroups[derivationGroupName],
              },
              user,
            );
            if (data.deleteExternalSource === null) {
              throw Error('Unable to delete external source');
            }
          }
          showSuccessToast('External Source Deleted Successfully');
          return true;
        }
      }
    } catch (e) {
      catchError('External Source Deletion Failed', e as Error);
      showFailureToast('External Source Deletion Failed');
      return false;
    }
    return false;
  },

  async deleteExternalSourceType(
    externalSourceTypes: string[] | null,
    externalSources: ExternalSourceSlim[],
    user: User | null,
  ): Promise<void> {
    try {
      if (!queryPermissions.DELETE_EXTERNAL_SOURCE_TYPE(user)) {
        throwPermissionError('delete an external source type');
      }
      if (externalSourceTypes !== null) {
        const associatedItems = externalSources.filter(externalSource => {
          return externalSourceTypes.includes(externalSource.source_type_name);
        });

        const { confirm } = await showDeleteExternalEventSourceTypeModal(
          externalSourceTypes,
          'External Source Type(s)',
          new Set(associatedItems.map(externalSource => externalSource.source_type_name)),
        );

        if (confirm) {
          const data = await reqHasura<{ name: string }>(
            gql.DELETE_EXTERNAL_SOURCE_TYPE,
            { names: externalSourceTypes },
            user,
          );
          if (data.deleteDerivationGroup === null) {
            throw Error('Unable to delete external source type');
          } else {
            showSuccessToast('External Source Type Deletion Successful');
          }
        }
      }
    } catch (e) {
      catchError('External Source Type Deletion Failed', e as Error);
      showFailureToast('External Source Type Deletion Failed');
    }
  },

  async deleteFile(id: number, user: User | null): Promise<boolean> {
    try {
      await reqGateway(`/file/${id}`, 'DELETE', null, user, false);
      return true;
    } catch (e) {
      catchError(e as Error);
      return false;
    }
  },

  async deleteModel(model: ModelSlim, user: User | null): Promise<void> {
    try {
      if (!queryPermissions.DELETE_MODEL(user)) {
        throwPermissionError('delete this model');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `Are you sure you want to delete "${model.name}" version ${model.version}?`,
        'Delete Model',
      );

      if (confirm) {
        const { id, jar_id } = model;
        await effects.deleteFile(jar_id, user);
        const data = await reqHasura<{ id: number }>(gql.DELETE_MODEL, { id }, user);
        if (data.deleteModel != null) {
          showSuccessToast('Model Deleted Successfully');
          modelsStore.filterValueById(id);
        } else {
          throw Error(`Unable to delete model "${model.name}"`);
        }
      }
    } catch (e) {
      catchError('Model Delete Failed', e as Error);
      showFailureToast('Model Delete Failed');
    }
  },

  async deleteParameterDictionary(id: number, user: User | null): Promise<void> {
    try {
      if (!queryPermissions.DELETE_PARAMETER_DICTIONARY(user)) {
        throwPermissionError('delete this parameter dictionary');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `Are you sure you want to delete the dictionary with ID: "${id}"?`,
        'Delete Parameter Dictionary',
      );

      if (confirm) {
        const data = await reqHasura<{ id: number }>(gql.DELETE_PARAMETER_DICTIONARY, { id }, user);
        if (data.deleteParameterDictionary != null) {
          showSuccessToast('Parameter Dictionary Deleted Successfully');
          parameterDictionariesStore.filterValueById(id);
        } else {
          throw Error(`Unable to delete parameter dictionary with ID: "${id}"`);
        }
      }
    } catch (e) {
      catchError('Parameter Dictionary Delete Failed', e as Error);
      showFailureToast('Parameter Dictionary Delete Failed');
    }
  },

  async deleteParcel(parcel: Parcel, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_PARCEL(user, parcel)) {
        throwPermissionError('delete this parcel');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `Are you sure you want to delete "${parcel.name}"?`,
        'Delete Parcel',
      );

      if (confirm) {
        const data = await reqHasura<{ id: number }>(gql.DELETE_PARCEL, { id: parcel.id }, user);

        if (data.deleteParcel === null) {
          throw Error(`Unable to delete parcel "${parcel.name}"`);
        }

        showSuccessToast('Parcel Deleted Successfully');
        return true;
      }

      return false;
    } catch (e) {
      catchError('Parcel Delete Failed', e as Error);
      showFailureToast('Parcel Delete Failed');
      return false;
    }
  },

  async deleteParcelToDictionaryAssociations(
    parcelToParameterDictionariesToDelete: ParcelToParameterDictionary[],
    user: User | null,
  ): Promise<number | null> {
    try {
      if (!queryPermissions.DELETE_PARCEL_TO_DICTIONARY_ASSOCIATION(user)) {
        throwPermissionError('delete parcel to dictionary association');
      }

      const parcelIds = parcelToParameterDictionariesToDelete.map(p => p.parcel_id);
      const parameterDictionaryIds = parcelToParameterDictionariesToDelete.map(p => p.parameter_dictionary_id);

      const data = await reqHasura<{ affected_rows: number }>(
        gql.DELETE_PARCEL_TO_DICTIONARY_ASSOCIATION,
        { parameterDictionaryIds, parcelIds },
        user,
      );

      const { delete_parcel_to_parameter_dictionary: deleteParcelToParameterDictionary } = data;

      if (deleteParcelToParameterDictionary != null) {
        const { affected_rows: affectedRows } = deleteParcelToParameterDictionary;

        if (affectedRows !== parameterDictionaryIds.length) {
          throw Error('Some parcel to dictionary associations were not successfully deleted');
        }

        showSuccessToast('Parcel to dictionary association deleted Successfully');
        return affectedRows;
      } else {
        throw Error('Unable to delete parcel to dictionary associations');
      }
    } catch (e) {
      catchError('Delete parcel to dictionary associations failed', e as Error);
      showFailureToast('Delete parcel to dictionary associations failed');
      return null;
    }
  },

  async deletePlan(plan: PlanSlim, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_PLAN(user, plan)) {
        throwPermissionError('delete this plan');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `Are you sure you want to delete "${plan.name}"?`,
        'Delete Plan',
      );

      if (confirm) {
        const data = await reqHasura(gql.DELETE_PLAN, { id: plan.id }, user);
        if (data.deletePlan != null) {
          showSuccessToast('Plan Deleted Successfully');
          return true;
        } else {
          throw Error(`Unable to delete the plan with "${plan.name}"`);
        }
      }

      return false;
    } catch (e) {
      catchError('Plan Delete Failed', e as Error);
      showFailureToast('Plan Delete Failed');
      return false;
    }
  },

  async deletePlanCollaborator(plan: Plan, collaborator: string, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_PLAN_COLLABORATOR(user, plan)) {
        throwPermissionError('delete plan snapshot');
      }

      const data = await reqHasura(gql.DELETE_PLAN_COLLABORATOR, { collaborator, planId: plan.id }, user);
      if (data.deletePlanCollaborator != null) {
        showSuccessToast('Plan Collaborator Removed Successfully');
        return true;
      } else {
        throw Error('Unable to remove plan collaborator');
      }
    } catch (e) {
      catchError('Remove Plan Collaborator Failed', e as Error);
      showFailureToast('Remove Plan Collaborator Failed');
      return false;
    }
  },

  async deletePlanSnapshot(snapshot: PlanSnapshot, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_PLAN_SNAPSHOT(user)) {
        throwPermissionError('delete plan snapshot');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `Are you sure you want to delete the plan snapshot "${snapshot.snapshot_name}"?`,
        'Delete Plan Snapshot',
      );

      if (confirm) {
        const data = await reqHasura(gql.DELETE_PLAN_SNAPSHOT, { snapshot_id: snapshot.snapshot_id }, user);
        if (data.deletePlanSnapshot != null) {
          showSuccessToast('Plan Snapshot Deleted Successfully');
          return true;
        } else {
          throw Error('Unable to delete plan snapshot');
        }
      }

      return false;
    } catch (e) {
      catchError('Delete Plan Snapshot Failed', e as Error);
      showFailureToast('Delete Plan Snapshot Failed');
      return false;
    }
  },

  async deletePlanTag(tagId: Tag['id'], planId: number, user: User | null): Promise<number | null> {
    try {
      if (!queryPermissions.DELETE_PLAN_TAG(user)) {
        throwPermissionError('delete plan tag');
      }

      const data = await reqHasura<{ tag_id: number }>(gql.DELETE_PLAN_TAG, { plan_id: planId, tag_id: tagId }, user);
      if (data.delete_plan_tags_by_pk != null) {
        showSuccessToast('Plan Updated Successfully');
        return data.delete_plan_tags_by_pk.tag_id;
      } else {
        throw Error('Unable to delete plan tag');
      }
    } catch (e) {
      catchError('Delete Plan Tag Failed', e as Error);
      showFailureToast('Delete Plan Tag Failed');
      return null;
    }
  },

  async deleteSchedulingCondition(condition: SchedulingConditionMetadata, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_SCHEDULING_CONDITION_METADATA(user, condition)) {
        throwPermissionError('delete this scheduling condition');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `Are you sure you want to delete "${condition.name}"?`,
        'Delete Scheduling Condition',
      );

      if (confirm) {
        const data = await reqHasura<{ id: number }>(
          gql.DELETE_SCHEDULING_CONDITION_METADATA,
          { id: condition.id },
          user,
        );
        if (data.deleteSchedulingConditionMetadata != null) {
          showSuccessToast('Scheduling Condition Deleted Successfully');
          return true;
        } else {
          throw Error(`Unable to delete scheduling condition "${condition.name}"`);
        }
      } else {
        return false;
      }
    } catch (e) {
      catchError('Scheduling Condition Delete Failed', e as Error);
      showFailureToast('Scheduling Condition Delete Failed');
      return false;
    }
  },

  async deleteSchedulingGoal(goal: SchedulingGoalMetadata, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_SCHEDULING_GOAL_METADATA(user, goal)) {
        throwPermissionError('delete this scheduling goal');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `Are you sure you want to delete "${goal.name}"?`,
        'Delete Scheduling Goal',
      );

      if (confirm) {
        const data = await reqHasura<{ id: number }>(gql.DELETE_SCHEDULING_GOAL_METADATA, { id: goal.id }, user);

        if (data.deleteSchedulingGoalMetadata) {
          showSuccessToast('Scheduling Goal Deleted Successfully');
          return true;
        } else {
          throw Error(`Unable to delete scheduling goal "${goal.name}"`);
        }
      } else {
        return false;
      }
    } catch (e) {
      catchError('Scheduling Goal Delete Failed', e as Error);
      showFailureToast('Scheduling Goal Delete Failed');
      return false;
    }
  },

  async deleteSchedulingGoalInvocations(
    plan: Plan,
    schedulingSpecificationId: number,
    goalInvocationIdsToDelete: (number | undefined)[],
    user: User | null,
  ) {
    try {
      if (!queryPermissions.DELETE_SCHEDULING_GOAL_INVOCATIONS(user, plan)) {
        throwPermissionError("delete this scheduling goal's invocations");
      }
      const { deleteConstraintPlanSpecifications } = await reqHasura(
        gql.DELETE_SCHEDULING_GOAL_INVOCATIONS,
        {
          goalInvocationIdsToDelete,
          specificationId: schedulingSpecificationId,
        },
        user,
      );

      if (deleteConstraintPlanSpecifications !== null) {
        showSuccessToast(`Scheduling Goals Updated Successfully`);
      } else {
        throw Error('Unable to update the scheduling goal specifications for the plan');
      }
    } catch (e) {
      catchError('Scheduling Goal Plan Specifications Update Failed', e as Error);
      showFailureToast('Scheduling Goal Plan Specifications Update Failed');
    }
  },

  async deleteSequenceAdaptation(id: number, user: User | null): Promise<void> {
    try {
      if (!queryPermissions.DELETE_SEQUENCE_ADAPTATION(user)) {
        throwPermissionError('delete this sequence adaptation');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `Are you sure you want to delete the sequence adaptation with ID: "${id}"?`,
        'Delete Sequence Adaptation',
      );

      if (confirm) {
        const data = await reqHasura<{ id: number }>(gql.DELETE_SEQUENCE_ADAPTATION, { id }, user);
        if (data.deleteSequenceAdaptation === null) {
          throw Error(`Unable to delete sequence adaptation with ID: "${id}"`);
        }

        showSuccessToast('Sequence Adaptation Deleted Successfully');
        sequenceAdaptationsStore.filterValueById(id);
      }
    } catch (e) {
      catchError('Sequence Adaptation Delete Failed', e as Error);
      showFailureToast('Sequence Adaptation Delete Failed');
    }
  },

  async deleteSequenceFilters(sequenceFilterIds: number[], user: User | null): Promise<void> {
    try {
      if (!queryPermissions.DELETE_SEQUENCE_FILTERS(user)) {
        throwPermissionError('delete the sequence filters');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `This will permanently delete the sequence filters '${sequenceFilterIds}'`,
        'Delete Permanently',
      );

      if (confirm) {
        const data = await reqHasura<{ sequenceFilterIds: number[] }>(
          gql.DELETE_SEQUENCE_FILTERS,
          { sequenceFilterIds },
          user,
        );
        if (data.deleteSequenceFilters != null) {
          showSuccessToast('Sequence Filters Deleted Successfully');
        } else {
          throw Error(`Unable to delete sequence filters with IDs: "${sequenceFilterIds}"`);
        }
      }
    } catch (e) {
      catchError('Sequence Filter Delete Failed', e as Error);
      showFailureToast('Sequence Filter Delete Failed');
    }
  },

  async deleteSequenceTemplate(sequenceTemplate: SequenceTemplate, user: User | null): Promise<void> {
    try {
      if (!queryPermissions.DELETE_SEQUENCE_TEMPLATE(user)) {
        throwPermissionError('delete this sequence template');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `This will permanently delete the template ("${sequenceTemplate.name}") for the activity type: ${sequenceTemplate.activity_type}`,
        'Delete Permanently',
      );

      if (confirm) {
        const data = await reqHasura<{ sequenceTemplateId: number }>(
          gql.DELETE_SEQUENCE_TEMPLATE,
          { sequenceTemplateId: sequenceTemplate.id },
          user,
        );

        const { delete_sequence_template_by_pk: deleteSequenceTemplate } = data;

        if (deleteSequenceTemplate !== null) {
          showSuccessToast('Sequence Template Deleted Successfully');
        } else {
          throw Error(`Unable to delete sequence template with ID: "${sequenceTemplate.id}"`);
        }
      }
    } catch (e) {
      catchError('Sequence Template Deletion Failed', e as Error);
      showFailureToast('Sequence Template Deletion Failed');
    }
  },

  async deleteSimulationTemplate(
    simulationTemplate: SimulationTemplate,
    modelName: string,
    user: User | null,
  ): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_SIMULATION_TEMPLATE(user, simulationTemplate)) {
        throwPermissionError('delete this simulation template');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `This will permanently delete the template for the mission model: ${modelName}`,
        'Delete Permanently',
      );

      if (confirm) {
        const data = await reqHasura<{ id: number }>(
          gql.DELETE_SIMULATION_TEMPLATE,
          { id: simulationTemplate.id },
          user,
        );
        if (data.deleteSimulationTemplate != null) {
          showSuccessToast('Simulation Template Deleted Successfully');
          return true;
        } else {
          throw Error(`Unable to delete simulation template with ID: "${simulationTemplate.id}"`);
        }
      }
    } catch (e) {
      catchError('Simulation Template Delete Failed', e as Error);
      showFailureToast('Simulation Template Delete Failed');
    }

    return false;
  },

  async deleteTag(tag: Tag, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_TAG(user, tag)) {
        throwPermissionError('delete tags');
      }

      await reqHasura<{ id: number }>(gql.DELETE_TAG, { id: tag.id }, user);
      showSuccessToast('Tag Deleted Successfully');
      return true;
    } catch (e) {
      catchError('Delete Tag Failed', e as Error);
      showFailureToast('Delete Tag Failed');
      return false;
    }
  },

  async deleteTimelineHorizontalGuides(timelineId?: number | null, rowId?: number | null) {
    const { confirm } = await showConfirmModal(
      'Delete',
      `Are you sure you want to delete all horizontal guides for this row?`,
      'Delete Rows',
      true,
    );
    if (confirm) {
      viewUpdateRow('horizontalGuides', [], timelineId, rowId);
    }
  },

  async deleteTimelineLayers(
    layers: Layer[],
    chartType: 'activity' | 'resource' | 'externalEvent',
    timelineId?: number | null,
    rowId?: number | null,
  ) {
    const { confirm } = await showConfirmModal(
      'Delete',
      `Are you sure you want to delete all ${chartType} layers in this row?`,
      'Delete Rows',
      true,
    );
    if (confirm) {
      const filteredLayers = layers.filter(l => {
        if (chartType === 'activity') {
          return l.chartType !== 'activity';
        } else if (chartType === 'externalEvent') {
          return l.chartType !== 'externalEvent';
        } else if (chartType === 'resource') {
          return l.chartType !== 'line' && l.chartType !== 'x-range';
        }
        return true;
      });
      viewUpdateRow('layers', filteredLayers, timelineId, rowId);
    }
  },

  async deleteTimelineRow(row: Row, rows: Row[], timelineId: number | null) {
    const { confirm } = await showConfirmModal(
      'Delete',
      `Are you sure you want to delete timeline row: ${row.name}?`,
      'Delete Row',
      true,
    );
    if (confirm) {
      const filteredRows = rows.filter(r => r.id !== row.id);
      viewUpdateTimeline('rows', filteredRows, timelineId);
    }
  },

  async deleteTimelineRows(timelineId: number | null) {
    const { confirm } = await showConfirmModal(
      'Delete',
      `Are you sure you want to delete all timeline rows?`,
      'Delete Rows',
      true,
    );
    if (confirm) {
      viewUpdateTimeline('rows', [], timelineId);
    }
  },

  async deleteTimelineVerticalGuides(timelineId: number | null) {
    const { confirm } = await showConfirmModal(
      'Delete',
      `Are you sure you want to delete all vertical guides?`,
      'Delete Rows',
      true,
    );
    if (confirm) {
      viewUpdateTimeline('verticalGuides', [], timelineId);
    }
  },

  async deleteTimelineYAxes(timelineId?: number | null, rowId?: number | null) {
    const { confirm } = await showConfirmModal(
      'Delete',
      `Are you sure you want to delete all y axes for this row?`,
      'Delete Rows',
      true,
    );
    if (confirm) {
      viewUpdateRow('yAxes', [], timelineId, rowId);
    }
  },

  // TODO: remove this after expansion runs are made to work in new workspaces
  // async deleteUserSequence(sequence: UserSequence, user: User | null): Promise<boolean> {
  //   try {
  //     if (!queryPermissions.DELETE_USER_SEQUENCE(user, sequence)) {
  //       throwPermissionError('delete this user sequence');
  //     }

  //     const { confirm } = await showConfirmModal(
  //       'Delete',
  //       `Are you sure you want to delete "${sequence.name}"?`,
  //       'Delete User Sequence',
  //     );

  //     if (confirm) {
  //       const data = await reqHasura<{ id: number }>(gql.DELETE_USER_SEQUENCE, { id: sequence.id }, user);
  //       if (data.deleteUserSequence != null) {
  //         showSuccessToast('User Sequence Deleted Successfully');
  //         return true;
  //       } else {
  //         throw Error(`Unable to delete user sequence "${sequence.name}"`);
  //       }
  //     }

  //     return false;
  //   } catch (e) {
  //     catchError('User Sequence Delete Failed', e as Error);
  //     showFailureToast('User Sequence Delete Failed');
  //     return false;
  //   }
  // },

  async deleteView(view: ViewSlim, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_VIEW(user, view)) {
        throwPermissionError('delete this view');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `Are you sure you want to delete "${view.name}"?`,
        'Delete View',
      );

      if (confirm) {
        const data = await reqHasura<{ id: number }>(gql.DELETE_VIEW, { id: view.id }, user);
        if (data.deletedView != null) {
          showSuccessToast('View Deleted Successfully');
          return true;
        } else {
          throw Error(`Unable to delete view "${view.name}"`);
        }
      }
    } catch (e) {
      showFailureToast('View Delete Failed');
      catchError(e as Error);
    }

    return false;
  },

  async deleteViews(views: ViewSlim[], user: User | null): Promise<boolean> {
    try {
      const hasPermission = views.reduce((previousValue, view) => {
        return previousValue && queryPermissions.DELETE_VIEWS(user, view);
      }, true);
      if (!hasPermission) {
        throwPermissionError('delete one or all of these views');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        'Are you sure you want to delete the selected views?',
        'Delete Views',
      );

      if (confirm) {
        const data = await reqHasura<{ returning: { id: number }[] }>(
          gql.DELETE_VIEWS,
          { ids: views.map(({ id }) => id) },
          user,
        );
        if (data.delete_view != null) {
          const deletedViewIds = data.delete_view.returning.map(({ id }) => id);
          const leftoverViewIds = views.filter(({ id }) => !deletedViewIds.includes(id));
          if (leftoverViewIds.length > 0) {
            throw new Error(`Some views were not successfully deleted: ${leftoverViewIds.join(', ')}`);
          }
          showSuccessToast('Views Deleted Successfully');
          return true;
        } else {
          throw Error('Unable to delete views');
        }
      }
    } catch (e) {
      showFailureToast('View Deletes Failed');
      catchError(e as Error);
    }

    return false;
  },

  async deleteWorkspace(workspace: Workspace, user: User | null): Promise<boolean> {
    try {
      if (!featurePermissions.workspaces.canDelete(user, workspace)) {
        throwPermissionError('delete this workspace');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `Are you sure you want to delete "${workspace.name}"?`,
        'Delete Workspace',
      );

      if (confirm) {
        await reqWorkspace(`${workspace.id}`, 'DELETE', null, user, undefined, false);
        showSuccessToast('Workspace Deleted Successfully');
        return true;
      }
    } catch (e) {
      showFailureToast('Workspace Delete Failed');
      catchError(e as Error);
    }

    return false;
  },

  async deleteWorkspaceItem(
    workspace: Workspace,
    originalNode: WorkspaceTreeNode,
    originalPath: string,
    user: User | null,
  ): Promise<void> {
    const typeString: string = originalNode.type === WorkspaceContentType.Directory ? 'Directory' : 'File';
    try {
      if (!featurePermissions.workspace.canDelete(user, workspace, originalNode)) {
        throwPermissionError(`delete this workspace ${typeString.toLowerCase()}`);
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `This will permanently delete the ${typeString.toLowerCase()} from the workspace: ${workspace.name}`,
        'Delete Permanently',
      );

      if (confirm) {
        await reqWorkspace(joinPath([workspace.id, originalPath]), 'DELETE', null, user, undefined, false);

        showSuccessToast(`Workspace ${typeString} Deleted Successfully`);
      }
    } catch (e) {
      catchError(`Workspace ${typeString.toLowerCase()} was unable to be deleted`, e as Error);
      showFailureToast(`Workspace ${typeString} Delete Failed`);
    }
  },

  duplicateTimelineRow(row: Row, timeline: Timeline, timelines: Timeline[]): Row | null {
    const newRow = duplicateRow(row, timelines, timeline.id);
    if (newRow) {
      // Add row after the existing row
      const newRows = timeline.rows ?? [];
      const rowIndex = newRows.findIndex(r => r.id === row.id);
      if (rowIndex > -1) {
        newRows.splice(rowIndex + 1, 0, newRow);
        viewUpdateTimeline('rows', [...newRows], timeline.id);
        return newRow;
      }
    }
    return null;
  },

  async editView(view: View, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.UPDATE_VIEW(user, view)) {
        throwPermissionError('edit this view');
      }

      const { confirm, value = null } = await showEditViewModal();
      if (confirm && value) {
        const { id, name } = value;
        const viewUpdateInput: ViewUpdateInput = { definition: view.definition, name };
        const data = await reqHasura<View>(gql.UPDATE_VIEW, { id, view: viewUpdateInput }, user);
        const { updatedView } = data;

        if (updatedView != null) {
          const { name: updatedName, updated_at } = updatedView;
          applyViewUpdate({ name: updatedName, updated_at });
          showSuccessToast('View Edited Successfully');
          return true;
        } else {
          throw Error(`Unable to edit view "${name}"`);
        }
      }
    } catch (e) {
      catchError('View Edit Failed', e as Error);
      showFailureToast('View Edit Failed');
    }

    return false;
  },

  async editWorkspace(workspace: Workspace, user: User | null): Promise<Workspace | null> {
    try {
      if (!queryPermissions.UPDATE_WORKSPACE(user, workspace)) {
        throwPermissionError('update a workspace');
      }

      const data = await reqHasura<Workspace>(gql.UPDATE_WORKSPACE, { workspace }, user);
      const { updatedWorkspace } = data;

      if (updatedWorkspace != null) {
        showSuccessToast('Workspace Updated Successfully');
        return updatedWorkspace;
      } else {
        throw Error(`Unable to update workspace "${workspace.name}"`);
      }
    } catch (e) {
      catchError('Workspace Update Failed', e as Error);
      showFailureToast('Workspace Update Failed');
    }

    return null;
  },

  async expand(expansionSetId: number, simulationDatasetId: number, plan: Plan, user: User | null): Promise<void> {
    try {
      planExpansionStatusStore.set(Status.Incomplete);

      if (!queryPermissions.EXPAND(user, plan, plan.model)) {
        throwPermissionError('expand this plan');
      }

      const data = await reqHasura<{ id: number }>(gql.EXPAND, { expansionSetId, simulationDatasetId }, user);
      if (data.expand != null) {
        planExpansionStatusStore.set(Status.Complete);
        showSuccessToast('Plan Expanded Successfully');
      } else {
        throw Error('Unable to expand plan');
      }
    } catch (e) {
      catchError('Plan Expansion Failed', e as Error);
      planExpansionStatusStore.set(Status.Failed);
      showFailureToast('Plan Expansion Failed');
    }
  },

  async expandTemplates(seqIds: string[], simulationDatasetId: number, plan: Plan, user: User | null): Promise<void> {
    try {
      sequenceTemplateExpansionStatus.set(Status.Incomplete);
      if (!queryPermissions.EXPAND_TEMPLATES(user, plan, plan.model)) {
        throwPermissionError('expand a sequence template');
      }

      const data = await reqHasura<{ success: boolean }>(
        gql.EXPAND_TEMPLATES,
        {
          modelId: plan.model.id,
          seqIds,
          simulationDatasetId,
        },
        user,
      );

      const { expandAllTemplates: expandTemplates } = data;

      if (expandTemplates !== null) {
        sequenceTemplateExpansionStatus.set(Status.Complete);
        showSuccessToast('Sequence Templating Successfully');
      } else {
        throw Error('Sequence Templating Failed');
      }
    } catch (e) {
      catchError('Sequence Templating Failed', e as Error);
      sequenceTemplateExpansionStatus.set(Status.Failed);
      sequenceTemplateExpansionError.set(e as string);
      showFailureToast('Sequence Templating Failed');
    }
  },

  async getActionRun(actionRunId: number, user: User | null): Promise<ActionRun | null> {
    try {
      const query = convertToQuery(gql.SUB_ACTION_RUN);
      const data = await reqHasura<ActionRun>(query, { actionRunId }, user);
      const { actionRun } = data;
      if (actionRun != null) {
        return actionRun;
      } else {
        throw Error('Unable to retrieve activity run');
      }
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getActivitiesForPlan(planId: number, user: User | null): Promise<ActivityDirectiveDB[]> {
    try {
      const query = convertToQuery(gql.SUB_ACTIVITY_DIRECTIVES);
      const data = await reqHasura<ActivityDirectiveDB[]>(query, { planId }, user);

      const { activity_directives: activityDirectives } = data;
      if (activityDirectives != null) {
        return activityDirectives;
      } else {
        throw Error('Unable to retrieve activities for plan');
      }
    } catch (e) {
      catchError(e as Error);
      return [];
    }
  },

  async getActivityDirectiveChangelog(
    planId: number,
    activityId: number,
    user: User | null,
  ): Promise<ActivityDirectiveRevision[]> {
    try {
      const data = await reqHasura<ActivityDirectiveRevision[]>(
        gql.GET_ACTIVITY_DIRECTIVE_CHANGELOG,
        { activityId, planId },
        user,
      );
      const { activityDirectiveRevisions } = data;

      if (activityDirectiveRevisions != null) {
        // Fill in start_time_ms for each revision if not already calculated
        const updatedRevisions = activityDirectiveRevisions.map(revision => {
          const sourcePlan = get(plan);
          if (sourcePlan) {
            return addAbsoluteTimeToRevision(
              revision,
              activityId,
              sourcePlan,
              get(activityDirectivesDBStore) ?? [],
              get(spansMap) ?? {},
              get(spanUtilityMaps) ?? {
                directiveIdToSpanIdMap: {},
                spanIdToChildIdsMap: {},
                spanIdToDirectiveIdMap: {},
              },
            );
          }
          return revision; // fallback if sourcePlan is undefined
        });
        return updatedRevisions;
      } else {
        throw Error('Unable to retrieve activity directive changelog');
      }
    } catch (e) {
      catchError(e as Error);
      return [];
    }
  },

  async getActivityDirectiveValidations(
    planId: number,
    user: User | null,
  ): Promise<ActivityDirectiveValidationStatus[]> {
    try {
      const data = await reqHasura<ActivityDirectiveValidationStatus[]>(
        gql.SUB_ACTIVITY_DIRECTIVE_VALIDATIONS,
        { planId },
        user,
      );

      const { activity_directive_validations: activityDirectiveValidations } = data;

      if (activityDirectiveValidations != null) {
        return activityDirectiveValidations;
      } else {
        throw Error('Unable to retrieve activity directive validations');
      }
    } catch (e) {
      catchError(e as Error);
      return [];
    }
  },

  async getActivityTypes(modelId: number, user: User | null): Promise<ActivityType[]> {
    try {
      const query = convertToQuery(gql.SUB_ACTIVITY_TYPES);
      const data = await reqHasura<ActivityType[]>(query, { modelId }, user);
      const { activity_type: activityTypes } = data;
      if (activityTypes != null) {
        return activityTypes;
      } else {
        throw Error('Unable to retrieve activity types');
      }
    } catch (e) {
      catchError(e as Error);
      return [];
    }
  },

  async getActivityTypesExpansionRules(
    modelId: number | null | undefined,
    user: User | null,
  ): Promise<ActivityTypeExpansionRules[]> {
    if (modelId !== null && modelId !== undefined) {
      try {
        const data = await reqHasura<ActivityTypeExpansionRules[]>(
          gql.GET_ACTIVITY_TYPES_EXPANSION_RULES,
          { modelId },
          user,
        );
        const { activity_types: activityTypes } = data;
        if (activityTypes != null) {
          return activityTypes;
        } else {
          throw Error('Unable to retrieve activity types');
        }
      } catch (e) {
        catchError(e as Error);
        return [];
      }
    } else {
      return [];
    }
  },

  async getConstraint(id: number, user: User | null): Promise<ConstraintMetadata | null> {
    try {
      const data = await reqHasura<ConstraintMetadata>(convertToQuery(gql.SUB_CONSTRAINT), { id }, user);
      const { constraint } = data;
      return constraint;
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getDefaultActivityArguments(
    modelId: number,
    activityTypes: string[],
    user: User | null,
  ): Promise<DefaultEffectiveArguments[]> {
    try {
      const activities = activityTypes.map(type => ({ activityArguments: {}, activityTypeName: type }));
      const data = await reqHasura<DefaultEffectiveArguments[]>(
        gql.GET_EFFECTIVE_ACTIVITY_ARGUMENTS_BULK,
        {
          activities,
          modelId,
        },
        user,
      );
      const { effectiveActivityArgumentsBulk } = data;
      if (effectiveActivityArgumentsBulk !== null) {
        return effectiveActivityArgumentsBulk;
      }
      return [];
    } catch (e) {
      catchError(e as Error);
      return [];
    }
  },

  async getEffectiveModelArguments(
    modelId: number,
    argumentsMap: ArgumentsMap,
    user: User | null,
  ): Promise<EffectiveArguments | null> {
    try {
      const data = await reqHasura<EffectiveArguments>(
        gql.GET_EFFECTIVE_MODEL_ARGUMENTS,
        {
          arguments: argumentsMap,
          modelId,
        },
        user,
      );
      const { effectiveModelArguments } = data;
      return effectiveModelArguments;
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getEvents(
    datasetId: number,
    user: User | null,
    signal: AbortSignal | undefined = undefined,
  ): Promise<SimulationEvent[]> {
    try {
      const data = await reqHasura<any>(gql.GET_EVENTS, { datasetId }, user, signal);
      const { topic: topics, event: events } = data;
      if (topics === null || events === null) {
        throw Error('Unable to get events');
      }
      const topicById: Record<number, Topic> = {};
      for (const topic of topics) {
        topicById[topic.topic_index] = topic;
      }

      events.sort(compareEvents);

      const simulationEvents: SimulationEvent[] = [];
      for (const event of events) {
        simulationEvents.push({
          dense_time: event.transaction_index + '.0' + event.causal_time,
          id: simulationEvents.length,
          span_id: event.span_id,
          start_offset: event.real_time,
          topic: topicById[event.topic_index].name,
          value: typeof event.value === 'string' ? event.value : JSON.stringify(event.value),
        });
      }
      return simulationEvents;
    } catch (e) {
      catchError(e as Error);
      return [];
    }
  },

  async getExpansionRule(id: number, user: User | null): Promise<ExpansionRule | null> {
    try {
      const data = await reqHasura(gql.GET_EXPANSION_RULE, { id }, user);
      const { expansionRule } = data;
      return expansionRule;
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getExpansionRuleTags(user: User | null): Promise<Tag[] | null> {
    try {
      const data = await reqHasura(convertToQuery(gql.SUB_EXPANSION_RULE_TAGS), {}, user);
      const { expansionRuleTags } = data;
      return expansionRuleTags;
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getExpansionRuns(user: User | null): Promise<ExpansionRun[]> {
    try {
      const data = await reqHasura(gql.GET_EXPANSION_RUNS, {}, user);
      const { expansionRuns } = data;
      return expansionRuns;
    } catch (e) {
      catchError(e as Error);
      return [];
    }
  },

  async getExpansionSequenceId(
    simulatedActivityId: number,
    simulationDatasetId: number,
    user: User | null,
  ): Promise<string | null> {
    try {
      const data = await reqHasura<SeqId>(
        gql.GET_EXPANSION_SEQUENCE_ID,
        {
          simulated_activity_id: simulatedActivityId,
          simulation_dataset_id: simulationDatasetId,
        },
        user,
      );
      const { expansionSequence } = data;

      if (expansionSequence) {
        const { seq_id: seqId } = expansionSequence;
        return seqId;
      } else {
        return null;
      }
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getExpansionSequenceSeqJson(
    seqId: string,
    simulationDatasetId: number,
    user: User | null,
  ): Promise<string | null> {
    try {
      const data = await reqHasura<ExpandedSequence[]>(
        gql.GET_EXPANSION_SEQUENCE_SEQ_JSON,
        {
          seqId,
          simulationDatasetId,
        },
        user,
      );

      const { expanded_sequences } = data;
      if (expanded_sequences != null && expanded_sequences.length === 1) {
        const { expanded_sequence } = expanded_sequences[0];
        return JSON.stringify(expanded_sequence, null, 2);
      } else {
        throw Error(`Unable to get expansion sequence seq json for seq ID "${seqId}"`);
      }
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getExternalEventTypes(plan_id: number, user: User | null): Promise<ExternalEventType[]> {
    try {
      const sourceData = await reqHasura<
        {
          derivation_group: {
            external_sources: {
              external_events: {
                external_event_type: {
                  attribute_schema: object;
                  name: string;
                };
              }[];
            }[];
          };
        }[]
      >(gql.GET_PLAN_EVENT_TYPES, { plan_id }, user);
      const types: ExternalEventType[] = [];
      if (sourceData?.plan_derivation_group !== null) {
        for (const group of sourceData.plan_derivation_group) {
          for (const source of group.derivation_group.external_sources) {
            for (const event of source.external_events) {
              if (types.flatMap(et => et.name).includes(event.external_event_type.name) === false) {
                types.push(event.external_event_type);
              }
            }
          }
        }
      } else {
        throw Error('Unable to gather all external event types for the source');
      }

      return types;
    } catch (e) {
      catchError(e as Error);
      return [];
    }
  },

  // Should be deprecated with the introduction of strict external source schemas, dictating allowable event types for given source types. But for now, this will do.
  async getExternalEventTypesBySource(
    externalSourceKey: string | null,
    externalSourceDerivationGroup: string | null,
    user: User | null,
  ): Promise<ExternalEventType[]> {
    if (externalSourceKey === null || externalSourceDerivationGroup === null) {
      return [];
    }
    try {
      const data = await reqHasura<
        {
          external_events: {
            external_event_type: {
              attribute_schema: Record<string, any>;
              name: string;
            };
          }[];
        }[]
      >(
        gql.GET_EXTERNAL_EVENT_TYPE_BY_SOURCE,
        { derivationGroupName: externalSourceDerivationGroup, sourceKey: externalSourceKey },
        user,
      );
      const { external_source } = data;
      if (external_source != null) {
        const eventTypes: ExternalEventType[] = [];
        for (const external_event of external_source[0].external_events) {
          if (!eventTypes.map(currentType => currentType.name).includes(external_event.external_event_type.name)) {
            eventTypes.push(external_event.external_event_type);
          }
        }
        return eventTypes;
      } else {
        throw Error('Unable to retrieve external event types for source');
      }
    } catch (e) {
      catchError(e as Error);
      showFailureToast('External Event Type Retrieval Failed');
      return [];
    }
  },

  async getExternalEvents(
    externalSourceKey: string | null,
    externalSourceDerivationGroup: string | null,
    user: User | null,
  ): Promise<ExternalEvent[]> {
    if (externalSourceKey === null || externalSourceDerivationGroup === null) {
      return [];
    }
    try {
      const data = await reqHasura<ExternalEventDB[]>(
        gql.GET_EXTERNAL_EVENTS,
        { derivationGroupName: externalSourceDerivationGroup, sourceKey: externalSourceKey },
        user,
      );
      const { external_event: events } = data;
      if (events === null) {
        throw Error(
          `Unable to get external events for external source '${externalSourceKey}' (derivation group: '${externalSourceDerivationGroup}').`,
        );
      }

      const externalEvents: ExternalEvent[] = [];
      for (const event of events) {
        externalEvents.push({
          attributes: event.attributes,
          duration: event.duration,
          duration_ms: getIntervalInMs(event.duration),
          pkey: {
            derivation_group_name: event.derivation_group_name,
            event_type_name: event.event_type_name,
            key: event.key,
            source_key: event.source_key,
          },
          start_ms: convertUTCToMs(event.start_time),
          start_time: event.start_time,
        });
      }
      return externalEvents;
    } catch (e) {
      catchError('Failed to retrieve external events.', e as Error);
      showFailureToast('External Events Retrieval Failed');
      return [];
    }
  },

  async getFile(
    fileId: number,
    user: User | null,
    signal: AbortSignal | undefined = undefined,
  ): Promise<{ aborted: boolean; file: string | null }> {
    try {
      const file = await reqGateway(`/file/${fileId}`, 'GET', null, user, true, signal, false);
      return { aborted: false, file };
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        return { aborted: true, file: null };
      } else {
        catchError(e as Error);
        showFailureToast(`Failed to get file with id: ${fileId}`);
        return { aborted: false, file: null };
      }
    }
  },

  async getFileName(fileId: number, user: User | null): Promise<string | null> {
    try {
      if (!queryPermissions.GET_UPLOADED_FILENAME(user)) {
        throwPermissionError('get the requested filename');
      }
      const data = (await reqHasura<[{ name: string }]>(gql.GET_UPLOADED_FILENAME, { id: fileId }, user)).uploaded_file;

      if (data) {
        const { name } = data[0];
        return name.replace(/(?:-[a-zA-Z0-9]+){2}(\.[a-z]+)?$/, '$1');
      }
      return null;
    } catch (e) {
      catchError(e as Error);
      showFailureToast(`Failed to get filename for file id: ${fileId}`);
      return null;
    }
  },

  async getModel(modelId: number, user: User | null): Promise<Model | null> {
    try {
      const query = convertToQuery(gql.SUB_MODEL);
      const data = await reqHasura<Model>(query, { id: modelId }, user);
      const { model } = data;
      if (model != null) {
        return model;
      } else {
        throw Error('Unable to retrieve model');
      }
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getModels(user: User | null): Promise<ModelSlim[]> {
    try {
      const query = convertToQuery(gql.SUB_MODELS);
      const data = await reqHasura<ModelSlim[]>(query, {}, user);
      const { models = [] } = data;
      if (models != null) {
        return models;
      } else {
        throw Error('Unable to retrieve models');
      }
    } catch (e) {
      catchError(e as Error);
      return [];
    }
  },

  async getParcel(id: number, user: User | null): Promise<Parcel | null> {
    try {
      const data = await reqHasura<Parcel>(gql.GET_PARCEL, { id }, user);
      const { parcel } = data;
      return parcel;
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getParsedAmpcsChannelDictionary(
    channelDictionaryId: number | null | undefined,
    user: User | null,
  ): Promise<AmpcsChannelDictionary | null> {
    if (typeof channelDictionaryId !== 'number') {
      return null;
    }

    try {
      const data = await reqHasura<[{ parsed_json: AmpcsChannelDictionary }]>(
        gql.GET_PARSED_CHANNEL_DICTIONARY,
        { channelDictionaryId },
        user,
      );
      const { channel_dictionary: channelDictionary } = data;

      if (!Array.isArray(channelDictionary) || !channelDictionary.length) {
        catchError(`Unable to find channel dictionary with id ${channelDictionaryId}`);
        return null;
      } else {
        const [{ parsed_json: parsedJson }] = channelDictionary;
        return parsedJson;
      }
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getParsedAmpcsCommandDictionary(
    commandDictionaryId: number | null | undefined,
    user: User | null,
  ): Promise<AmpcsCommandDictionary | null> {
    if (typeof commandDictionaryId !== 'number') {
      return null;
    }

    try {
      const data = await reqHasura<[{ parsed_json: AmpcsCommandDictionary }]>(
        gql.GET_PARSED_COMMAND_DICTIONARY,
        { commandDictionaryId },
        user,
      );
      const { command_dictionary: commandDictionary } = data;

      if (!Array.isArray(commandDictionary) || !commandDictionary.length) {
        catchError(`Unable to find command dictionary with id ${commandDictionaryId}`);
        return null;
      } else {
        const [{ parsed_json: parsedJson }] = commandDictionary;
        return parsedJson;
      }
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getParsedAmpcsParameterDictionary(
    parameterDictionaryId: number | null | undefined,
    user: User | null,
  ): Promise<AmpcsParameterDictionary | null> {
    if (typeof parameterDictionaryId !== 'number') {
      return null;
    }

    try {
      const data = await reqHasura<[{ parsed_json: AmpcsParameterDictionary }]>(
        gql.GET_PARSED_PARAMETER_DICTIONARY,
        { parameterDictionaryId },
        user,
      );
      const { parameter_dictionary: parameterDictionary } = data;

      if (!Array.isArray(parameterDictionary) || !parameterDictionary.length) {
        catchError(`Unable to find parameter dictionary with id ${parameterDictionaryId}`);
        return null;
      } else {
        const [{ parsed_json: parsedJson }] = parameterDictionary;
        return parsedJson;
      }
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getPlan(id: number, user: User | null): Promise<Plan | null> {
    try {
      const data = await reqHasura<PlanSchema>(gql.GET_PLAN, { id }, user);
      const { plan: planSchema } = data;

      if (planSchema) {
        const { start_time, duration } = planSchema;
        const plan: Plan = {
          ...planSchema,
          end_time_doy: getDoyTimeFromInterval(start_time, duration),
          start_time_doy: getDoyTime(new Date(start_time)),
        };
        return plan;
      } else {
        return null;
      }
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getPlanLatestSimulation(planId: number, user: User | null): Promise<Simulation | null> {
    const query = convertToQuery(gql.SUB_SIMULATION);
    const data = await reqHasura<Simulation[]>(query, { planId }, user);

    const { simulation } = data;

    if (simulation) {
      return simulation[0];
    }

    return null;
  },

  async getPlanMergeConflictingActivities(
    mergeRequestId: number,
    user: User | null,
  ): Promise<PlanMergeConflictingActivity[]> {
    try {
      const query = convertToQuery(gql.SUB_PLAN_MERGE_CONFLICTING_ACTIVITIES);
      const data = await reqHasura<PlanMergeConflictingActivity[]>(query, { merge_request_id: mergeRequestId }, user);
      const { conflictingActivities } = data;
      if (conflictingActivities != null) {
        return conflictingActivities;
      } else {
        throw Error('Unable to retrieve conflicting activities');
      }
    } catch (e) {
      catchError(e as Error);
      return [];
    }
  },

  async getPlanMergeNonConflictingActivities(
    mergeRequestId: number,
    user: User | null,
  ): Promise<PlanMergeNonConflictingActivity[]> {
    try {
      const data = await reqHasura<PlanMergeNonConflictingActivity[]>(
        gql.GET_PLAN_MERGE_NON_CONFLICTING_ACTIVITIES,
        {
          merge_request_id: mergeRequestId,
        },
        user,
      );
      const { nonConflictingActivities } = data;
      if (nonConflictingActivities != null) {
        return nonConflictingActivities;
      } else {
        throw Error('Unable to retrieve non-conflicting activities');
      }
    } catch (e) {
      catchError(e as Error);
      return [];
    }
  },

  async getPlanMergeRequestInProgress(planId: number, user: User | null): Promise<PlanMergeRequestSchema | null> {
    try {
      const query = convertToQuery(gql.SUB_PLAN_MERGE_REQUEST_IN_PROGRESS);
      const data = await reqHasura<PlanMergeRequestSchema[]>(query, { planId }, user);
      const { merge_requests: mergeRequests } = data;
      if (mergeRequests != null) {
        const [mergeRequest] = mergeRequests; // Query uses 'limit: 1' so merge_requests.length === 1.
        return mergeRequest;
      } else {
        throw Error('Unable to get merge requests in progress');
      }
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getPlanRevision(planId: number, user: User | null): Promise<number | null> {
    try {
      const query = convertToQuery(gql.SUB_PLAN_REVISION);
      const data = await reqHasura<Pick<Plan, 'revision'>>(query, { planId }, user);
      const { plan } = data;
      if (plan != null) {
        const { revision } = plan;
        return revision;
      } else {
        throw Error('Unable to retrieve plan revision');
      }
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getPlanSnapshotActivityDirectives(
    snapshot: PlanSnapshot,
    user: User | null,
  ): Promise<ActivityDirectiveDB[] | null> {
    try {
      const data = await reqHasura<PlanSnapshotActivity[]>(
        gql.GET_PLAN_SNAPSHOT_ACTIVITY_DIRECTIVES,
        { planSnapshotId: snapshot.snapshot_id },
        user,
      );
      const { plan_snapshot_activity_directives: planSnapshotActivityDirectives } = data;

      if (planSnapshotActivityDirectives) {
        return planSnapshotActivityDirectives.map(({ snapshot_id: _snapshotId, ...planSnapshotActivityDirective }) => {
          return {
            plan_id: snapshot.plan_id,
            ...planSnapshotActivityDirective,
          };
        });
      } else {
        return null;
      }
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getPlanTags(planId: number, user: User | null): Promise<Tag[]> {
    try {
      const data = await reqHasura<Pick<Plan, 'tags'>>(convertToQuery(gql.SUB_PLAN_TAGS), { planId }, user);
      const { plan } = data;
      if (!plan || !plan.tags || !Array.isArray(plan.tags)) {
        return [];
      }
      return plan.tags.map(({ tag }) => tag);
    } catch (e) {
      catchError(e as Error);
      return [];
    }
  },

  async getPlansAndModels(user: User | null): Promise<{ models: ModelSlim[]; plans: PlanSlim[] }> {
    try {
      const data = (await reqHasura(gql.GET_PLANS_AND_MODELS, {}, user)) as {
        models: ModelSlim[];
        plans: PlanSlim[];
      };
      const { models, plans } = data;

      return {
        models,
        plans: plans.map(plan => {
          return {
            ...plan,
            end_time_doy: getDoyTimeFromInterval(plan.start_time, plan.duration),
            start_time_doy: getDoyTime(new Date(plan.start_time)),
          };
        }),
      };
    } catch (e) {
      catchError(e as Error);
      return { models: [], plans: [] };
    }
  },

  getResource(
    datasetId: number,
    name: string,
    user: User | null,
    signal: AbortSignal | undefined = undefined,
  ): Promise<Record<string, Profile[] | null>> {
    return reqHasura<Profile[]>(gql.GET_PROFILE, { datasetId, name }, user, signal);
  },

  async getResourceTypes(modelId: number, user: User | null, limit: number | null = null): Promise<ResourceType[]> {
    try {
      const data = await reqHasura<ResourceType[]>(gql.GET_RESOURCE_TYPES, { limit, model_id: modelId }, user);
      const { resource_types: resourceTypes } = data;
      if (resourceTypes != null) {
        return resourceTypes;
      } else {
        throw Error('Unable to retrieve resource types');
      }
    } catch (e) {
      catchError(e as Error);
      return [];
    }
  },

  async getResourcesExternal(
    planId: number,
    simulationDatasetId: number | null,
    startTimeYmd: string,
    user: User | null,
    signal: AbortSignal | undefined = undefined,
  ): Promise<{ aborted: boolean; resources: Resource[] }> {
    try {
      // Always fetch external resources that aren't tied to a simulation, optionally get the resources tied to one if we have a dataset ID.
      const clauses: { simulation_dataset_id: { _is_null: boolean } | { _eq: number } }[] = [
        { simulation_dataset_id: { _is_null: true } },
      ];
      if (simulationDatasetId !== null) {
        clauses.push({ simulation_dataset_id: { _eq: simulationDatasetId } });
      }

      const data = await reqHasura<PlanDataset[]>(
        gql.GET_PROFILES_EXTERNAL,
        {
          planId,
          simulationDatasetFilter: clauses,
        },
        user,
        signal,
      );
      const { plan_dataset: planDatasets } = data;
      if (planDatasets != null) {
        let resources: Resource[] = [];

        const profileMap: Set<string> = new Set();
        planDatasets.sort(({ dataset_id: datasetIdA }, { dataset_id: datasetIdB }) => {
          return compare(datasetIdA, datasetIdB, false);
        });

        for (const dataset of planDatasets) {
          const {
            dataset: { profiles },
            offset_from_plan_start,
          } = dataset;
          const uniqueProfiles: Profile[] = profiles.filter(profile => {
            if (!profileMap.has(profile.name)) {
              profileMap.add(profile.name);
              return true;
            }
            return false;
          });

          const sampledResources: Resource[] = sampleProfiles(uniqueProfiles, startTimeYmd, offset_from_plan_start);
          resources = [...resources, ...sampledResources];
        }
        return { aborted: false, resources };
      } else {
        throw Error('Unable to get external resources');
      }
    } catch (e) {
      let aborted = false;
      const error = e as Error;
      if (error.name !== 'AbortError') {
        catchError(error);
        showFailureToast('Failed to fetch external profiles');
        aborted = true;
      }
      return { aborted, resources: [] };
    }
  },

  async getRolePermissions(user: User | null): Promise<RolePermissionsMap | null> {
    try {
      const roleData = await reqHasura<RolePermissionResponse[] | null>(gql.GET_ROLE_PERMISSIONS, {}, user, undefined);
      if (roleData != null) {
        const { rolePermissions } = roleData;

        if (rolePermissions != null) {
          const permissions = rolePermissions.find(({ role }) => role === user?.activeRole);

          if (permissions !== undefined) {
            const actionPermissions = permissions.action_permissions ?? [];
            const functionPermissions = permissions.function_permissions ?? [];

            return {
              ...actionPermissions,
              ...functionPermissions,
            };
          }
        } else {
          throw Error('Unable to retrieve role permissions');
        }
      }

      return {};
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getSchedulingCondition(id: number, user: User | null): Promise<SchedulingConditionMetadata | null> {
    try {
      const data = await reqHasura<SchedulingConditionMetadataResponse>(
        convertToQuery(gql.SUB_SCHEDULING_CONDITION),
        { id },
        user,
      );
      const tags = await effects.getTags(user);
      const { condition } = data;

      if (condition) {
        return convertResponseToMetadata(condition, tags);
      }
      return condition;
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getSchedulingGoal(id: number, user: User | null): Promise<SchedulingGoalMetadata | null> {
    try {
      const data = await reqHasura<SchedulingGoalMetadataResponse>(
        convertToQuery(gql.SUB_SCHEDULING_GOAL),
        { id },
        user,
      );
      const tags = await effects.getTags(user);
      const { goal } = data;

      if (goal) {
        return convertResponseToMetadata(goal, tags);
      }
      return goal;
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getSchedulingSpecConditionsForCondition(
    conditionId: number | null,
    user: User | null,
  ): Promise<SchedulingConditionPlanSpecification[] | null> {
    if (conditionId !== null) {
      try {
        const data = await reqHasura<SchedulingConditionPlanSpecification[]>(
          gql.GET_SCHEDULING_SPEC_CONDITIONS_FOR_CONDITION,
          {
            condition_id: conditionId,
          },
          user,
        );
        const { scheduling_specification_conditions: schedulingSpecificationConditions } = data;
        return schedulingSpecificationConditions;
      } catch (e) {
        catchError(e as Error);
        return null;
      }
    } else {
      return null;
    }
  },

  async getSchedulingSpecGoalsForGoal(
    goalId: number | null,
    user: User | null,
  ): Promise<SchedulingGoalPlanSpecification[] | null> {
    if (goalId !== null) {
      try {
        const data = await reqHasura<SchedulingGoalPlanSpecification[]>(
          gql.GET_SCHEDULING_SPEC_GOALS_FOR_GOAL,
          { goal_id: goalId },
          user,
        );
        const { scheduling_specification_goals: schedulingSpecificationGoals } = data;
        return schedulingSpecificationGoals;
      } catch (e) {
        catchError(e as Error);
        return null;
      }
    } else {
      return null;
    }
  },

  async getSequenceAdaptation(
    sequenceAdaptationId: number,
    user: User | null,
  ): Promise<SequenceAdaptationMetadata | null> {
    try {
      const data = await reqHasura<[sequence_adaptation: SequenceAdaptationMetadata]>(
        gql.GET_SEQUENCE_ADAPTATION,
        { sequence_adaptation_id: sequenceAdaptationId },
        user,
      );
      const { sequence_adaptation: sequenceAdaptation } = data;

      if (sequenceAdaptation && sequenceAdaptation.length > 0) {
        return sequenceAdaptation[0];
      }
    } catch (e) {
      catchError(e as Error);
    }

    return null;
  },

  async getSpans(
    datasetId: number,
    planStartTimeYmd: string,
    user: User | null,
    signal: AbortSignal | undefined = undefined,
  ): Promise<Span[]> {
    try {
      const data = await reqHasura<SpanDB[]>(gql.GET_SPANS, { datasetId }, user, signal);
      const { span: spans } = data;
      if (spans != null) {
        return spans.map(span => {
          const durationMs = getIntervalInMs(span.duration);
          const startMs = getUnixEpochTimeFromInterval(planStartTimeYmd, span.start_offset);
          return {
            ...span,
            durationMs,
            endMs: startMs + durationMs,
            startMs,
          };
        });
      } else {
        throw Error('Unable to get spans');
      }
    } catch (e) {
      catchError(e as Error);
      return [];
    }
  },

  async getTags(user: User | null): Promise<Tag[]> {
    try {
      const query = convertToQuery(gql.SUB_TAGS);
      const data = await reqHasura<Tag[]>(query, {}, user);
      const { tags } = data;
      if (tags != null) {
        return tags;
      } else {
        throw Error('Unable to get tags');
      }
    } catch (e) {
      catchError(e as Error);
      return [];
    }
  },

  async getTsFilesActivityType(
    activityTypeName: string | null | undefined,
    modelId: number | null | undefined,
    user: User | null,
  ): Promise<TypeScriptFile[]> {
    if (activityTypeName !== null && activityTypeName !== undefined && modelId !== null && modelId !== undefined) {
      try {
        const data = await reqHasura<DslTypeScriptResponse>(
          gql.GET_TYPESCRIPT_ACTIVITY_TYPE,
          {
            activityTypeName,
            modelId,
          },
          user,
        );
        const { dslTypeScriptResponse } = data;
        if (dslTypeScriptResponse != null) {
          const { reason, status, typescriptFiles } = dslTypeScriptResponse;

          if (status === 'success') {
            return typescriptFiles;
          } else {
            catchError(reason);
            return [];
          }
        } else {
          throw Error(`Unable to get TypeScript activity type "${activityTypeName}"`);
        }
      } catch (e) {
        catchError(e as Error);
        return [];
      }
    } else {
      return [];
    }
  },

  async getTsFilesCommandDictionary(
    commandDictionaryId: number | null | undefined,
    user: User | null,
  ): Promise<TypeScriptFile[]> {
    if (commandDictionaryId !== null && commandDictionaryId !== undefined) {
      try {
        const data = await reqHasura<DslTypeScriptResponse>(
          gql.GET_TYPESCRIPT_COMMAND_DICTIONARY,
          { commandDictionaryId },
          user,
        );
        const { dslTypeScriptResponse } = data;
        if (dslTypeScriptResponse != null) {
          const { reason, status, typescriptFiles } = dslTypeScriptResponse;

          if (status === 'success') {
            return typescriptFiles;
          } else {
            catchError(reason);
            return [];
          }
        } else {
          throw Error(`Unable to get TypeScript command dictionary with ID: "${commandDictionaryId}"`);
        }
      } catch (e) {
        catchError(e as Error);
        return [];
      }
    } else {
      return [];
    }
  },

  async getTsFilesConstraints(modelId: number, user: User | null): Promise<TypeScriptFile[]> {
    if (modelId !== null && modelId !== undefined) {
      try {
        const data = await reqHasura<DslTypeScriptResponse>(
          gql.GET_TYPESCRIPT_CONSTRAINTS,
          { model_id: modelId },
          user,
        );
        const { dslTypeScriptResponse } = data;
        if (dslTypeScriptResponse != null) {
          const { reason, status, typescriptFiles } = dslTypeScriptResponse;

          if (status === 'success') {
            return typescriptFiles;
          } else {
            catchError(reason);
            return [];
          }
        } else {
          throw Error('Unable to retrieve TypeScript constraint files');
        }
      } catch (e) {
        catchError(e as Error);
        return [];
      }
    } else {
      return [];
    }
  },

  async getTsFilesScheduling(modelId: number | null | undefined, user: User | null): Promise<TypeScriptFile[]> {
    if (modelId !== null && modelId !== undefined) {
      try {
        const data = await reqHasura<DslTypeScriptResponse>(gql.GET_TYPESCRIPT_SCHEDULING, { model_id: modelId }, user);
        const { dslTypeScriptResponse } = data;
        if (dslTypeScriptResponse != null) {
          const { reason, status, typescriptFiles } = dslTypeScriptResponse;

          if (status === 'success') {
            return typescriptFiles;
          } else {
            catchError(reason);
            return [];
          }
        } else {
          throw Error('Unable to retrieve TypeScript scheduling files');
        }
      } catch (e) {
        catchError(e as Error);
        return [];
      }
    } else {
      return [];
    }
  },

  async getUserQueries(user: User | null): Promise<PermissibleQueriesMap | null> {
    try {
      const data = await reqHasura<PermissibleQueryResponse | null>(gql.GET_PERMISSIBLE_QUERIES, {}, user, undefined);
      if (data != null) {
        const { queries } = data;

        if (queries != null) {
          const mutationQueries = queries.mutationType?.fields ?? [];
          const viewQueries = queries.queryType?.fields ?? [];

          return [...viewQueries, ...mutationQueries].reduce((queriesMap, permissibleQuery) => {
            return {
              ...queriesMap,
              [permissibleQuery.name]: true,
            };
          }, {});
        } else {
          throw Error('Unable to retrieve user permissions');
        }
      }

      return {};
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getUserSequence(id: number, user: User | null): Promise<UserSequence | null> {
    try {
      const data = await reqHasura<UserSequence>(gql.GET_USER_SEQUENCE, { id }, user);
      const { userSequence } = data;
      return userSequence;
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getUserSequenceFromSeqJson(seqJson: SeqJson, user: User | null): Promise<string> {
    try {
      const data = await reqHasura<string>(gql.GET_USER_SEQUENCE_FROM_SEQ_JSON, { seqJson }, user);
      const { sequence } = data;
      if (sequence != null) {
        return sequence;
      } else {
        throw Error('Unable to retrieve user sequence');
      }
    } catch (e) {
      return (e as Error).message;
    }
  },

  async getUserSequenceSeqJson(
    commandDictionaryId: number | null,
    sequenceDefinition: string | null,
    user: User | null,
    signal: AbortSignal | undefined = undefined,
  ): Promise<string> {
    try {
      const data = await reqHasura<GetSeqJsonResponse>(
        gql.GET_USER_SEQUENCE_SEQ_JSON,
        { commandDictionaryId, sequenceDefinition },
        user,
        signal,
      );
      const { getUserSequenceSeqJson } = data;
      if (getUserSequenceSeqJson != null) {
        const { errors, seqJson, status } = getUserSequenceSeqJson;

        if (status === 'FAILURE') {
          const [firstError] = errors;
          const { message } = firstError;
          return message;
        } else {
          return JSON.stringify(seqJson, null, 2);
        }
      } else {
        throw Error('Unable to retrieve user sequence JSON');
      }
    } catch (e) {
      return (e as Error).message;
    }
  },

  async getVersion(): Promise<Version> {
    try {
      const versionResponse = await fetch(`${base}/version.json`);
      return await versionResponse.json();
    } catch (e) {
      return {
        branch: 'unknown',
        commit: 'unknown',
        commitUrl: '',
        date: new Date().toLocaleString(),
        name: 'aerie-ui',
      };
    }
  },

  /**
   * Try and get the view from the query parameters, otherwise check if there's a default view set at the
   * mission model level, otherwise just return a generated default view. Performs view migration if requested.
   */
  async getView(
    query: URLSearchParams | null,
    user: User | null,
    migrate: boolean = true,
    resourceTypes: ResourceType[] = [],
    externalEventTypes: ExternalEventType[] = [],
    defaultView?: View | null,
  ): Promise<View | null> {
    try {
      if (query !== null) {
        const viewIdAsNumber = getSearchParameterNumber(SearchParameters.VIEW_ID, query);

        // Derive view from url or model default
        let view;
        if (viewIdAsNumber !== null) {
          const data = await reqHasura<View>(gql.GET_VIEW, { id: viewIdAsNumber }, user);
          const { view: fetchedView } = data;
          view = fetchedView;
        } else if (defaultView !== null && defaultView !== undefined) {
          view = defaultView;
        }

        if (view) {
          // Return view if not asked to migrate the view
          if (!migrate) {
            return view;
          }

          // Otherwise perform any needed migrations
          const { migratedView, error, anyMigrationsApplied } = await applyViewMigrations(view);
          if (migratedView && anyMigrationsApplied) {
            await effects.updateView(
              migratedView.id,
              { definition: migratedView.definition },
              'View Automatically Migrated',
              user,
            );
          }

          // If migration failed catch the error and return default view
          if (!migratedView) {
            catchError('Unable to automatically migrate view', error as Error);
            showFailureToast(`Unable to automatically migrate view: ${view.name}`);
          } else {
            return migratedView;
          }
        }
      }
      return generateDefaultView(resourceTypes, externalEventTypes);
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getWorkspace(workspaceId: number, user: User | null): Promise<Workspace | null> {
    try {
      const query = convertToQuery(gql.SUB_WORKSPACE);
      const data = await reqHasura<Workspace>(query, { workspaceId }, user);
      const { workspace } = data;

      if (workspace) {
        return workspace;
      } else {
        return null;
      }
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getWorkspaceContents(workspaceId: number, user: User | null): Promise<WorkspaceTreeNode[] | null> {
    try {
      const workspaceContents = await reqWorkspace<WorkspaceTreeNode[]>(`${workspaceId}`, 'GET', null, user);

      if (workspaceContents != null) {
        return workspaceContents;
      } else {
        throw Error(`Unable to retrieve workspace contents`);
      }
    } catch (e) {
      catchError('Workspace Retrieval Failed', e as Error);
      showFailureToast('Workspace Retrieval Failed');
    }

    return null;
  },

  async getWorkspaceFileContent(workspaceId: number, filePath: string, user: User | null): Promise<string | null> {
    try {
      const fileContents = await reqWorkspace<string>(
        joinPath([workspaceId, filePath]),
        'GET',
        null,
        user,
        undefined,
        false,
      );

      if (fileContents != null) {
        return fileContents;
      } else {
        throw Error(`Unable to retrieve workspace file`);
      }
    } catch (e) {
      catchError('Workspace File Retrieval Failed', e as Error);
      showFailureToast('Workspace File Retrieval Failed');
    }

    return null;
  },

  async getWorkspaceSequences(
    workspaceId: number,
    workspaceTreeMap: WorkspaceTreeMap | null,
    getFileContents: boolean = true,
    user: User | null,
  ): Promise<UserSequence[]> {
    let workspaceSequenceFileContents: UserSequence[] = [];
    let treeMap: WorkspaceTreeMap = workspaceTreeMap ?? {};
    if (!workspaceTreeMap) {
      const workspaceContents = await effects.getWorkspaceContents(workspaceId, user);

      if (workspaceContents) {
        treeMap = mapWorkspaceTreePaths(workspaceContents);
      }
    }
    const workspaceSequenceNodes: WorkspaceTreeNodeWithFullPath[] = Object.keys(treeMap).reduce(
      (currentSequenceNodes: WorkspaceTreeNodeWithFullPath[], treeNodePath: string) => {
        const treeNode = treeMap[treeNodePath];
        if (treeNode.type === WorkspaceContentType.Sequence) {
          currentSequenceNodes.push({
            ...treeNode,
            fullPath: treeNodePath,
          });
        }
        return currentSequenceNodes;
      },
      [],
    );

    const chunkedWorkspaceNodes: WorkspaceTreeNodeWithFullPath[][] = chunk(workspaceSequenceNodes, 10);

    for (let i = 0; i < chunkedWorkspaceNodes.length; i++) {
      const chunkSequenceFileContents: UserSequence[] = await Promise.all(
        chunkedWorkspaceNodes[i].map(async ({ fullPath }) => {
          let sequenceDefinition = '';
          if (getFileContents) {
            sequenceDefinition = (await effects.getWorkspaceFileContent(workspaceId, fullPath, user)) ?? '';
          }
          return {
            definition: sequenceDefinition,
            name: fullPath,
          } as UserSequence;
        }),
      );

      workspaceSequenceFileContents = workspaceSequenceFileContents.concat(chunkSequenceFileContents);
    }
    return workspaceSequenceFileContents;
  },

  async importLibrarySequences(
    workspaceId: number | null,
  ): Promise<{ fileContents: string; parcel: number } | undefined> {
    if (workspaceId === null) {
      showFailureToast("Library Import: Workspace doesn't exist");
      return undefined;
    }
    const { confirm, value } = await showLibrarySequenceModel();

    if (!confirm || !value) {
      return undefined;
    }

    try {
      const contents = await value.libraryFile.text();
      return { fileContents: contents, parcel: value.parcel };
    } catch (e) {
      showFailureToast('Library Import: Unable to open file');
      return undefined;
    }
  },

  async importPlan(
    name: string,
    modelId: number,
    startTime: string,
    endTime: string,
    simulationTemplateId: number | null,
    tagIds: number[],
    files: FileList,
    user: User | null,
  ): Promise<{ error?: Error; plan?: PlanSlim }> {
    try {
      if (!gatewayPermissions.IMPORT_PLAN(user)) {
        throwPermissionError('import a plan');
      }

      creatingPlanStore.set(true);

      const file: File = files[0];

      const duration = getIntervalFromDoyRange(startTime, endTime);

      const body = new FormData();
      body.append('name', `${name}`);
      body.append('model_id', `${modelId}`);
      body.append('start_time', `${startTime}`);
      body.append('duration', `${duration}`);
      if (simulationTemplateId !== null) {
        body.append('simulation_template_id', `${simulationTemplateId}`);
      }
      body.append('tags', JSON.stringify(tagIds));
      body.append('plan_file', file, file.name);

      const createdPlan = await reqGateway<PlanSlim | null>('/importPlan', 'POST', body, user, true);

      creatingPlanStore.set(false);
      if (createdPlan != null) {
        return { plan: createdPlan };
      } else {
        throw new Error('Plan import failed');
      }
    } catch (e) {
      catchError(e as Error);
      creatingPlanStore.set(false);
      return { error: e as Error };
    }
  },

  async importSequenceTemplate(
    activityType: string,
    language: string,
    modelId: number,
    name: string,
    parcelId: number,
    sequenceTemplateContent: string,
    user: User | null,
  ): Promise<SequenceTemplate | null> {
    try {
      if (!gatewayPermissions.IMPORT_SEQUENCE_TEMPLATE(user)) {
        throwPermissionError('import a sequence template');
      }
      const body = {
        activity_type: activityType,
        language,
        model_id: modelId,
        name,
        parcel_id: parcelId,
        sequence_template_file: sequenceTemplateContent,
      };
      const createdSequenceTemplate = await reqGateway<SequenceTemplate | null>(
        '/importSequenceTemplate',
        'POST',
        JSON.stringify(body),
        user,
        false,
      );

      if (createdSequenceTemplate != null) {
        showSuccessToast('Sequence Template Imported Successfully');
        return createdSequenceTemplate;
      }

      return null;
    } catch (e) {
      catchError(e as Error);
      showFailureToast('Failed To Import Sequence Template');
      return null;
    }
  },

  async importWorkspaceFile(
    workspace: Workspace,
    workspaceContents: WorkspaceTreeNode,
    startingPath: string,
    user: User | null,
  ): Promise<string | null> {
    try {
      if (!featurePermissions.workspace.canUpdate(user, workspace)) {
        throwPermissionError(`upload to this workspace`);
      }
      const { confirm, value } = await showImportWorkspaceFileModal(
        workspace,
        workspaceContents,
        startingPath,
        workspace,
        user,
      );
      if (confirm) {
        const { files, targetDirectory } = value;
        const cleanedTargetPath = cleanPath(targetDirectory);
        const chunkedFiles = chunk(Array.from<File>(files), 10);

        for (let i = 0; i < chunkedFiles.length; i++) {
          const fileChunk: File[] = chunkedFiles[i];
          await Promise.all(
            fileChunk.map(async file => {
              const body = new FormData();
              body.append('file', file, file.name);
              await reqWorkspace<Workspace>(
                `${joinPath([workspace.id, cleanedTargetPath, file.name])}?type=file`,
                'PUT',
                body,
                user,
                undefined,
                false,
              );
            }),
          );
        }

        showSuccessToast(`Workspace File${files.length > 1 ? 's' : ''} Uploaded Successfully`);
        return joinPath([cleanedTargetPath, files[0].name]);
      }
    } catch (e) {
      catchError(`Workspace file was unable to be uploaded`, e as Error);
      showFailureToast(`Workspace File Upload Failed`);
    }

    return null;
  },

  async initialSimulationUpdate(
    planId: number,
    simulationTemplateId: number | null = null,
    simulationStartTime: string | null = null,
    simulationEndTime: string | null = null,
    user: User | null,
  ): Promise<boolean> {
    try {
      if (!queryPermissions.INITIAL_SIMULATION_UPDATE(user)) {
        throwPermissionError('update a simulation');
      }

      const simulationInput: SimulationInitialUpdateInput = {
        arguments: {} as ArgumentsMap,
        simulation_end_time: simulationEndTime,
        simulation_start_time: simulationStartTime,
        simulation_template_id: simulationTemplateId,
      };
      const data = await reqHasura<{ returning: { id: number }[] }>(
        gql.INITIAL_SIMULATION_UPDATE,
        { plan_id: planId, simulation: simulationInput },
        user,
      );
      if (data.update_simulation != null) {
        return true;
      } else {
        throw Error('Unable to update simulation');
      }
    } catch (e) {
      catchError(e as Error);
      return false;
    }
  },

  async insertDerivationGroupForPlan(derivationGroupName: string, plan: Plan | null, user: User | null): Promise<void> {
    try {
      if ((plan && !queryPermissions.CREATE_PLAN_DERIVATION_GROUP(user, plan)) || !plan) {
        throwPermissionError('add a derivation group to the plan');
      }

      derivationGroupPlanLinkErrorStore.set(null);
      if (plan !== null) {
        const data = await reqHasura<PlanDerivationGroup>(
          gql.CREATE_PLAN_DERIVATION_GROUP,
          {
            source: {
              derivation_group_name: derivationGroupName,
              plan_id: plan.id,
            },
          },
          user,
        );
        const { planExternalSourceLink: sourceAssociation } = data;
        // If the return was null, do nothing - only act on success or non-null
        if (sourceAssociation !== null) {
          showSuccessToast('Derivation Group Linked Successfully');
        }
      } else {
        throw Error('Plan is not defined.');
      }
    } catch (e) {
      catchError('Derivation Group Linking Failed', e as Error);
      showFailureToast('Derivation Group Linking Failed');
      derivationGroupPlanLinkErrorStore.set((e as Error).message);
    }
  },

  async insertExpansionSequenceToActivity(
    simulationDatasetId: number,
    simulatedActivityId: number,
    seqId: string,
    user: User | null,
  ): Promise<string | null> {
    try {
      if (!queryPermissions.INSERT_EXPANSION_SEQUENCE_TO_ACTIVITY(user)) {
        throwPermissionError('add an expansion sequence to an activity');
      }

      const input: ExpansionSequenceToActivityInsertInput = {
        seq_id: seqId,
        simulated_activity_id: simulatedActivityId,
        simulation_dataset_id: simulationDatasetId,
      };
      const data = await reqHasura<{ seq_id: string }>(gql.INSERT_EXPANSION_SEQUENCE_TO_ACTIVITY, { input }, user);
      const { sequence } = data;

      if (sequence != null) {
        showSuccessToast('Expansion Sequence Added To Activity Successfully');
        const { seq_id: newSeqId } = sequence;
        return newSeqId;
      } else {
        return null;
      }
    } catch (e) {
      catchError('Add Expansion Sequence To Activity Failed', e as Error);
      showFailureToast('Add Expansion Sequence To Activity Failed');
      return null;
    }
  },

  insertTimelineRow(row: Row, timeline: Timeline, timelines: Timeline[]): Row | null {
    const newRow = createRow(timelines);
    // Add row after the existing row
    const newRows = timeline.rows ?? [];
    const rowIndex = newRows.findIndex(r => r.id === row.id);
    if (rowIndex > -1) {
      newRows.splice(rowIndex + 1, 0, newRow);
      viewUpdateTimeline('rows', [...newRows], timeline.id);
      return newRow;
    }
    return null;
  },

  async loadViewFromFile(files: FileList): Promise<{ definition: ViewDefinition | null; errors?: string[] }> {
    try {
      const file: File = files[0];

      const viewFileString: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          resolve(reader.result as string);
        };

        reader.onerror = reject;

        reader.readAsText(file);
      });

      const viewJSON = JSON.parse(viewFileString);
      const { migratedViewDefinition, error } = await applyViewDefinitionMigrations(viewJSON);
      if (error) {
        return { definition: null, errors: [(error.stack || error).toString()] };
      }
      const { errors, valid } = await effects.validateViewJSON(migratedViewDefinition);

      if (valid) {
        return { definition: migratedViewDefinition };
      } else {
        return {
          definition: null,
          errors,
        };
      }
    } catch (e) {
      catchError(e as Error);
    }

    return {
      definition: null,
      errors: [],
    };
  },

  async login(username: string, password: string): Promise<ReqAuthResponse> {
    try {
      const data = await reqGateway<ReqAuthResponse>(
        '/auth/login',
        'POST',
        JSON.stringify({ password, username }),
        null,
        false,
      );
      return data;
    } catch (e) {
      catchError(e as Error);
      return {
        message: 'An unexpected error occurred',
        success: false,
        token: null,
      };
    }
  },

  async managePlanConstraints(user: User | null): Promise<void> {
    try {
      await showManagePlanConstraintsModal(user);
    } catch (e) {
      catchError('Constraint Unable To Be Applied To Plan', e as Error);
      showFailureToast('Constraint Application Failed');
    }
  },

  async managePlanDerivationGroups(user: User | null): Promise<void> {
    try {
      await showManagePlanDerivationGroups(user);
    } catch (e) {
      catchError('Derivation Group Unable To Be Modified In Plan', e as Error);
      showFailureToast('Derivation Group Modification Failed');
    }
  },

  async managePlanSchedulingConditions(user: User | null): Promise<void> {
    try {
      await showManagePlanSchedulingConditionsModal(user);
    } catch (e) {
      catchError('Scheduling Condition Unable To Be Applied To Plan', e as Error);
      showFailureToast('Scheduling Condition Application Failed');
    }
  },

  async managePlanSchedulingGoals(user: User | null): Promise<void> {
    try {
      await showManagePlanSchedulingGoalsModal(user);
    } catch (e) {
      catchError('Scheduling Goal Unable To Be Applied To Plan', e as Error);
      showFailureToast('Scheduling Goal Application Failed');
    }
  },

  async moveWorkspaceItem(
    workspace: Workspace,
    workspaceContents: WorkspaceTreeNode,
    originalNode: WorkspaceTreeNode,
    originalPath: string,
    user: User | null,
  ): Promise<string | null> {
    const typeString: string = originalNode.type === WorkspaceContentType.Directory ? 'Directory' : 'File';
    try {
      if (!featurePermissions.workspace.canUpdate(user, workspace, originalNode)) {
        throwPermissionError(`update this workspace ${typeString.toLowerCase()}`);
      }

      const { confirm, value } = await showMoveWorkspaceItemModal(
        workspace,
        workspaceContents,
        originalNode,
        originalPath,
        workspace,
        user,
      );
      if (confirm) {
        const { shouldCopy, targetPath } = value;
        const cleanedTargetPath = cleanPath(targetPath);
        try {
          await reqWorkspace<Workspace>(
            joinPath([workspace.id, originalPath]),
            'POST',
            JSON.stringify({
              [shouldCopy ? 'copyTo' : 'moveTo']: `./${cleanedTargetPath}`,
            }),
            user,
            undefined,
            false,
          );
          showSuccessToast(`Workspace ${typeString} ${shouldCopy ? 'Copied' : 'Moved'} Successfully`);

          return cleanedTargetPath;
        } catch (e) {
          throw Error(
            `Workspace ${typeString.toLowerCase()} was unable to be ${shouldCopy ? 'copied' : 'moved'}`,
            e as Error,
          );
        }
      }
    } catch (e) {
      catchError(e as Error);
      showFailureToast((e as Error).message);
    }

    return null;
  },

  async moveWorkspaceItemToWorkspace(
    workspace: Workspace,
    originalNode: WorkspaceTreeNode,
    originalPath: string,
    user: User | null,
  ): Promise<string | null> {
    const typeString: string = originalNode.type === WorkspaceContentType.Directory ? 'Directory' : 'File';
    const { confirm, value } = await showMoveItemToWorkspaceModal(workspace, originalNode, originalPath, user);

    if (confirm) {
      const { shouldCopy, targetPath, targetWorkspace } = value;
      try {
        if (!featurePermissions.workspace.canUpdate(user, targetWorkspace)) {
          throwPermissionError(`update this workspace ${typeString.toLowerCase()}`);
        }
        const cleanedTargetPath = cleanPath(targetPath);

        await reqWorkspace<Workspace>(
          joinPath([workspace.id, originalPath]),
          'POST',
          JSON.stringify({
            [shouldCopy ? 'copyTo' : 'moveTo']: `./${cleanedTargetPath}`,
            toWorkspace: targetWorkspace.id,
          }),
          user,
          undefined,
          false,
        );
        showSuccessToast(`Workspace ${typeString} ${shouldCopy ? 'Duplicated' : 'Moved'} Successfully`);

        return cleanedTargetPath;
      } catch (e) {
        catchError(
          `Workspace ${typeString.toLowerCase()} was unable to be ${shouldCopy ? 'duplicated' : 'moved'}`,
          e as Error,
        );
        showFailureToast(`Workspace ${typeString} ${shouldCopy ? 'Duplication' : 'Move'} Failed`);
      }
    }

    return null;
  },

  async newWorkspaceFolder(
    workspace: Workspace,
    workspaceContents: WorkspaceTreeNode,
    startingPath: string,
    user: User | null,
  ): Promise<string | null> {
    const { confirm, value } = await showNewWorkspaceFolderModal(workspace, workspaceContents, startingPath, user);
    if (confirm) {
      const { folderPath } = value;
      try {
        await reqWorkspace<Workspace>(
          `${workspace.id}/${folderPath}?type=directory`,
          'PUT',
          null,
          user,
          undefined,
          false,
        );

        showSuccessToast('Workspace Folder Created Successfully');
        return folderPath;
      } catch (e) {
        catchError('Workspace folder was unable to be created', e as Error);
        showFailureToast('Workspace Folder Creation Failed');
      }
    }

    return null;
  },

  async newWorkspaceSequence(
    workspace: Workspace,
    workspaceContents: WorkspaceTreeNode,
    startingPath: string,
    sequenceDefinition: string,
    user: User | null,
  ): Promise<string | null> {
    const { confirm, value } = await showNewWorkspaceSequenceModal(workspace, workspaceContents, startingPath, user);
    if (confirm) {
      const { filePath } = value;
      try {
        const body = createWorkspaceSequenceFileFormData(filePath, sequenceDefinition);

        await reqWorkspace<Workspace>(`${workspace.id}/${filePath}?type=file`, 'PUT', body, user, undefined, false);
        showSuccessToast('Workspace File Created Successfully');

        return filePath;
      } catch (e) {
        catchError('Workspace file was unable to be created', e as Error);
        showFailureToast('Workspace File Creation Failed');
      }
    }

    return null;
  },

  async planMergeBegin(
    mergeRequestId: number,
    sourcePlan: PlanForMerging | undefined,
    targetPlan: PlanForMerging,
    user: User | null,
  ): Promise<boolean> {
    try {
      if (!queryPermissions.PLAN_MERGE_BEGIN(user, sourcePlan, targetPlan, targetPlan.model)) {
        throwPermissionError('begin a merge');
      }

      const data = await reqHasura<{ merge_request_id: number }>(
        gql.PLAN_MERGE_BEGIN,
        { merge_request_id: mergeRequestId },
        user,
      );
      if (data.begin_merge != null) {
        return true;
      } else {
        throw Error('Unable to begin plan merge');
      }
    } catch (error) {
      showFailureToast((error as Error)?.message ?? error);
      catchError('Begin Merge Failed', error as Error);
      return false;
    }
  },

  async planMergeCancel(
    mergeRequestId: number,
    sourcePlan: PlanForMerging | undefined,
    targetPlan: PlanForMerging,
    user: User | null,
  ): Promise<boolean> {
    try {
      if (!queryPermissions.PLAN_MERGE_CANCEL(user, sourcePlan, targetPlan, targetPlan.model)) {
        throwPermissionError('cancel this merge request');
      }

      const data = await reqHasura<{ merge_request_id: number }>(
        gql.PLAN_MERGE_CANCEL,
        { merge_request_id: mergeRequestId },
        user,
      );
      if (data.cancel_merge != null) {
        showSuccessToast('Canceled Merge Request');
        return true;
      } else {
        throw Error('Unable to cancel merge request');
      }
    } catch (error) {
      catchError('Cancel Merge Request Failed', error as Error);
      showFailureToast('Cancel Merge Request Failed');
      return false;
    }
  },

  async planMergeCommit(
    mergeRequestId: number,
    sourcePlan: PlanForMerging | undefined,
    targetPlan: PlanForMerging,
    user: User | null,
  ): Promise<boolean> {
    try {
      if (!queryPermissions.PLAN_MERGE_COMMIT(user, sourcePlan, targetPlan, targetPlan.model)) {
        throwPermissionError('approve this merge request');
      }

      const data = await reqHasura<{ merge_request_id: number }>(
        gql.PLAN_MERGE_COMMIT,
        { merge_request_id: mergeRequestId },
        user,
      );
      if (data.commit_merge != null) {
        showSuccessToast('Approved Merge Request Changes');
        return true;
      } else {
        throw Error('Unable to approve merge request');
      }
    } catch (error) {
      catchError('Approve Merge Request Changes Failed', error as Error);
      showFailureToast('Approve Merge Request Changes Failed');
      return false;
    }
  },

  async planMergeDeny(
    mergeRequestId: number,
    sourcePlan: PlanForMerging | undefined,
    targetPlan: PlanForMerging,
    user: User | null,
  ): Promise<boolean> {
    try {
      if (!queryPermissions.PLAN_MERGE_DENY(user, sourcePlan, targetPlan, targetPlan.model)) {
        throwPermissionError('deny this merge request');
      }

      const data = await reqHasura<{ merge_request_id: number }>(
        gql.PLAN_MERGE_DENY,
        { merge_request_id: mergeRequestId },
        user,
      );
      if (data.deny_merge != null) {
        showSuccessToast('Denied Merge Request Changes');
        return true;
      } else {
        throw Error('Unable to deny merge request');
      }
    } catch (error) {
      catchError('Deny Merge Request Changes Failed', error as Error);
      showFailureToast('Deny Merge Request Changes Failed');
      return false;
    }
  },

  async planMergeRequestWithdraw(
    mergeRequestId: number,
    sourcePlan: PlanForMerging,
    targetPlan: PlanForMerging | undefined,
    user: User | null,
  ): Promise<boolean> {
    try {
      if (!queryPermissions.PLAN_MERGE_REQUEST_WITHDRAW(user, sourcePlan, targetPlan, sourcePlan.model)) {
        throwPermissionError('withdraw this merge request');
      }

      const data = await reqHasura<{ merge_request_id: number }>(
        gql.PLAN_MERGE_REQUEST_WITHDRAW,
        { merge_request_id: mergeRequestId },
        user,
      );
      if (data.withdraw_merge_request != null) {
        showSuccessToast('Withdrew Merge Request');
        return true;
      } else {
        throw Error('Unable to withdraw merge request');
      }
    } catch (error) {
      showFailureToast('Withdraw Merge Request Failed');
      catchError('Withdraw Merge Request Failed', error as Error);
      return false;
    }
  },

  async planMergeResolveAllConflicts(
    mergeRequestId: number,
    resolution: PlanMergeResolution,
    sourcePlan: PlanForMerging | undefined,
    targetPlan: PlanForMerging,
    user: User | null,
  ): Promise<void> {
    try {
      if (!queryPermissions.PLAN_MERGE_RESOLVE_ALL_CONFLICTS(user, sourcePlan, targetPlan, targetPlan.model)) {
        throwPermissionError('resolve merge request conflicts');
      }

      const data = await reqHasura(
        gql.PLAN_MERGE_RESOLVE_ALL_CONFLICTS,
        { merge_request_id: mergeRequestId, resolution },
        user,
      );
      if (data.set_resolution_bulk == null) {
        throw Error('Unable to resolve all merge request conflicts');
      }
    } catch (e) {
      showFailureToast('Resolve All Merge Request Conflicts Failed');
      catchError('Resolve All Merge Request Conflicts Failed', e as Error);
    }
  },

  async planMergeResolveConflict(
    mergeRequestId: number,
    activityId: ActivityDirectiveId,
    resolution: PlanMergeResolution,
    sourcePlan: PlanForMerging | undefined,
    targetPlan: PlanForMerging,
    user: User | null,
  ): Promise<void> {
    try {
      if (!queryPermissions.PLAN_MERGE_RESOLVE_CONFLICT(user, sourcePlan, targetPlan, targetPlan.model)) {
        throwPermissionError('resolve merge request conflicts');
      }

      const data = await reqHasura(
        gql.PLAN_MERGE_RESOLVE_CONFLICT,
        { activity_id: activityId, merge_request_id: mergeRequestId, resolution },
        user,
      );
      if (data.set_resolution == null) {
        throw Error('Unable to resolve merge request conflict');
      }
    } catch (e) {
      showFailureToast('Resolve Merge Request Conflict Failed');
      catchError('Resolve Merge Request Conflict Failed', e as Error);
    }
  },

  async removePresetFromActivityDirective(
    plan: Plan,
    activityDirectiveId: ActivityDirectiveId,
    presetId: ActivityPresetId,
    user: User | null,
  ): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_PRESET_TO_DIRECTIVE(user, plan)) {
        throwPermissionError('remove the preset from this activity directive');
      }

      const data = await reqHasura<{ preset_id: number }>(
        gql.DELETE_PRESET_TO_DIRECTIVE,
        { activity_directive_id: activityDirectiveId, plan_id: plan.id, preset_id: presetId },
        user,
      );
      if (data.delete_preset_to_directive_by_pk != null) {
        showSuccessToast('Removed Activity Preset Successfully');
        return true;
      } else {
        throw Error(
          `Unable to remove activity preset with ID: "${presetId}" from directive with ID: "${activityDirectiveId}"`,
        );
      }
    } catch (e) {
      catchError('Activity Preset Removal Failed', e as Error);
      showFailureToast('Activity Preset Removal Failed');
      return false;
    }
  },

  async renameWorkspaceItem(
    workspace: Workspace,
    originalNode: WorkspaceTreeNode,
    originalPath: string,
    user: User | null,
  ): Promise<string | null> {
    const typeString: string = originalNode.type === WorkspaceContentType.Directory ? 'Directory' : 'File';
    try {
      if (!featurePermissions.workspace.canUpdate(user, workspace, originalNode)) {
        throwPermissionError(`update this workspace ${typeString.toLowerCase()}`);
      }
      const { confirm, value } = await showRenameWorkspaceItemModal(originalNode, originalPath);

      if (confirm) {
        const { targetPath } = value;
        const cleanedTargetPath = cleanPath(targetPath);
        await reqWorkspace<Workspace>(
          joinPath([workspace.id, originalPath]),
          'POST',
          JSON.stringify({
            moveTo: `./${cleanedTargetPath}`,
          }),
          user,
          undefined,
          false,
        );
        showSuccessToast(`Workspace ${typeString} Renamed Successfully`);
        return cleanedTargetPath;
      }
    } catch (e) {
      catchError(`Workspace ${typeString.toLowerCase()} was unable to be renamed`, e as Error);
      showFailureToast(`Workspace ${typeString} Rename Failed`);
    }

    return null;
  },

  async restoreActivityFromChangelog(
    activityId: number,
    plan: Plan,
    revision: number,
    user: User | null,
  ): Promise<boolean> {
    try {
      if (!queryPermissions.RESTORE_ACTIVITY_FROM_CHANGELOG(user, plan)) {
        throwPermissionError('restore activity from changelog');
      }

      const data = await reqHasura(
        gql.RESTORE_ACTIVITY_FROM_CHANGELOG,
        { activity_id: activityId, plan_id: plan.id, revision },
        user,
      );

      if (data.restoreActivityFromChangelog != null) {
        showSuccessToast('Restored Activity from Changelog');
        return true;
      } else {
        throw Error(`Unable to restore activity revision ${revision} from changelog`);
      }
    } catch (e) {
      catchError('Restoring Activity From Changelog Failed', e as Error);
      showFailureToast('Restoring Activity from Changelog Failed');
      return false;
    }
  },

  async restorePlanSnapshot(snapshot: PlanSnapshot, plan: Plan, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.RESTORE_PLAN_SNAPSHOT(user, plan, plan.model)) {
        throwPermissionError('restore plan snapshot');
      }

      const { confirm, value } = await showRestorePlanSnapshotModal(
        snapshot,
        (get(activityDirectivesDBStore) || []).length,
        user,
      );

      if (confirm) {
        if (value && value.shouldCreateSnapshot) {
          const { description, name, snapshot: restoredSnapshot, tags } = value;

          await effects.createPlanSnapshotHelper(restoredSnapshot.plan_id, name, description, tags, user);
        }

        const data = await reqHasura(
          gql.RESTORE_PLAN_SNAPSHOT,
          { plan_id: snapshot.plan_id, snapshot_id: snapshot.snapshot_id },
          user,
        );
        if (data.restore_from_snapshot != null) {
          showSuccessToast('Plan Snapshot Restored Successfully');

          goto(`${base}/plans/${snapshot.plan_id}`);
          return true;
        } else {
          throw Error('Unable to restore plan snapshot');
        }
      }
    } catch (e) {
      catchError('Restore Plan Snapshot Failed', e as Error);
      showFailureToast('Restore Plan Snapshot Failed');
      return false;
    }
    return false;
  },

  async retriggerModelExtraction(
    id: number,
    user: User | null,
  ): Promise<{
    response: {
      activity_types: ModelLog;
      model_parameters: ModelLog;
      resource_types: ModelLog;
    };
  } | null> {
    try {
      if (!queryPermissions.UPDATE_MODEL(user)) {
        throwPermissionError('retrigger this model extraction');
      }

      const data = await reqGateway('/modelExtraction', 'POST', JSON.stringify({ missionModelId: id }), user, false);
      if (data != null) {
        const {
          response: { activity_types: activityTypes, model_parameters: modelParameters, resource_types: resourceTypes },
        } = data;

        if (activityTypes.error) {
          throw Error(activityTypes.error);
        }
        if (modelParameters.error) {
          throw Error(modelParameters.error);
        }
        if (resourceTypes.error) {
          throw Error(resourceTypes.error);
        }

        showSuccessToast('Model Extraction Retriggered Successfully');
        return data;
      } else {
        throw Error(`Unable to retrigger model extraction with ID: "${id}"`);
      }
    } catch (e) {
      catchError('Model Extraction Failed', e as Error);
      showFailureToast('Model Extraction Failed');
    }
    return null;
  },

  async runAction(
    actionDefinition: ActionDefinition,
    workspaceSequences: UserSequence[],
    user: User | null,
    parameters?: ArgumentsMap,
  ): Promise<number | null> {
    try {
      const { confirm, value } = await showRunActionModal(actionDefinition, user, workspaceSequences, parameters);
      if (confirm && value) {
        const { id } = value;
        return id;
      }
      return null;
    } catch (e) {
      catchError('Run Action Failed', e as Error);
      showFailureToast('Run Action Failed');
      return null;
    }
  },

  async saveWorkspaceFile(workspaceId: number, filePath: string, fileContent: string, user: User | null = null) {
    try {
      const body = createWorkspaceSequenceFileFormData(filePath, fileContent);

      await reqWorkspace<Workspace>(
        `${workspaceId}/${filePath}?type=file&overwrite=true`,
        'PUT',
        body,
        user,
        undefined,
        false,
      );
      showSuccessToast('Workspace File Saved Successfully');
    } catch (e) {
      catchError('Workspace file was unable to be saved', e as Error);
      showFailureToast('Workspace File Save Failed');
    }
  },

  async schedule(analysisOnly: boolean = false, plan: Plan | null, user: User | null): Promise<void> {
    try {
      if (plan) {
        if (
          !queryPermissions.UPDATE_SCHEDULING_SPECIFICATION(user, plan) ||
          !queryPermissions.SCHEDULE(user, plan, plan.model)
        ) {
          throwPermissionError(`run ${analysisOnly ? 'scheduling analysis' : 'scheduling'}`);
        }

        const specificationId = get(selectedSpecIdStore);
        if (plan !== null && specificationId !== null) {
          const planRevision = await effects.getPlanRevision(plan.id, user);
          if (planRevision !== null) {
            await effects.updateSchedulingSpec(
              specificationId,
              { analysis_only: analysisOnly, plan_revision: planRevision },
              plan,
              user,
            );
          } else {
            throw Error(`Plan revision for plan ${plan.id} was not found.`);
          }

          const data = await reqHasura<SchedulingResponse>(gql.SCHEDULE, { specificationId }, user);
          const { schedule } = data;
          if (schedule) {
            const { reason, analysisId } = schedule;
            if (reason) {
              catchSchedulingError(reason);
              showFailureToast(`Scheduling ${analysisOnly ? 'Analysis ' : ''}Failed`);
              return;
            }

            const unsubscribe = schedulingRequestsStore.subscribe(async (requests: SchedulingRequest[]) => {
              const matchingRequest = requests.find(request => request.analysis_id === analysisId);
              if (matchingRequest) {
                if (matchingRequest.canceled) {
                  unsubscribe();
                } else if (matchingRequest.status === 'success') {
                  // If a new simulation was run during scheduling, the response will include a datasetId
                  // which will need to be cross referenced with a simulation_dataset.id so we
                  // can load that new simulation. Load the associated sim dataset if it is not already loaded
                  const currentSimulationDataset = get(simulationDatasetStore);
                  if (
                    typeof matchingRequest.dataset_id === 'number' &&
                    (!currentSimulationDataset || matchingRequest.dataset_id !== currentSimulationDataset.dataset_id)
                  ) {
                    const simDatasetIdData = await reqHasura<{ id: number }>(
                      gql.GET_SIMULATION_DATASET_ID,
                      { datasetId: matchingRequest.dataset_id },
                      user,
                    );
                    const { simulation_dataset: simulationDataset } = simDatasetIdData;
                    // the request above will return either 0 or 1 element
                    if (Array.isArray(simulationDataset) && simulationDataset.length > 0) {
                      simulationDatasetIdStore.set(simulationDataset[0].id);
                    }
                  }
                  showSuccessToast(`Scheduling ${analysisOnly ? 'Analysis ' : ''}Complete`);
                  unsubscribe();
                } else if (matchingRequest.status === 'failed') {
                  if (matchingRequest.reason) {
                    catchSchedulingError(matchingRequest.reason);
                  }
                  showFailureToast(`Scheduling ${analysisOnly ? 'Analysis ' : ''}Failed`);
                  unsubscribe();
                }
              }
            });
            const planIdUnsubscribe = planIdStore.subscribe(currentPlanId => {
              if (currentPlanId < 0 || currentPlanId !== plan.id) {
                unsubscribe();
                planIdUnsubscribe();
              }
            });
          } else {
            throw Error('Unable to schedule');
          }
        }
      } else {
        throw Error('Plan is not defined.');
      }
    } catch (e) {
      catchError(e as Error);
      showFailureToast('Scheduling failed');
    }
  },

  // TODO: remove this after expansion runs are made to work in new workspaces
  // async sendSequenceToWorkspace(
  //   sequence: ExpansionSequence | null,
  //   expandedSequence: string | null,
  //   user: User | null,
  // ): Promise<void> {
  //   if (sequence === null) {
  //     showFailureToast("Sequence Doesn't Exist");
  //     return;
  //   }

  //   if (expandedSequence === null) {
  //     showFailureToast("Expanded Sequence Doesn't Exist");
  //     return;
  //   }

  //   const { confirm, value } = await showExpansionPanelModal();

  //   if (!confirm || !value) {
  //     return;
  //   }

  //   try {
  //     const createUserSequenceInsertInput: UserSequenceInsertInput = {
  //       definition: expandedSequence,
  //       is_locked: false,
  //       name: sequence.seq_id,
  //       parcel_id: value.parcelId,
  //       seq_json: '',
  //       workspace_id: value.workspaceId,
  //     };
  //     const userSequenceCreated = await this.createUserSequence(createUserSequenceInsertInput, user);
  //     if (!userSequenceCreated) {
  //       throw Error('Sequence Import Failed');
  //     }
  //   } catch (e) {
  //     catchError(e as Error);
  //   }
  // },

  async session(user: BaseUser | null): Promise<ReqSessionResponse> {
    try {
      const data = await reqGateway<ReqSessionResponse>('/auth/session', 'GET', null, user, false);
      return data;
    } catch (e) {
      catchError(e as Error);
      return { message: 'An unexpected error occurred', success: false };
    }
  },

  async simulate(plan: Plan | null, force: boolean = false, user: User | null): Promise<void> {
    try {
      if (plan !== null) {
        if (!queryPermissions.SIMULATE(user, plan, plan.model)) {
          throwPermissionError('simulate this plan');
        }

        resetConstraintStoresForSimulation();

        const data = await reqHasura<SimulateResponse>(gql.SIMULATE, { force, planId: plan.id }, user);
        const { simulate } = data;
        if (simulate != null) {
          const { simulationDatasetId: newSimulationDatasetId } = simulate;
          simulationDatasetIdStore.set(newSimulationDatasetId);
        } else {
          throw Error('Unable to simulate this plan');
        }
      } else {
        throw Error('Plan is not defined.');
      }
    } catch (e) {
      catchError(e as Error);
    }
  },

  async updateActionDefinition(
    id: number,
    actionDefinitionSetInput: ActionDefinitionSetInput,
    user: User | null,
  ): Promise<void> {
    try {
      if (!queryPermissions.UPDATE_ACTION_DEFINITION(user)) {
        throwPermissionError('update this action definition');
      }

      const { update_action_definition_by_pk: updateActionDefinitionByPk } = await reqHasura<ActionDefinition>(
        gql.UPDATE_ACTION_DEFINITION,
        {
          actionDefinitionSetInput,
          id,
        },
        user,
      );

      if (updateActionDefinitionByPk != null) {
        showSuccessToast(`Action Updated Successfully`);
      } else {
        throw Error(`Unable to update action with ID: "${id}"`);
      }
    } catch (e) {
      catchError('Action Update Failed', e as Error);
      showFailureToast('Action Update Failed');
    }
  },

  async updateActivityDirective(
    plan: Plan,
    id: ActivityDirectiveId,
    partialActivityDirective: Partial<ActivityDirective>,
    activityType: ActivityType | null,
    user: User | null,
    newFiles: File[] = [],
    signal?: AbortSignal,
  ): Promise<void> {
    try {
      if (!queryPermissions.UPDATE_ACTIVITY_DIRECTIVE(user, plan)) {
        throwPermissionError('update this activity directive');
      }

      const generatedFilenames = await effects.uploadFiles(newFiles, user);

      const activityDirectiveSetInput: ActivityDirectiveSetInput = {};

      if (partialActivityDirective.arguments) {
        activityDirectiveSetInput.arguments = replacePaths(
          activityType?.parameters ?? null,
          partialActivityDirective.arguments,
          generatedFilenames,
        );
      }

      if (partialActivityDirective.anchor_id !== undefined) {
        activityDirectiveSetInput.anchor_id = partialActivityDirective.anchor_id;
      }

      if (partialActivityDirective.anchored_to_start !== undefined) {
        activityDirectiveSetInput.anchored_to_start = partialActivityDirective.anchored_to_start;
      }

      if (partialActivityDirective.start_offset) {
        activityDirectiveSetInput.start_offset = partialActivityDirective.start_offset;
      }

      if (partialActivityDirective.name) {
        activityDirectiveSetInput.name = partialActivityDirective.name;
      }

      if (partialActivityDirective.metadata) {
        activityDirectiveSetInput.metadata = partialActivityDirective.metadata;
      }

      const data = await reqHasura<ActivityDirectiveDB>(
        gql.UPDATE_ACTIVITY_DIRECTIVE,
        {
          activityDirectiveSetInput,
          id,
          plan_id: plan.id,
        },
        user,
        signal,
      );

      if (data.update_activity_directive_by_pk) {
        const { update_activity_directive_by_pk: updatedDirective } = data;
        activityDirectivesDBStore.updateValue(directives => {
          return (directives || []).map(directive => {
            if (directive.id === id) {
              return updatedDirective;
            }
            return directive;
          });
        });
        showSuccessToast('Activity Directive Updated Successfully');
      } else {
        throw Error(`Unable to update directive with ID: "${id}"`);
      }
    } catch (e) {
      catchError('Activity Directive Update Failed', e as Error);
      showFailureToast(`Activity Directive Update Failed: \n${(e as Error).message}`);
    }
  },

  async updateActivityPreset(updatedActivityPreset: ActivityPresetSetInput, user: User | null): Promise<void> {
    try {
      if (!queryPermissions.UPDATE_ACTIVITY_PRESET(user, updatedActivityPreset)) {
        throwPermissionError('update this activity preset');
      }

      const { id, ...restOfPresetPayload } = updatedActivityPreset;
      const { update_activity_presets_by_pk: updateActivityPresetsByPk } = await reqHasura<ActivityPreset>(
        gql.UPDATE_ACTIVITY_PRESET,
        {
          activityPresetSetInput: restOfPresetPayload,
          id,
        },
        user,
      );

      if (updateActivityPresetsByPk != null) {
        const { name: presetName } = updateActivityPresetsByPk;
        showSuccessToast(`Activity Preset ${presetName} Updated Successfully`);
      } else {
        throw Error(`Unable to update activity preset with ID: "${id}"`);
      }
    } catch (e) {
      catchError('Activity Preset Update Failed', e as Error);
      showFailureToast('Activity Preset Update Failed');
    }
  },

  async updateConstraintDefinitionTags(
    constraintId: number,
    constraintRevision: number,
    constraintAuthor: UserId,
    tags: ConstraintDefinitionTagsInsertInput[],
    tagIdsToDelete: number[],
    user: User | null,
  ): Promise<number | null> {
    try {
      if (!queryPermissions.UPDATE_CONSTRAINT_DEFINITION_TAGS(user, { author: constraintAuthor })) {
        throwPermissionError('create constraint definition tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(
        gql.UPDATE_CONSTRAINT_DEFINITION_TAGS,
        { constraintId, constraintRevision, tagIdsToDelete, tags },
        user,
      );
      const { deleteConstraintDefinitionTags, insertConstraintDefinitionTags } = data;
      if (insertConstraintDefinitionTags != null && deleteConstraintDefinitionTags != null) {
        const { affected_rows: affectedRows } = insertConstraintDefinitionTags;

        showSuccessToast('Constraint Updated Successfully');

        return affectedRows;
      } else {
        throw Error('Unable to create constraint definition tags');
      }
    } catch (e) {
      catchError('Create Constraint Definition Tags Failed', e as Error);
      showFailureToast('Create Constraint Definition Tags Failed');
      return null;
    }
  },

  async updateConstraintMetadata(
    id: number,
    constraintMetadata: ConstraintMetadataSetInput,
    tags: ConstraintMetadataTagsInsertInput[],
    tagIdsToDelete: number[],
    currentConstraintOwner: UserId,
    user: User | null,
  ): Promise<boolean> {
    try {
      if (!queryPermissions.UPDATE_CONSTRAINT_METADATA(user, { owner: currentConstraintOwner })) {
        throwPermissionError('update this constraint');
      }

      const data = await reqHasura(
        gql.UPDATE_CONSTRAINT_METADATA,
        { constraintMetadata, id, tagIdsToDelete, tags },
        user,
      );
      if (
        data.updateConstraintMetadata == null ||
        data.insertConstraintTags == null ||
        data.deleteConstraintTags == null
      ) {
        throw Error(`Unable to update constraint metadata with ID: "${id}"`);
      }

      showSuccessToast('Constraint Updated Successfully');
      return true;
    } catch (e) {
      catchError('Constraint Metadata Update Failed', e as Error);
      showFailureToast('Constraint Metadata Update Failed');
      return false;
    }
  },

  async updateConstraintModelSpecification(constraintSpecToUpdate: ConstraintModelSpecSetInput, user: User | null) {
    try {
      if (!queryPermissions.UPDATE_CONSTRAINT_MODEL_SPECIFICATION(user)) {
        throwPermissionError('update this constraint model specification');
      }
      const {
        arguments: constraintArguments,
        invocation_id: constraintInvocationId,
        constraint_revision: revision,
        order,
      } = constraintSpecToUpdate;

      const { updateConstraintModelSpecification } = await reqHasura(
        gql.UPDATE_CONSTRAINT_MODEL_SPECIFICATION,
        { arguments: constraintArguments, constraintInvocationId, order, revision },
        user,
      );

      if (updateConstraintModelSpecification !== null) {
        showSuccessToast(`Constraint Model Specification Updated Successfully`);
      } else {
        throw Error('Unable to update the constraint specification for the model');
      }
    } catch (e) {
      catchError('Constraint Model Specification Update Failed', e as Error);
      showFailureToast('Constraint Model Specification Update Failed');
    }
  },

  async updateConstraintModelSpecifications(
    constraintSpecsToAdd: ConstraintModelSpecInsertInput[],
    constraintInvocationIdsToDelete: number[],
    user: User | null,
  ) {
    try {
      if (!queryPermissions.UPDATE_CONSTRAINT_MODEL_SPECIFICATIONS(user)) {
        throwPermissionError('update this constraint model specification');
      }

      const { deleteConstraintModelSpecifications, addConstraintModelSpecifications } = await reqHasura(
        gql.UPDATE_CONSTRAINT_MODEL_SPECIFICATIONS,
        { constraintInvocationIdsToDelete, constraintSpecsToAdd },
        user,
      );

      if (addConstraintModelSpecifications !== null || deleteConstraintModelSpecifications !== null) {
        showSuccessToast(`Constraint Model Specifications Updated Successfully`);
      } else {
        throw Error('Unable to update the constraint specifications for the model');
      }
    } catch (e) {
      catchError('Constraint Model Specifications Update Failed', e as Error);
      showFailureToast('Constraint Model Specifications Update Failed');
    }
  },

  async updateConstraintPlanSpecification(
    plan: Plan,
    constraintPlanSpecification: ConstraintPlanSpecSetInput,
    user: User | null,
  ) {
    try {
      if (!queryPermissions.UPDATE_CONSTRAINT_PLAN_SPECIFICATION(user, plan)) {
        throwPermissionError('update this constraint plan specification');
      }
      const {
        arguments: constraintArguments,
        enabled,
        invocation_id: invocationId,
        constraint_revision: revision,
        order,
      } = constraintPlanSpecification;

      const { updateConstraintPlanSpecification } = await reqHasura(
        gql.UPDATE_CONSTRAINT_PLAN_SPECIFICATION,
        {
          arguments: constraintArguments,
          constraintInvocationId: invocationId,
          enabled,
          order,
          revision,
        },
        user,
      );

      if (updateConstraintPlanSpecification !== null) {
        showSuccessToast(`Constraint Plan Specification Updated Successfully`);
      } else {
        throw Error('Unable to update the constraint specification for the plan');
      }
    } catch (e) {
      catchError('Constraint Plan Specification Update Failed', e as Error);
      showFailureToast('Constraint Plan Specification Update Failed');
    }
  },

  async updateConstraintPlanSpecifications(
    plan: Plan,
    constraintSpecsToInsert: ConstraintPlanSpecInsertInput[],
    constraintSpecIdsToDelete: number[],
    user: User | null,
  ) {
    try {
      if (!queryPermissions.UPDATE_CONSTRAINT_PLAN_SPECIFICATIONS(user, plan)) {
        throwPermissionError('update this constraint plan specification');
      }

      const { deleteConstraintPlanSpecifications, insertConstraintPlanSpecifications } = await reqHasura(
        gql.UPDATE_CONSTRAINT_PLAN_SPECIFICATIONS,
        { constraintSpecIdsToDelete, constraintSpecsToInsert },
        user,
      );

      if (insertConstraintPlanSpecifications !== null || deleteConstraintPlanSpecifications !== null) {
        showSuccessToast(`Constraint Plan Specifications Updated Successfully`);
      } else {
        throw Error('Unable to update the constraint specifications for the plan');
      }
    } catch (e) {
      catchError('Constraint Plan Specifications Update Failed', e as Error);
      showFailureToast('Constraint Plan Specifications Update Failed');
    }
  },

  async updateDerivationGroupAcknowledged(plan: Plan | undefined, derivationGroupName: string, user: User | null) {
    if (plan === undefined) {
      return;
    }
    try {
      if (!queryPermissions.UPDATE_DERIVATION_GROUP_ACKNOWLEDGED(user, plan)) {
        throwPermissionError('mark viewership of a updates to a derivation group');
      }
      const { updatePlanDerivationGroup: update } = await reqHasura(
        gql.UPDATE_DERIVATION_GROUP_ACKNOWLEDGED,
        { acknowledged: true, derivation_group_name: derivationGroupName, plan_id: plan.id },
        user,
      );
      if (update) {
        return update;
      } else {
        throw Error(`Unable to log derivation group update recognition`);
      }
    } catch (e) {
      catchError('Derivation Group Update Visibility Recognition Failed', e as Error);
    }
  },

  async updateExpansionRule(id: number, rule: ExpansionRuleSetInput, user: User | null): Promise<string | null> {
    try {
      savingExpansionRuleStore.set(true);
      createExpansionRuleErrorStore.set(null);

      if (!queryPermissions.UPDATE_EXPANSION_RULE(user, rule)) {
        throwPermissionError('update this expansion rule');
      }

      const data = await reqHasura(gql.UPDATE_EXPANSION_RULE, { id, rule }, user);
      const { updateExpansionRule } = data;
      if (updateExpansionRule != null) {
        const { updated_at: updatedAt } = updateExpansionRule;
        showSuccessToast('Expansion Rule Updated Successfully');
        savingExpansionRuleStore.set(false);
        return updatedAt;
      } else {
        throw Error(`Unable to update expansion rule with ID: "${id}"`);
      }
    } catch (e) {
      catchError('Expansion Rule Update Failed', e as Error);
      showFailureToast('Expansion Rule Update Failed');
      savingExpansionRuleStore.set(false);
      createExpansionRuleErrorStore.set((e as Error).message);
      return null;
    }
  },

  async updateModel(
    id: number,
    model: Partial<ModelSetInput>,
    user: User | null,
  ): Promise<Pick<Model, 'description' | 'name' | 'owner' | 'version' | 'view'> | null> {
    try {
      if (!queryPermissions.UPDATE_MODEL(user)) {
        throwPermissionError('update this model');
      }

      const data = await reqHasura<Pick<Model, 'description' | 'name' | 'owner' | 'version' | 'view'>>(
        gql.UPDATE_MODEL,
        { id, model },
        user,
      );

      if (data != null) {
        showSuccessToast('Model Updated Successfully');
        return data.updateModel;
      } else {
        throw Error(`Unable to update model with ID: "${id}"`);
      }
    } catch (e) {
      catchError('Model Update Failed', e as Error);
      showFailureToast('Model Update Failed');
    }
    return null;
  },

  async updateParcel(
    id: number,
    parcel: Partial<Parcel>,
    parcelOwner: UserId,
    user: User | null,
  ): Promise<string | null> {
    try {
      if (!queryPermissions.UPDATE_PARCEL(user, { owner: parcelOwner })) {
        throwPermissionError('update this parcel');
      }

      const data = await reqHasura<Pick<Parcel, 'id'>>(gql.UPDATE_PARCEL, { id, parcel }, user);
      const { updateParcel } = data;

      if (updateParcel === null) {
        throw Error(`Unable to update parcel with ID: "${id}"`);
      }

      showSuccessToast('Parcel Updated Successfully');
      return '';
    } catch (e) {
      catchError('Parcel Update Failed', e as Error);
      showFailureToast('Parcel Update Failed');
      return null;
    }
  },

  async updatePlan(plan: Plan, planMetadata: Partial<PlanMetadata>, user: User | null): Promise<void> {
    try {
      if (!queryPermissions.UPDATE_PLAN(user, plan)) {
        throwPermissionError('update plan');
      }

      const data = await reqHasura(gql.UPDATE_PLAN, { plan: planMetadata, plan_id: plan.id }, user);
      const { updatePlan } = data;

      if (updatePlan.id != null) {
        showSuccessToast('Plan Updated Successfully');
        return;
      } else {
        throw Error(`Unable to update plan with ID: "${plan.id}"`);
      }
    } catch (e) {
      catchError('Plan Update Failed', e as Error);
      showFailureToast('Plan Update Failed');
      return;
    }
  },

  async updatePlanMissionModel(plan: PlanSlim, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.UPDATE_PLAN(user, plan)) {
        throwPermissionError('update plan');
      }
      if (!queryPermissions.CREATE_PLAN_SNAPSHOT(user)) {
        throwPermissionError('create a snapshot');
      }

      const { confirm, value } = await showUpdatePlanMissionModelModal(plan, user);
      if (confirm) {
        const data = await reqHasura(gql.MIGRATE_PLAN_TO_MODEL, { new_model_id: value.id, plan_id: plan.id }, user);
        if (data.migrate_plan_to_model?.result === 'success') {
          showSuccessToast('Model Migration Success');
          return true;
        } else {
          throw Error(data.migrate_plan_to_model?.result);
        }
      }
    } catch (e) {
      catchError('Model Migration Failed', e as Error);
      showFailureToast('Model Migration Failed');
    }
    return false;
  },

  async updatePlanSnapshot(id: number, snapshot: Partial<PlanSnapshot>, user: User | null): Promise<void> {
    try {
      if (!queryPermissions.UPDATE_PLAN_SNAPSHOT(user)) {
        throwPermissionError('update this plan snapshot');
      }

      const data = await reqHasura(gql.UPDATE_PLAN_SNAPSHOT, { id, snapshot }, user);
      const { updatePlanSnapshot: updatedPlanSnapshotId } = data;

      if (updatedPlanSnapshotId != null) {
        showSuccessToast('Plan Snapshot Updated Successfully');
        return;
      } else {
        throw Error(`Unable to update plan snapshot with ID: "${id}"`);
      }
    } catch (e) {
      catchError('Plan Snapshot Update Failed', e as Error);
      showFailureToast('Plan Snapshot Update Failed');
      return;
    }
  },

  async updateSchedulingConditionDefinitionTags(
    conditionId: number,
    conditionRevision: number,
    conditionAuthor: UserId,
    tags: SchedulingConditionDefinitionTagsInsertInput[],
    tagIdsToDelete: number[],
    user: User | null,
  ): Promise<number | null> {
    try {
      if (!queryPermissions.UPDATE_SCHEDULING_CONDITION_DEFINITION_TAGS(user, { author: conditionAuthor })) {
        throwPermissionError('create scheduling condition definition tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(
        gql.UPDATE_SCHEDULING_CONDITION_DEFINITION_TAGS,
        { conditionId, conditionRevision, tagIdsToDelete, tags },
        user,
      );
      const { deleteSchedulingConditionDefinitionTags, insertSchedulingConditionDefinitionTags } = data;
      if (insertSchedulingConditionDefinitionTags != null && deleteSchedulingConditionDefinitionTags != null) {
        const { affected_rows: affectedRows } = insertSchedulingConditionDefinitionTags;

        showSuccessToast('Scheduling Condition Updated Successfully');

        return affectedRows;
      } else {
        throw Error('Unable to create scheduling condition definition tags');
      }
    } catch (e) {
      catchError('Create Scheduling Condition Definition Tags Failed', e as Error);
      showFailureToast('Create Scheduling Condition Definition Tags Failed');
      return null;
    }
  },

  async updateSchedulingConditionMetadata(
    id: number,
    conditionMetadata: SchedulingConditionMetadataSetInput,
    tags: SchedulingConditionMetadataTagsInsertInput[],
    tagIdsToDelete: number[],
    currentConditionOwner: UserId,
    user: User | null,
  ): Promise<boolean> {
    try {
      if (!queryPermissions.UPDATE_SCHEDULING_CONDITION_METADATA(user, { owner: currentConditionOwner })) {
        throwPermissionError('update this scheduling condition');
      }

      const data = await reqHasura(
        gql.UPDATE_SCHEDULING_CONDITION_METADATA,
        { conditionMetadata, id, tagIdsToDelete, tags },
        user,
      );
      if (
        data.updateSchedulingConditionMetadata == null ||
        data.insertSchedulingConditionTags == null ||
        data.deleteSchedulingConditionTags == null
      ) {
        throw Error(`Unable to update scheduling condition metadata with ID: "${id}"`);
      }

      showSuccessToast('Scheduling Condition Updated Successfully');
      return true;
    } catch (e) {
      catchError('Scheduling Condition Metadata Update Failed', e as Error);
      showFailureToast('Scheduling Condition Metadata Update Failed');
      return false;
    }
  },

  async updateSchedulingConditionModelSpecifications(
    model: Model,
    conditionSpecsToUpdate: (
      | SchedulingConditionModelSpecificationInsertInput
      | SchedulingConditionModelSpecificationSetInput
    )[],
    conditionIdsToDelete: number[],
    user: User | null,
  ) {
    try {
      if (!queryPermissions.UPDATE_SCHEDULING_CONDITION_MODEL_SPECIFICATIONS(user)) {
        throwPermissionError('update this scheduling condition model specification');
      }
      const { deleteConstraintModelSpecifications, updateSchedulingConditionModelSpecifications } = await reqHasura(
        gql.UPDATE_SCHEDULING_CONDITION_MODEL_SPECIFICATIONS,
        {
          conditionIdsToDelete,
          conditionSpecsToUpdate,
          modelId: model.id,
        },
        user,
      );

      if (updateSchedulingConditionModelSpecifications !== null || deleteConstraintModelSpecifications !== null) {
        showSuccessToast(`Scheduling Conditions Updated Successfully`);
      } else {
        throw Error('Unable to update the scheduling condition specifications for the model');
      }
    } catch (e) {
      catchError('Scheduling Condition Model Specifications Update Failed', e as Error);
      showFailureToast('Scheduling Condition Model Specifications Update Failed');
    }
  },

  async updateSchedulingConditionPlanSpecification(
    plan: Plan,
    schedulingSpecificationId: number,
    schedulingConditionPlanSpecification: SchedulingConditionPlanSpecInsertInput,
    user: User | null,
  ) {
    try {
      if (!queryPermissions.UPDATE_SCHEDULING_CONDITION_PLAN_SPECIFICATIONS(user, plan)) {
        throwPermissionError('update this scheduling condition plan specification');
      }
      const { enabled, condition_id: conditionId, condition_revision: revision } = schedulingConditionPlanSpecification;

      const { updateSchedulingConditionPlanSpecification } = await reqHasura(
        gql.UPDATE_SCHEDULING_CONDITION_PLAN_SPECIFICATION,
        { enabled, id: conditionId, revision, specificationId: schedulingSpecificationId },
        user,
      );

      if (updateSchedulingConditionPlanSpecification !== null) {
        showSuccessToast(`Scheduling Condition Plan Specification Updated Successfully`);
      } else {
        throw Error('Unable to update the scheduling condition specification for the plan');
      }
    } catch (e) {
      catchError('Scheduling Condition Plan Specification Update Failed', e as Error);
      showFailureToast('Scheduling Condition Plan Specification Update Failed');
    }
  },

  async updateSchedulingConditionPlanSpecifications(
    plan: Plan,
    schedulingSpecificationId: number,
    conditionSpecsToUpdate: SchedulingConditionPlanSpecInsertInput[],
    conditionSpecIdsToDelete: number[],
    user: User | null,
  ) {
    try {
      if (!queryPermissions.UPDATE_SCHEDULING_CONDITION_PLAN_SPECIFICATIONS(user, plan)) {
        throwPermissionError('update this scheduling condition plan specification');
      }
      const { deleteConstraintPlanSpecifications, updateSchedulingConditionPlanSpecifications } = await reqHasura(
        gql.UPDATE_SCHEDULING_CONDITION_PLAN_SPECIFICATIONS,
        {
          conditionSpecIdsToDelete,
          conditionSpecsToUpdate,
          specificationId: schedulingSpecificationId,
        },
        user,
      );

      if (updateSchedulingConditionPlanSpecifications !== null || deleteConstraintPlanSpecifications !== null) {
        showSuccessToast(`Scheduling Conditions Updated Successfully`);
      } else {
        throw Error('Unable to update the scheduling condition specifications for the plan');
      }
    } catch (e) {
      catchError('Scheduling Condition Plan Specifications Update Failed', e as Error);
      showFailureToast('Scheduling Condition Plan Specifications Update Failed');
    }
  },

  async updateSchedulingGoalDefinitionTags(
    goalId: number,
    goalRevision: number,
    goalAuthor: UserId,
    tags: SchedulingGoalDefinitionTagsInsertInput[],
    tagIdsToDelete: number[],
    user: User | null,
  ): Promise<number | null> {
    try {
      if (!queryPermissions.UPDATE_SCHEDULING_GOAL_DEFINITION_TAGS(user, { author: goalAuthor })) {
        throwPermissionError('create scheduling condition definition tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(
        gql.UPDATE_SCHEDULING_GOAL_DEFINITION_TAGS,
        { goalId, goalRevision, tagIdsToDelete, tags },
        user,
      );
      const { deleteSchedulingGoalDefinitionTags, insertSchedulingGoalDefinitionTags } = data;
      if (insertSchedulingGoalDefinitionTags != null && deleteSchedulingGoalDefinitionTags != null) {
        const { affected_rows: affectedRows } = insertSchedulingGoalDefinitionTags;

        showSuccessToast('Scheduling Goal Updated Successfully');

        return affectedRows;
      } else {
        throw Error('Unable to create scheduling condition definition tags');
      }
    } catch (e) {
      catchError('Create Scheduling Goal Definition Tags Failed', e as Error);
      showFailureToast('Create Scheduling Goal Definition Tags Failed');
      return null;
    }
  },

  async updateSchedulingGoalMetadata(
    id: number,
    goalMetadata: SchedulingGoalMetadataSetInput,
    tags: SchedulingGoalMetadataTagsInsertInput[],
    tagIdsToDelete: number[],
    currentGoalOwner: UserId,
    user: User | null,
  ): Promise<void> {
    try {
      if (!queryPermissions.UPDATE_SCHEDULING_GOAL_METADATA(user, { owner: currentGoalOwner })) {
        throwPermissionError('update this scheduling goal');
      }

      const data = await reqHasura(
        gql.UPDATE_SCHEDULING_GOAL_METADATA,
        { goalMetadata, id, tagIdsToDelete, tags },
        user,
      );
      if (
        data.updateSchedulingGoalMetadata == null ||
        data.insertSchedulingGoalTags == null ||
        data.deleteSchedulingGoalTags == null
      ) {
        throw Error(`Unable to update scheduling goal metadata with ID: "${id}"`);
      }

      showSuccessToast('Scheduling Goal Updated Successfully');
    } catch (e) {
      catchError('Scheduling Goal Metadata Update Failed', e as Error);
      showFailureToast('Scheduling Goal Metadata Update Failed');
    }
  },

  async updateSchedulingGoalModelSpecification(
    schedulingGoalModelSpecification: SchedulingGoalModelSpecificationSetInput,
    user: User | null,
  ) {
    try {
      if (!queryPermissions.UPDATE_SCHEDULING_GOAL_MODEL_SPECIFICATION(user)) {
        throwPermissionError('update this scheduling goal model specification');
      }
      const {
        arguments: goalArguments,
        goal_invocation_id: goalInvocationId,
        goal_revision: revision,
        priority,
      } = schedulingGoalModelSpecification;

      const { updateSchedulingGoalModelSpecification } = await reqHasura(
        gql.UPDATE_SCHEDULING_GOAL_MODEL_SPECIFICATION,
        { arguments: goalArguments, goalInvocationId, priority, revision },
        user,
      );

      if (updateSchedulingGoalModelSpecification !== null) {
        showSuccessToast(`Scheduling Goal Model Specification Updated Successfully`);
      } else {
        throw Error('Unable to update the scheduling goal specification for the model');
      }
    } catch (e) {
      catchError('Scheduling Goal Model Specification Update Failed', e as Error);
      showFailureToast('Scheduling Goal Model Specification Update Failed');
    }
  },

  async updateSchedulingGoalModelSpecifications(
    goalSpecsToAdd: SchedulingGoalModelSpecificationInsertInput[],
    goalIdsToDelete: number[],
    user: User | null,
  ) {
    try {
      if (!queryPermissions.UPDATE_SCHEDULING_GOAL_MODEL_SPECIFICATIONS(user)) {
        throwPermissionError('update this scheduling goal model specification');
      }
      const { addSchedulingGoalModelSpecifications, deleteConstraintModelSpecifications } = await reqHasura(
        gql.UPDATE_SCHEDULING_GOAL_MODEL_SPECIFICATIONS,
        {
          goalIdsToDelete,
          goalSpecsToAdd,
        },
        user,
      );

      if (addSchedulingGoalModelSpecifications !== null || deleteConstraintModelSpecifications !== null) {
        showSuccessToast(`Scheduling Goals Updated Successfully`);
      } else {
        throw Error('Unable to update the scheduling goal specifications for the model');
      }
    } catch (e) {
      catchError('Scheduling Goal Model Specifications Update Failed', e as Error);
      showFailureToast('Scheduling Goal Model Specifications Update Failed');
    }
  },

  async updateSchedulingGoalPlanSpecification(
    plan: Plan,
    schedulingGoalPlanSpecification: SchedulingGoalPlanSpecSetInput,
    parameterSchema: ValueSchemaStruct,
    newFiles: File[] = [],
    user: User | null,
  ) {
    try {
      if (!queryPermissions.UPDATE_SCHEDULING_GOAL_PLAN_SPECIFICATION(user, plan)) {
        throwPermissionError('update this scheduling goal plan specification');
      }

      const generatedFilenames = await effects.uploadFiles(newFiles, user);

      if (schedulingGoalPlanSpecification.arguments) {
        schedulingGoalPlanSpecification.arguments = replacePathsForStructArguments(
          schedulingGoalPlanSpecification.arguments,
          parameterSchema,
          generatedFilenames,
        );
      }

      const {
        arguments: goalArguments,
        enabled,
        goal_invocation_id,
        goal_revision: revision,
        priority,
        simulate_after: simulateAfter,
      } = schedulingGoalPlanSpecification;

      const { updateSchedulingGoalPlanSpecification } = await reqHasura(
        gql.UPDATE_SCHEDULING_GOAL_PLAN_SPECIFICATION,
        {
          arguments: goalArguments,
          enabled,
          goal_invocation_id,
          priority,
          revision,
          simulateAfter,
        },
        user,
      );

      if (updateSchedulingGoalPlanSpecification !== null) {
        showSuccessToast(`Scheduling Goal Plan Specification Updated Successfully`);
      } else {
        throw Error('Unable to update the scheduling goal specification for the plan');
      }
    } catch (e) {
      catchError('Scheduling Goal Plan Specification Update Failed', e as Error);
      showFailureToast('Scheduling Goal Plan Specification Update Failed');
    }
  },

  async updateSchedulingGoalPlanSpecifications(
    plan: Plan,
    goalSpecsToInsert: SchedulingGoalPlanSpecInsertInput[],
    goalSpecIdsToDelete: number[],
    user: User | null,
  ) {
    try {
      if (!queryPermissions.UPDATE_SCHEDULING_GOAL_PLAN_SPECIFICATIONS(user, plan)) {
        throwPermissionError('update this scheduling goal plan specification');
      }
      const { deleteConstraintPlanSpecifications, insertSchedulingGoalPlanSpecifications } = await reqHasura(
        gql.UPDATE_SCHEDULING_GOAL_PLAN_SPECIFICATIONS,
        {
          goalSpecIdsToDelete,
          goalSpecsToInsert,
        },
        user,
      );

      if (insertSchedulingGoalPlanSpecifications !== null || deleteConstraintPlanSpecifications !== null) {
        showSuccessToast(`Scheduling Goals Updated Successfully`);
      } else {
        throw Error('Unable to update the scheduling goal specifications for the plan');
      }
    } catch (e) {
      catchError('Scheduling Goal Plan Specifications Update Failed', e as Error);
      showFailureToast('Scheduling Goal Plan Specifications Update Failed');
    }
  },

  async updateSchedulingSpec(
    id: number,
    spec: Partial<SchedulingPlanSpecification>,
    plan: Plan,
    user: User | null,
  ): Promise<void> {
    try {
      if (!queryPermissions.UPDATE_SCHEDULING_SPECIFICATION(user, plan)) {
        throwPermissionError('update this scheduling spec');
      }

      const data = await reqHasura(gql.UPDATE_SCHEDULING_SPECIFICATION, { id, spec }, user);
      if (data.updateSchedulingSpec == null) {
        throw Error(`Unable to update scheduling spec with ID: "${id}"`);
      }
    } catch (e) {
      catchError(e as Error);
    }
  },

  async updateSequenceFilter(
    filter: ActivityLayerFilter,
    filterName: string,
    filterId: number,
    model: Model,
    user: User | null,
  ): Promise<void> {
    try {
      if (!featurePermissions.sequenceFilter.canUpdate(user, model)) {
        throwPermissionError('update this sequence filter');
      }

      const data = await reqHasura(gql.UPDATE_SEQUENCE_FILTER, { filter, filterId, filterName }, user);
      if (data.updateSequenceFilter !== null) {
        showSuccessToast('Updated Sequence Filter');
      } else {
        throw Error(`Unable to update sequence filter with ID: "${filterId}"`);
      }
    } catch (e) {
      catchError('Failed to Update Sequence Filter', e as Error);
      showFailureToast('Failed To Update Sequence Template');
    }
  },

  async updateSequenceTemplate(
    definition: string,
    sequenceTemplate: SequenceTemplate,
    user: User | null,
  ): Promise<void> {
    try {
      if (!queryPermissions.UPDATE_SEQUENCE_TEMPLATE(user, sequenceTemplate)) {
        throwPermissionError('update this sequence template');
      }

      const data = await reqHasura(gql.UPDATE_SEQUENCE_TEMPLATE, { definition, id: sequenceTemplate.id }, user);
      if (data.updateSequenceTemplate !== null) {
        showSuccessToast('Updated Sequence Template');
      } else {
        throw Error(`Unable to update sequence template with ID: "${sequenceTemplate.id}"`);
      }
    } catch (e) {
      catchError('Failed To Update Sequence Template', e as Error);
      showFailureToast('Failed To Update Sequence Template');
    }
  },

  async updateSimulation(
    plan: Plan,
    simulationSetInput: Simulation,
    user: User | null,
    newFiles: File[] = [],
    modelParameters: ParametersMap | null = null,
  ): Promise<void> {
    try {
      if (!queryPermissions.UPDATE_SIMULATION(user, plan)) {
        throwPermissionError('update this simulation');
      }

      const generatedFilenames = await effects.uploadFiles(newFiles, user);

      const data = await reqHasura<Pick<Simulation, 'id'>>(
        gql.UPDATE_SIMULATION,
        {
          id: simulationSetInput.id,
          simulation: {
            arguments: replacePaths(modelParameters, simulationSetInput.arguments, generatedFilenames),
            simulation_end_time: simulationSetInput?.simulation_end_time ?? null,
            simulation_start_time: simulationSetInput?.simulation_start_time ?? null,
            simulation_template_id: simulationSetInput?.template?.id ?? null,
          },
        },
        user,
      );
      if (data.updateSimulation !== null) {
        showSuccessToast('Simulation Updated Successfully');
      } else {
        throw Error(`Unable to update simulation with ID: "${simulationSetInput.id}"`);
      }
    } catch (e) {
      catchError('Simulation Update Failed', e as Error);
      showFailureToast('Simulation Update Failed');
    }
  },

  async updateSimulationTemplate(
    id: number,
    partialSimulationTemplate: SimulationTemplateSetInput,
    plan: Plan,
    user: User | null,
  ): Promise<void> {
    try {
      if (!queryPermissions.UPDATE_SIMULATION_TEMPLATE(user, plan)) {
        throwPermissionError('update this simulation template');
      }

      const simulationTemplateSetInput: SimulationTemplateSetInput = {
        ...(partialSimulationTemplate.arguments && { arguments: partialSimulationTemplate.arguments }),
        ...(partialSimulationTemplate.description && { description: partialSimulationTemplate.description }),
        ...(partialSimulationTemplate.model_id && { model_id: partialSimulationTemplate.model_id }),
      };

      const { update_simulation_template_by_pk: updateSimulationTemplateByPk } = await reqHasura<SimulationTemplate>(
        gql.UPDATE_SIMULATION_TEMPLATE,
        {
          id,
          simulationTemplateSetInput,
        },
        user,
      );

      if (updateSimulationTemplateByPk != null) {
        const { description: templateDescription } = updateSimulationTemplateByPk;
        showSuccessToast(`Simulation Template ${templateDescription} Updated Successfully`);
      } else {
        throw Error(`Unable to update simulation template with ID: "${id}"`);
      }
    } catch (e) {
      catchError('Simulation Template Update Failed', e as Error);
      showFailureToast('Simulation Template Update Failed');
    }
  },

  async updateTag(
    id: number,
    tagSetInput: TagsSetInput,
    user: User | null,
    notify: boolean = true,
  ): Promise<Tag | null> {
    try {
      createTagErrorStore.set(null);
      if (!queryPermissions.UPDATE_TAG(user, tagSetInput)) {
        throwPermissionError('update tag');
      }
      const data = await reqHasura<Tag>(gql.UPDATE_TAG, { id, tagSetInput }, user);
      const { update_tags_by_pk: updatedTag } = data;
      if (notify) {
        showSuccessToast('Tag Updated Successfully');
      }
      createTagErrorStore.set(null);
      return updatedTag;
    } catch (e) {
      createTagErrorStore.set((e as Error).message);
      catchError('Update Tags Failed', e as Error);
      showFailureToast('Update Tags Failed');
      return null;
    }
  },

  // TODO: remove this after expansion runs are made to work in new workspaces
  // async updateUserSequence(
  //   id: number,
  //   sequence: Partial<UserSequence>,
  //   sequenceOwner: UserId,
  //   user: User | null,
  // ): Promise<string | null> {
  //   try {
  //     if (!queryPermissions.UPDATE_USER_SEQUENCE(user, { owner: sequenceOwner })) {
  //       throwPermissionError('update this user sequence');
  //     }

  //     const data = await reqHasura<Pick<UserSequence, 'id' | 'updated_at'>>(
  //       gql.UPDATE_USER_SEQUENCE,
  //       { id, sequence },
  //       user,
  //     );
  //     const { updateUserSequence } = data;
  //     if (updateUserSequence != null) {
  //       const { updated_at: updatedAt } = updateUserSequence;
  //       showSuccessToast('User Sequence Updated Successfully');
  //       return updatedAt;
  //     } else {
  //       throw Error(`Unable to update user sequence with ID: "${id}"`);
  //     }
  //   } catch (e) {
  //     catchError('User Sequence Update Failed', e as Error);
  //     showFailureToast('User Sequence Update Failed');
  //     return null;
  //   }
  // },

  async updateView(id: number, view: Partial<View>, message: string | null, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.UPDATE_VIEW(user, { owner: view.owner ?? null })) {
        throwPermissionError('update this view');
      }

      const data = await reqHasura<Pick<View, 'id'>>(gql.UPDATE_VIEW, { id, view }, user);
      if (data.updatedView) {
        showSuccessToast(message ?? 'View Updated Successfully');
        return true;
      } else {
        throw Error(`Unable to update view with ID: "${id}"`);
      }
    } catch (e) {
      catchError('View Update Failed', e as Error);
      showFailureToast('View Update Failed');
      return false;
    }
  },

  async uploadDictionary(
    dictionary: string,
    user: User | null,
    persistDictionaryToFilesystem: boolean = true,
  ): Promise<{
    channel?: ChannelDictionaryMetadata;
    command?: CommandDictionaryMetadata;
    parameter?: ParameterDictionaryMetadata;
  } | null> {
    try {
      if (!queryPermissions.CREATE_DICTIONARY(user)) {
        throwPermissionError(`upload a dictionary`);
      }

      if (dictionary.split('\n').find(line => /^PROJECT\s*:\s*"([^"]*)"/.test(line))) {
        // convert cdl to ampcs format, consider moving to aerie backend after decision on XTCE
        // eslint-disable-next-line no-control-regex
        dictionary = toAmpcsXml(parseCdlDictionary(dictionary)).replaceAll(/[^\x00-\x7F]+/g, '');
      }

      const data = await reqHasura<{
        channel?: ChannelDictionaryMetadata;
        command?: CommandDictionaryMetadata;
        parameter?: ParameterDictionaryMetadata;
      }>(gql.CREATE_DICTIONARY, { dictionary, persistDictionaryToFilesystem }, user);

      const { createDictionary: newDictionaries } = data;

      if (newDictionaries === null) {
        throw Error(`Unable to upload Dictionary`);
      }

      return newDictionaries;
    } catch (e) {
      catchError(`Dictionary Upload Failed`, e as Error);
      return null;
    }
  },

  async uploadDictionaryOrAdaptation(
    file: File,
    user: User | null,
    sequenceAdaptationName?: string | undefined,
    persistDictionaryToFilesystem: boolean = true,
  ): Promise<void> {
    const text = await file.text();
    if (sequenceAdaptationName) {
      const seqAdaptation = await this.createCustomAdaptation({ adaptation: text, name: sequenceAdaptationName }, user);
      if (seqAdaptation === null) {
        showFailureToast('Unable to upload sequence adaptation');
        throw Error('Unable to upload sequence adaptation');
      }
      showSuccessToast('Sequence Adaptation Created Successfully');
    } else {
      const uploadedDictionaries = await this.uploadDictionary(text, user, persistDictionaryToFilesystem);
      if (uploadedDictionaries === null) {
        showFailureToast('Failed to upload dictionary file');
        throw Error('Failed to upload dictionary file');
      } else if (Object.keys(uploadedDictionaries).length === 0) {
        showFailureToast('Dictionary Parser return empty data, verify the parser is correctly implemented.');
        throw Error('Dictionary Parser return empty data, verify the parser is correctly implemented.');
      }
      if ('channel' in uploadedDictionaries) {
        showSuccessToast('Channel Dictionary Created Successfully');
      }
      if ('command' in uploadedDictionaries) {
        showSuccessToast('Command Dictionary Created Successfully');
      }
      if ('parameter' in uploadedDictionaries) {
        showSuccessToast('Parameter Dictionary Created Successfully');
      }
    }
  },

  async uploadExternalDataset(
    plan: Plan,
    files: FileList,
    user: User | null,
    simulationDatasetId?: number,
  ): Promise<number | null> {
    try {
      if (!gatewayPermissions.ADD_EXTERNAL_DATASET(user, plan)) {
        throwPermissionError('add external datasets');
      }

      const file: File = files[0];

      const body = new FormData();
      body.append('plan_id', `${plan.id}`);
      body.append('simulation_dataset_id', `${simulationDatasetId}`);
      body.append('external_dataset', file, file.name);

      const uploadedDatasetId = await reqGateway<number | null>('/uploadDataset', 'POST', body, user, true);

      if (uploadedDatasetId != null) {
        showSuccessToast('External Dataset Uploaded Successfully');
        return uploadedDatasetId;
      }

      throw Error('External Dataset Upload Failed');
    } catch (e) {
      catchError(e as Error);
      showFailureToast('External Dataset Upload Failed');
      return null;
    }
  },

  async uploadFile(file: File, user: User | null): Promise<number | null> {
    try {
      const body = new FormData();
      body.append('file', file, file.name);
      const data = await reqGateway<{ id: number }>('/file', 'POST', body, user, true);
      const { id } = data;
      return id;
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async uploadFiles(files: File[], user: User | null): Promise<Record<string, string>> {
    try {
      const ids = [];
      for (const file of files) {
        ids.push(await effects.uploadFile(file, user));
      }
      const originalFilenameToId: Record<string, number> = {};
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        if (id !== null) {
          originalFilenameToId[files[i].name] = id;
        }
      }

      // The aerie gateway mangles the names of uploaded files to ensure uniqueness.
      // Here, we use the ids of the files we just uploaded to look up the generated filenames
      const generatedFilenames: Record<string, string> = {};
      for (const newFile of files) {
        const id = originalFilenameToId[newFile.name];
        const response = (await reqHasura<[{ name: string }]>(gql.GET_UPLOADED_FILENAME, { id }, user)).uploaded_file;
        if (response !== null) {
          generatedFilenames[newFile.name] = `${env.PUBLIC_AERIE_FILE_STORE_PREFIX}${response[0].name}`;
        }
      }

      return generatedFilenames;
    } catch (e) {
      catchError(e as Error);
      return {};
    }
  },

  async uploadView(user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.CREATE_VIEW(user)) {
        throwPermissionError('upload a new view');
      }

      const { confirm, value = null } = await showUploadViewModal();
      if (confirm && value) {
        const { name, definition } = value;

        const viewInsertInput: ViewInsertInput = { definition, name };
        const data = await reqHasura<View>(gql.CREATE_VIEW, { view: viewInsertInput }, user);
        const { newView } = data;

        if (newView != null) {
          viewStore.update(() => newView);
          setQueryParam(SearchParameters.VIEW_ID, `${newView.id}`);
          return true;
        } else {
          throw Error('Unable to upload view');
        }
      }
    } catch (e) {
      catchError('View Upload Failed', e as Error);
      showFailureToast('View Upload Failed');
    }

    return false;
  },

  async validateActivityArguments(
    activityTypeName: string,
    modelId: number,
    argumentsMap: ArgumentsMap,
    user: User | null,
  ): Promise<ParameterValidationResponse> {
    try {
      const data = await reqHasura<ParameterValidationResponse>(
        gql.VALIDATE_ACTIVITY_ARGUMENTS,
        {
          activityTypeName,
          arguments: argumentsMap,
          modelId,
        },
        user,
      );

      const { validateActivityArguments } = data;
      if (validateActivityArguments != null) {
        return validateActivityArguments;
      } else {
        throw Error('Unable to validate activity arguments');
      }
    } catch (e) {
      catchError(e as Error);
      const { message } = e as Error;
      return { errors: [{ message } as ParameterValidationError], success: false };
    }
  },

  async validateViewJSON(unValidatedView: unknown): Promise<{ errors?: string[]; valid: boolean }> {
    try {
      const { errors, valid } = validateViewJSONAgainstSchema(unValidatedView);
      return {
        errors:
          errors?.map(error => {
            if (typeof error === 'string') {
              return error;
            }
            return JSON.stringify(error);
          }) ?? [],
        valid,
      };
    } catch (e) {
      catchError(e as Error);
      const { message } = e as Error;
      return { errors: [message], valid: false };
    }
  },
};

/**
 * Traverses the given simulation arguments and does a "find and replace", replacing any paths that match the keys of `pathsToReplace` with the corresponding values.
 *
 * @param modelParameters The type definitions of the mission model parameters. Used to determine which parameters have type 'path'.
 * @param simArgs The full simulation arguments, which are assumed to conform to the above type definition.
 * @param pathsToReplace A map from old paths to new paths. Any occurrences of old paths in simArgs will be replaced with new paths.
 * @returns
 */
export function replacePaths(
  parameters: ParametersMap | ActionParametersMap | null,
  simArgs: ArgumentsMap,
  pathsToReplace: Record<string, string>,
): ArgumentsMap {
  if (parameters === null) {
    return simArgs;
  }
  const result: ArgumentsMap = {};
  for (const parameterName in parameters) {
    const parameter = parameters[parameterName];
    const arg: Argument = simArgs[parameterName];
    if (arg !== undefined) {
      result[parameterName] = replacePathsHelper(parameter.schema, arg, pathsToReplace);
    }
  }
  return result;
}

/**
 * A specialized version of replacePaths to be used with scheduling goal types.
 *
 * @param goalParameters The goal parameters, which are assumed to conform to the type definitions in parameterSchema.
 * @param parameterSchema The type definitions of the mission model parameters. Used to determine which parameters have type 'path'.
 * @param pathsToReplace A map from old paths to new paths. Any occurrences of old paths in simArgs will be replaced with new paths.
 * @returns
 */
export function replacePathsForStructArguments(
  goalParameters: ArgumentsMap,
  parameterSchema: ValueSchemaStruct,
  pathsToReplace: Record<string, string>,
): ArgumentsMap {
  const result: ArgumentsMap = {};
  for (const parameterName in goalParameters) {
    const arg: Argument = goalParameters[parameterName];
    if (arg !== undefined) {
      result[parameterName] = replacePathsHelper(parameterSchema.items[parameterName], arg, pathsToReplace);
    }
  }
  return result;
}

function replacePathsHelper(
  schema: ValueSchema | ActionValueSchema,
  arg: Argument,
  pathsToReplace: Record<string, string>,
) {
  switch (schema.type) {
    case 'path':
      if (arg in pathsToReplace) {
        return pathsToReplace[arg];
      } else {
        return arg;
      }
    case 'struct':
      return (function () {
        const res: Argument = {};
        for (const key in schema.items) {
          res[key] = replacePathsHelper(schema.items[key], arg[key], pathsToReplace);
        }
        return res;
      })();
    case 'series':
      return arg.map((x: Argument) => replacePathsHelper(schema.items, x, pathsToReplace));
    default:
      return arg;
  }
}

export default effects;
