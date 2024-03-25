import { goto } from '$app/navigation';
import { base } from '$app/paths';
import { env } from '$env/dynamic/public';
import type { CommandDictionary as AmpcsCommandDictionary } from '@nasa-jpl/aerie-ampcs';
import { get } from 'svelte/store';
import { SearchParameters } from '../enums/searchParameters';
import { Status } from '../enums/status';
import { activityDirectives, activityDirectivesMap, selectedActivityDirectiveId } from '../stores/activities';
import { checkConstraintsStatus, constraintsViolationStatus, rawConstraintResponses } from '../stores/constraints';
import { catchError, catchSchedulingError } from '../stores/errors';
import {
  createExpansionRuleError,
  creatingExpansionSequence,
  planExpansionStatus,
  savingExpansionRule,
  savingExpansionSet,
} from '../stores/expansion';
import { createModelError, creatingModel, models } from '../stores/model';
import { createPlanError, creatingPlan, planId } from '../stores/plan';
import { schedulingRequests, selectedSpecId } from '../stores/scheduling';
import { commandDictionaries } from '../stores/sequencing';
import { selectedSpanId, simulationDataset, simulationDatasetId } from '../stores/simulation';
import { createTagError } from '../stores/tags';
import { applyViewUpdate, view, viewUpdateTimeline } from '../stores/views';
import type {
  ActivityDirective,
  ActivityDirectiveId,
  ActivityDirectiveInsertInput,
  ActivityDirectiveRevision,
  ActivityDirectiveSetInput,
  ActivityDirectiveValidationStatus,
  ActivityDirectivesMap,
  ActivityPreset,
  ActivityPresetId,
  ActivityPresetInsertInput,
  ActivityPresetSetInput,
  ActivityType,
  ActivityTypeExpansionRules,
  PlanSnapshotActivity,
} from '../types/activity';
import type { ActivityMetadata } from '../types/activity-metadata';
import type { BaseUser, User, UserId } from '../types/app';
import type { ReqAuthResponse, ReqSessionResponse } from '../types/auth';
import type {
  ConstraintDefinition,
  ConstraintDefinitionInsertInput,
  ConstraintInsertInput,
  ConstraintMetadata,
  ConstraintMetadataSetInput,
  ConstraintPlanSpec,
  ConstraintPlanSpecInsertInput,
  ConstraintResponse,
  ConstraintResult,
} from '../types/constraint';
import type {
  ExpansionRule,
  ExpansionRuleInsertInput,
  ExpansionRuleSetInput,
  ExpansionRun,
  ExpansionSequence,
  ExpansionSequenceInsertInput,
  ExpansionSequenceToActivityInsertInput,
  ExpansionSet,
  SeqId,
} from '../types/expansion';
import type { Extension, ExtensionPayload } from '../types/extension';
import type { Model, ModelInsertInput, ModelSchema, ModelSlim } from '../types/model';
import type { DslTypeScriptResponse, TypeScriptFile } from '../types/monaco';
import type {
  Argument,
  ArgumentsMap,
  EffectiveArguments,
  Parameter,
  ParameterValidationError,
  ParameterValidationResponse,
  ParametersMap,
} from '../types/parameter';
import type {
  PermissibleQueriesMap,
  PermissibleQueryResponse,
  RolePermissionResponse,
  RolePermissionsMap,
} from '../types/permissions';
import type {
  Plan,
  PlanBranchRequestAction,
  PlanForMerging,
  PlanInsertInput,
  PlanMergeConflictingActivity,
  PlanMergeNonConflictingActivity,
  PlanMergeRequestSchema,
  PlanMergeResolution,
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
  SchedulingConditionPlanSpecInsertInput,
  SchedulingConditionPlanSpecification,
  SchedulingGoalDefinition,
  SchedulingGoalDefinitionInsertInput,
  SchedulingGoalInsertInput,
  SchedulingGoalMetadata,
  SchedulingGoalMetadataResponse,
  SchedulingGoalMetadataSetInput,
  SchedulingGoalPlanSpecInsertInput,
  SchedulingGoalPlanSpecification,
  SchedulingPlanSpecification,
  SchedulingPlanSpecificationInsertInput,
  SchedulingRequest,
  SchedulingResponse,
} from '../types/scheduling';
import type { ValueSchema } from '../types/schema';
import type {
  CommandDictionary,
  GetSeqJsonResponse,
  SeqJson,
  UserSequence,
  UserSequenceInsertInput,
} from '../types/sequencing';
import type {
  PlanDataset,
  Profile,
  Resource,
  ResourceType,
  SimulateResponse,
  Simulation,
  SimulationInitialUpdateInput,
  SimulationTemplate,
  SimulationTemplateInsertInput,
  SimulationTemplateSetInput,
  Span,
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
import type { Row, Timeline } from '../types/timeline';
import type { View, ViewDefinition, ViewInsertInput, ViewSlim, ViewUpdateInput } from '../types/view';
import { ActivityDeletionAction } from './activities';
import { convertToQuery, getSearchParameterNumber, setQueryParam } from './generic';
import gql, { convertToGQLArray } from './gql';
import {
  showConfirmModal,
  showCreatePlanBranchModal,
  showCreatePlanSnapshotModal,
  showCreateViewModal,
  showDeleteActivitiesModal,
  showEditViewModal,
  showManagePlanConstraintsModal,
  showManagePlanSchedulingConditionsModal,
  showManagePlanSchedulingGoalsModal,
  showPlanBranchRequestModal,
  showRestorePlanSnapshotModal,
  showUploadViewModal,
} from './modal';
import { queryPermissions } from './permissions';
import { reqExtension, reqGateway, reqHasura } from './requests';
import { sampleProfiles } from './resources';
import { convertResponseToMetadata } from './scheduling';
import { pluralize } from './text';
import { getDoyTime, getDoyTimeFromInterval, getIntervalFromDoyRange } from './time';
import { createRow, duplicateRow } from './timeline';
import { showFailureToast, showSuccessToast } from './toast';
import { generateDefaultView, validateViewJSONAgainstSchema } from './view';

function throwPermissionError(attemptedAction: string): never {
  throw Error(`You do not have permission to: ${attemptedAction}.`);
}

/**
 * Functions that have side-effects (e.g. HTTP requests, toasts, popovers, store updates, etc.).
 */
const effects = {
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

  async cancelSchedulingRequest(analysisId: number, user: User | null): Promise<void> {
    try {
      if (!queryPermissions.CANCEL_PENDING_SCHEDULING_REQUEST(user)) {
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
      if (!queryPermissions.CANCEL_PENDING_SIMULATION(user)) {
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

  async checkConstraints(plan: Plan, user: User | null): Promise<void> {
    try {
      checkConstraintsStatus.set(Status.Incomplete);
      constraintsViolationStatus.set(null);
      if (plan !== null) {
        const { id: planId } = plan;
        const data = await reqHasura<ConstraintResponse[]>(
          gql.CHECK_CONSTRAINTS,
          {
            planId,
          },
          user,
        );
        if (data.constraintResponses) {
          rawConstraintResponses.set(data.constraintResponses);

          // find only the constraints compiled.
          const successfulConstraintResults: ConstraintResult[] = data.constraintResponses
            .filter(constraintResponse => constraintResponse.success)
            .map(constraintResponse => constraintResponse.results);

          const failedConstraintResponses = data.constraintResponses.filter(
            constraintResponse => !constraintResponse.success,
          );

          const anyViolations = successfulConstraintResults.reduce((bool, prev) => {
            if (prev.violations && prev.violations.length > 0) {
              bool = true;
            }
            return bool;
          }, false);
          constraintsViolationStatus.set(anyViolations ? Status.Failed : Status.Complete);

          if (successfulConstraintResults.length === 0 && data.constraintResponses.length > 0) {
            showFailureToast('All Constraints Failed');
            checkConstraintsStatus.set(Status.Failed);
          } else if (successfulConstraintResults.length !== data.constraintResponses.length) {
            showFailureToast('Constraints Partially Checked');
            checkConstraintsStatus.set(successfulConstraintResults.length !== 0 ? Status.Failed : Status.Failed);
          } else {
            showSuccessToast('All Constraints Checked');
            checkConstraintsStatus.set(Status.Complete);
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
      catchError('Check Constraints Failed', e as Error);
      checkConstraintsStatus.set(Status.Failed);
      showFailureToast('Check Constraints Failed');
    }
  },

  async createActivityDirective(
    argumentsMap: ArgumentsMap,
    start_time_doy: string,
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
        const start_offset = getIntervalFromDoyRange(plan.start_time_doy, start_time_doy);
        const activityDirectiveInsertInput: ActivityDirectiveInsertInput = {
          anchor_id: null,
          anchored_to_start: true,
          arguments: argumentsMap,
          metadata,
          name,
          plan_id: plan.id,
          start_offset,
          type,
        };
        const data = await reqHasura<ActivityDirective>(
          gql.CREATE_ACTIVITY_DIRECTIVE,
          {
            activityDirectiveInsertInput,
          },
          user,
        );
        const { insert_activity_directive_one: newActivityDirective } = data;
        if (newActivityDirective != null) {
          const { id } = newActivityDirective;

          activityDirectivesMap.update((currentActivityDirectivesMap: ActivityDirectivesMap) => ({
            ...currentActivityDirectivesMap,
            [id]: newActivityDirective,
          }));
          selectedActivityDirectiveId.set(id);
          selectedSpanId.set(null);

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
      const { insert_activity_directive_tags } = data;
      if (insert_activity_directive_tags != null) {
        const { affected_rows } = insert_activity_directive_tags;

        if (affected_rows !== tags.length) {
          throw Error('Some activity directive tags were not successfully created');
        }

        showSuccessToast('Activity Directive Updated Successfully');
        return affected_rows;
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

  async createCommandDictionary(files: FileList, user: User | null): Promise<CommandDictionary | null> {
    try {
      if (!queryPermissions.CREATE_COMMAND_DICTIONARY(user)) {
        throwPermissionError('upload a command dictionary');
      }

      const file: File = files[0];
      const dictionary = await file.text();
      const data = await reqHasura<CommandDictionary>(gql.CREATE_COMMAND_DICTIONARY, { dictionary }, user);
      const { createCommandDictionary: newCommandDictionary } = data;
      if (newCommandDictionary != null) {
        return newCommandDictionary;
      } else {
        throw Error('Unable to upload command dictionary');
      }
    } catch (e) {
      catchError('Command Dictionary Upload Failed', e as Error);
      return null;
    }
  },

  async createConstraint(
    name: string,
    isPublic: boolean,
    metadataTags: ConstraintTagsInsertInput[],
    definition: string,
    definitionTags: ConstraintTagsInsertInput[],
    user: User | null,
    description?: string,
  ): Promise<number | null> {
    try {
      if (!queryPermissions.CREATE_CONSTRAINT(user)) {
        throwPermissionError('create a constraint');
      }

      const constraintInsertInput: ConstraintInsertInput = {
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
        throw Error(`Unable to create constraint "${name}"`);
      }
    } catch (e) {
      catchError('Constraint Creation Failed', e as Error);
      showFailureToast('Constraint Creation Failed');
      return null;
    }
  },

  async createConstraintDefinition(
    constraintId: number,
    definition: string,
    definitionTags: ConstraintTagsInsertInput[],
    user: User | null,
  ): Promise<Pick<ConstraintDefinition, 'constraint_id' | 'definition' | 'revision'> | null> {
    try {
      if (!queryPermissions.CREATE_CONSTRAINT_DEFINITION(user)) {
        throwPermissionError('create a constraint');
      }

      const constraintDefinitionInsertInput: ConstraintDefinitionInsertInput = {
        constraint_id: constraintId,
        definition,
        tags: {
          data: definitionTags,
        },
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

  async createExpansionRule(rule: ExpansionRuleInsertInput, user: User | null): Promise<number | null> {
    try {
      createExpansionRuleError.set(null);

      if (!queryPermissions.CREATE_EXPANSION_RULE(user)) {
        throwPermissionError('create an expansion rule');
      }

      savingExpansionRule.set(true);
      const data = await reqHasura<ExpansionRule>(gql.CREATE_EXPANSION_RULE, { rule }, user);
      const { createExpansionRule } = data;
      if (createExpansionRule != null) {
        const { id } = createExpansionRule;
        showSuccessToast('Expansion Rule Created Successfully');
        savingExpansionRule.set(false);
        return id;
      } else {
        throw Error(`Unable to create expansion rule "${rule.name}"`);
      }
    } catch (e) {
      catchError('Expansion Rule Create Failed', e as Error);
      showFailureToast('Expansion Rule Create Failed');
      savingExpansionRule.set(false);
      createExpansionRuleError.set((e as Error).message);
      return null;
    }
  },

  async createExpansionRuleTags(tags: ExpansionRuleTagsInsertInput[], user: User | null): Promise<number | null> {
    try {
      if (!queryPermissions.CREATE_EXPANSION_RULE_TAGS(user)) {
        throwPermissionError('create expansion rule tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(gql.CREATE_EXPANSION_RULE_TAGS, { tags }, user);
      const { insert_expansion_rule_tags } = data;
      if (insert_expansion_rule_tags != null) {
        const { affected_rows } = insert_expansion_rule_tags;

        if (affected_rows !== tags.length) {
          throw Error('Some expansion rule tags were not successfully created');
        }

        return affected_rows;
      } else {
        throw Error(`Unable to create expansion rule tags`);
      }
    } catch (e) {
      catchError('Create Expansion Rule Tags Failed', e as Error);
      showFailureToast('Create Expansion Rule Tags Failed');
      return null;
    }
  },

  async createExpansionSequence(seqId: string, simulationDatasetId: number, user: User | null): Promise<void> {
    try {
      if (!queryPermissions.CREATE_EXPANSION_SEQUENCE(user)) {
        throwPermissionError('create an expansion sequence');
      }

      creatingExpansionSequence.set(true);
      const sequence: ExpansionSequenceInsertInput = {
        metadata: {},
        seq_id: seqId,
        simulation_dataset_id: simulationDatasetId,
      };
      const data = await reqHasura<SeqId>(gql.CREATE_EXPANSION_SEQUENCE, { sequence }, user);
      if (data.createExpansionSequence != null) {
        showSuccessToast('Expansion Sequence Created Successfully');
        creatingExpansionSequence.set(false);
      } else {
        throw Error(`Unable to create expansion sequence with ID: "${seqId}"`);
      }
    } catch (e) {
      catchError('Expansion Sequence Create Failed', e as Error);
      showFailureToast('Expansion Sequence Create Failed');
      creatingExpansionSequence.set(false);
    }
  },

  async createExpansionSet(
    dictionaryId: number,
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

      savingExpansionSet.set(true);
      const data = await reqHasura<ExpansionSet>(
        gql.CREATE_EXPANSION_SET,
        {
          dictionaryId,
          expansionRuleIds,
          modelId: model.id,
          ...(name && { name }),
          ...(description && { description }),
        },
        user,
      );
      const { createExpansionSet } = data;
      if (createExpansionSet != null) {
        const { id } = createExpansionSet;
        showSuccessToast('Expansion Set Created Successfully');
        savingExpansionSet.set(false);
        return id;
      } else {
        throw Error('Unable to create expansion set');
      }
    } catch (e) {
      catchError('Expansion Set Create Failed', e as Error);
      showFailureToast('Expansion Set Create Failed');
      savingExpansionSet.set(false);
      return null;
    }
  },

  async createModel(
    name: string,
    version: string,
    files: FileList,
    user: User | null,
    description?: string,
  ): Promise<void> {
    try {
      createModelError.set(null);

      if (!queryPermissions.CREATE_MODEL(user)) {
        throwPermissionError('upload a model');
      }

      creatingModel.set(true);

      const file: File = files[0];
      const jar_id = await effects.uploadFile(file, user);

      if (jar_id !== null) {
        const modelInsertInput: ModelInsertInput = {
          description,
          jar_id,
          mission: '',
          name,
          version,
        };
        const data = await reqHasura<Model>(gql.CREATE_MODEL, { model: modelInsertInput }, user);
        const { createModel } = data;
        if (createModel != null) {
          const { id, created_at, owner } = createModel;
          const model: ModelSlim = {
            created_at,
            id,
            jar_id,
            name,
            owner,
            plans: [],
            version,
            ...(description && { description }),
          };

          showSuccessToast('Model Created Successfully');
          createModelError.set(null);
          creatingModel.set(false);
          models.updateValue((currentModels: ModelSlim[]) => [...currentModels, model]);
        } else {
          throw Error(`Unable to create model "${name}"`);
        }
      }
    } catch (e) {
      catchError('Model Create Failed', e as Error);
      showFailureToast('Model Create Failed');
      createModelError.set((e as Error).message);
      creatingModel.set(false);
    }
  },

  async createPlan(
    end_time_doy: string,
    model_id: number,
    name: string,
    start_time_doy: string,
    simulation_template_id: number | null,
    user: User | null,
  ): Promise<PlanSlim | null> {
    try {
      createPlanError.set(null);

      if (!queryPermissions.CREATE_PLAN(user)) {
        throwPermissionError('create a plan');
      }

      creatingPlan.set(true);

      const planInsertInput: PlanInsertInput = {
        duration: getIntervalFromDoyRange(start_time_doy, end_time_doy),
        model_id,
        name,
        start_time: start_time_doy, // Postgres accepts DOY dates for it's 'timestamptz' type.
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

        if (!(await effects.initialSimulationUpdate(id, simulation_template_id, start_time_doy, end_time_doy, user))) {
          throw Error('Failed to update simulation.');
        }

        if (
          !(await effects.createSchedulingPlanSpecification(
            {
              analysis_only: false,
              horizon_end: end_time_doy,
              horizon_start: start_time_doy,
              plan_id: id,
              plan_revision: revision,
              simulation_arguments: {},
            },
            user,
          ))
        ) {
          throw Error('Failed to create scheduling spec.');
        }

        const plan: PlanSlim = {
          collaborators,
          created_at,
          duration,
          end_time_doy,
          id,
          model_id,
          name,
          owner,
          revision,
          start_time,
          start_time_doy,
          tags: [],
          updated_at,
          updated_by,
        };

        showSuccessToast('Plan Created Successfully');
        createPlanError.set(null);
        creatingPlan.set(false);

        return plan;
      } else {
        throw Error(`Unable to create plan "${name}"`);
      }
    } catch (e) {
      catchError('Plan Create Failed', e as Error);
      showFailureToast('Plan Create Failed');
      createPlanError.set((e as Error).message);
      creatingPlan.set(false);

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
        const { name, plan } = value;
        const data = await reqHasura(gql.DUPLICATE_PLAN, { new_plan_name: name, plan_id: plan.id }, user);
        const { duplicate_plan } = data;
        if (duplicate_plan != null) {
          const { new_plan_id } = duplicate_plan;
          await effects.createSchedulingPlanSpecification(
            {
              analysis_only: false,
              horizon_end: plan.end_time_doy,
              horizon_start: plan.start_time_doy,
              plan_id: new_plan_id,
              plan_revision: 0,
              simulation_arguments: {},
            },
            user,
          );
          goto(`${base}/plans/${duplicate_plan.new_plan_id}`);
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
        const { source_plan, target_plan } = value;

        if (!queryPermissions.CREATE_PLAN_MERGE_REQUEST(user, source_plan, target_plan, plan.model)) {
          throwPermissionError('create a branch merge request');
        }

        if (action === 'merge') {
          await effects.createPlanMergeRequest(
            { ...source_plan, model_id: plan.model_id },
            target_plan,
            plan.model,
            user,
          );
        }
      }
    } catch (e) {
      catchError(e as Error);
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
      const { create_merge_request } = data;
      if (create_merge_request != null) {
        const { merge_request_id } = create_merge_request;
        showSuccessToast('Merge Request Created Successfully');
        return merge_request_id;
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
        const { description, name, plan, tags } = value;
        await effects.createPlanSnapshotHelper(plan.id, name, description, tags, user);
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
   * @param planId
   * @param name
   * @param description
   * @param tags
   * @param user
   */
  async createPlanSnapshotHelper(
    planId: number,
    name: string,
    description: string,
    tags: Tag[],
    user: User | null,
  ): Promise<void> {
    const data = await reqHasura<{ snapshot_id: number }>(
      gql.CREATE_PLAN_SNAPSHOT,
      { description, plan_id: planId, snapshot_name: name },
      user,
    );
    const { createSnapshot } = data;
    if (createSnapshot != null) {
      const { snapshot_id } = createSnapshot;
      // Associate tags with the snapshot
      const newPlanSnapshotTags: PlanSnapshotTagsInsertInput[] =
        tags?.map(({ id: tag_id }) => ({
          snapshot_id,
          tag_id,
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
        throwPermissionError('create plan tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(gql.CREATE_PLAN_SNAPSHOT_TAGS, { tags }, user);
      const { insert_plan_snapshot_tags } = data;
      if (insert_plan_snapshot_tags != null) {
        const { affected_rows } = insert_plan_snapshot_tags;

        if (affected_rows !== tags.length) {
          throw Error('Some plan snapshot tags were not successfully created');
        }
        if (notify) {
          showSuccessToast('Plan Snapshot Updated Successfully');
        }
        return affected_rows;
      } else {
        throw Error('Unable to create plan snapshot tags');
      }
    } catch (e) {
      catchError('Create Plan Snapshot Tags Failed', e as Error);
      showFailureToast('Create Plan Snapshot Tags Failed');
      return null;
    }
  },

  async createPlanTags(tags: PlanTagsInsertInput[], user: User | null, notify: boolean = true): Promise<number | null> {
    try {
      if (!queryPermissions.CREATE_PLAN_TAGS(user)) {
        throwPermissionError('create plan tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(gql.CREATE_PLAN_TAGS, { tags }, user);
      const { insert_plan_tags } = data;
      if (insert_plan_tags != null) {
        const { affected_rows } = insert_plan_tags;

        if (affected_rows !== tags.length) {
          throw Error('Some plan tags were not successfully created');
        }
        if (notify) {
          showSuccessToast('Plan Updated Successfully');
        }
        return affected_rows;
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

  // async createSchedulingConditionPlanSpecification(
  //   spec_condition: SchedulingSpecConditionInsertInput,
  //   user: User | null,
  // ): Promise<void> {
  //   try {
  //     if (!queryPermissions.CREATE_SCHEDULING_CONDITION_PLAN_SPECIFICATION(user)) {
  //       throwPermissionError('create a scheduling spec condition');
  //     }

  //     const data = await reqHasura<SchedulingConditionPlanSpecification>(
  //       gql.CREATE_SCHEDULING_CONDITION_PLAN_SPECIFICATION,
  //       { spec_condition },
  //       user,
  //     );
  //     if (data.createSchedulingSpecCondition == null) {
  //       throw Error('Unable to create a scheduling spec condition');
  //     }
  //   } catch (e) {
  //     catchError(e as Error);
  //   }
  // },

  async createSchedulingGoal(
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
              definition,
              tags: {
                data: definitionTags,
              },
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
    definition: string,
    definitionTags: SchedulingTagsInsertInput[],
    user: User | null,
  ): Promise<Pick<SchedulingGoalDefinition, 'goal_id' | 'definition' | 'revision'> | null> {
    try {
      if (!queryPermissions.CREATE_SCHEDULING_GOAL_DEFINITION(user)) {
        throwPermissionError('create a scheduling goal definition');
      }

      const goalDefinitionInsertInput: SchedulingGoalDefinitionInsertInput = {
        definition,
        goal_id: goalId,
        tags: {
          data: definitionTags,
        },
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

  // async createSchedulingGoalPlanSpecification(
  //   spec_goal: SchedulingSpecGoalInsertInput,
  //   user: User | null,
  // ): Promise<number | null> {
  //   try {
  //     if (!queryPermissions.CREATE_SCHEDULING_GOAL_PLAN_SPECIFICATION(user)) {
  //       throwPermissionError('create a scheduling spec goal');
  //     }

  //     const data = await reqHasura<SchedulingGoalPlanSpecification>(
  //       gql.CREATE_SCHEDULING_GOAL_PLAN_SPECIFICATION,
  //       { spec_goal },
  //       user,
  //     );
  //     const { createSchedulingSpecGoal } = data;
  //     if (createSchedulingSpecGoal != null) {
  //       const { specification_id } = createSchedulingSpecGoal;
  //       return specification_id;
  //     } else {
  //       throw Error('Unable to create a scheduling spec goal');
  //     }
  //   } catch (e) {
  //     catchError(e as Error);
  //     return null;
  //   }
  // },

  async createSchedulingPlanSpecification(
    spec: SchedulingPlanSpecificationInsertInput,
    user: User | null,
  ): Promise<Pick<SchedulingPlanSpecification, 'id'> | null> {
    try {
      if (!queryPermissions.CREATE_SCHEDULING_SPEC(user)) {
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
      createTagError.set(null);
      if (!queryPermissions.CREATE_TAGS(user)) {
        throwPermissionError('create tags');
      }

      const data = await reqHasura<{ affected_row: number; tag: Tag }>(gql.CREATE_TAG, { tag }, user);
      const { insert_tags_one } = data;
      if (insert_tags_one != null) {
        const { tag: insertedTag } = insert_tags_one;
        if (notify) {
          showSuccessToast('Tag Created Successfully');
        }
        createTagError.set(null);
        return insertedTag;
      } else {
        throw Error(`Unable to create tag "${tag.name}"`);
      }
    } catch (e) {
      createTagError.set((e as Error).message);
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
      const { insert_tags } = data;
      if (insert_tags != null) {
        const { returning } = insert_tags;

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

  async createUserSequence(sequence: UserSequenceInsertInput, user: User | null): Promise<number | null> {
    try {
      if (!queryPermissions.CREATE_USER_SEQUENCE(user)) {
        throwPermissionError('create a user sequence');
      }

      const data = await reqHasura<Pick<UserSequence, 'id'>>(gql.CREATE_USER_SEQUENCE, { sequence }, user);
      const { createUserSequence } = data;
      if (createUserSequence != null) {
        const { id } = createUserSequence;
        showSuccessToast('User Sequence Created Successfully');
        return id;
      } else {
        throw Error(`Unable to create user sequence "${sequence.name}"`);
      }
    } catch (e) {
      catchError('User Sequence Create Failed', e as Error);
      showFailureToast('User Sequence Create Failed');
      return null;
    }
  },

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
          view.update(() => newView);
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

  async deleteActivityDirectiveTags(ids: Tag['id'][], user: User | null): Promise<number | null> {
    try {
      if (!queryPermissions.DELETE_ACTIVITY_DIRECTIVE_TAGS(user)) {
        throwPermissionError('delete activity directive tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(gql.DELETE_ACTIVITY_DIRECTIVE_TAGS, { ids }, user);
      const { delete_activity_directive_tags } = data;
      if (delete_activity_directive_tags != null) {
        const { affected_rows } = delete_activity_directive_tags;

        if (affected_rows !== ids.length) {
          throw Error('Some activity directive tags were not successfully deleted');
        }

        showSuccessToast('Activity Directive Updated Successfully');
        return affected_rows;
      } else {
        throw Error('Unable to delete activity directive tags');
      }
    } catch (e) {
      catchError('Delete Activity Directive Tags Failed', e as Error);
      showFailureToast('Delete Activity Directive Tags Failed');
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
              .filter(({ change_type }) => {
                return change_type === 'deleted';
              })
              .map(({ affected_row: { id } }) => id);

            activityDirectivesMap.update((currentActivityDirectivesMap: ActivityDirectivesMap) => {
              deletedActivityIds.forEach(id => delete currentActivityDirectivesMap[id]);
              return { ...currentActivityDirectivesMap };
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
              .filter(({ change_type }) => {
                return change_type === 'deleted';
              })
              .map(({ affected_row: { id } }) => id);

            activityDirectivesMap.update((currentActivityDirectivesMap: ActivityDirectivesMap) => {
              deletedActivityIds.forEach(id => delete currentActivityDirectivesMap[id]);
              return { ...currentActivityDirectivesMap };
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
              .filter(({ change_type }) => {
                return change_type === 'deleted';
              })
              .map(({ affected_row: { id } }) => id);

            activityDirectivesMap.update((currentActivityDirectivesMap: ActivityDirectivesMap) => {
              deletedActivityIds.forEach(id => delete currentActivityDirectivesMap[id]);
              return { ...currentActivityDirectivesMap };
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
            activityDirectivesMap.update((currentActivityDirectivesMap: ActivityDirectivesMap) => {
              deletedActivityIds.forEach(id => delete currentActivityDirectivesMap[id]);
              return { ...currentActivityDirectivesMap };
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
          commandDictionaries.filterValueById(id);
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

  async deleteConstraintMetadataTags(ids: Tag['id'][], user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_CONSTRAINT_METADATA_TAGS(user)) {
        throwPermissionError('delete constraint tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(gql.DELETE_CONSTRAINT_METADATA_TAGS, { ids }, user);
      if (data.delete_constraint_tags != null) {
        if (data.delete_constraint_tags.affected_rows !== ids.length) {
          throw Error('Some constraint tags were not successfully deleted');
        }
        return true;
      } else {
        throw Error('Unable to delete constraint tags');
      }
    } catch (e) {
      catchError('Delete Constraint Tags Failed', e as Error);
      showFailureToast('Delete Constraint Tags Failed');
      return false;
    }
  },

  async deleteConstraintPlanSpecifications(plan: Plan, constraintIds: number[], user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_CONSTRAINT_PLAN_SPECIFICATIONS(user, plan)) {
        throwPermissionError('delete constraint plan specifications');
      }

      const data = await reqHasura<{ affected_rows: number }>(
        gql.DELETE_CONSTRAINT_PLAN_SPECIFICATIONS,
        { constraintIds, planId: plan.id },
        user,
      );
      if (data.delete_constraint_specification != null) {
        if (data.delete_constraint_specification.affected_rows !== constraintIds.length) {
          throw Error('Some constraint plan specifications were not successfully deleted');
        }
        return true;
      } else {
        throw Error('Unable to delete constraint plan specifications');
      }
    } catch (e) {
      catchError('Delete Constraint Plan Specifications Failed', e as Error);
      showFailureToast('Delete Constraint Plan Specifications Failed');
      return false;
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

  async deleteExpansionRuleTags(ids: Tag['id'][], user: User | null): Promise<number | null> {
    try {
      if (!queryPermissions.DELETE_EXPANSION_RULE_TAGS(user)) {
        throwPermissionError('delete expansion rule tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(gql.DELETE_EXPANSION_RULE_TAGS, { ids }, user);
      const { delete_expansion_rule_tags } = data;
      if (delete_expansion_rule_tags != null) {
        const { affected_rows } = delete_expansion_rule_tags;
        if (affected_rows !== ids.length) {
          throw Error('Some expansion rule tags were not successfully deleted');
        }
        return affected_rows;
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
    simulation_dataset_id: number,
    simulated_activity_id: number,
    user: User | null,
  ): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_EXPANSION_SEQUENCE_TO_ACTIVITY(user)) {
        throwPermissionError('delete an expansion sequence from an activity');
      }

      const data = await reqHasura<SeqId>(
        gql.DELETE_EXPANSION_SEQUENCE_TO_ACTIVITY,
        {
          simulated_activity_id,
          simulation_dataset_id,
        },
        user,
      );
      if (data.expansionSequence != null) {
        showSuccessToast('Expansion Sequence Deleted From Activity Successfully');
        return true;
      } else {
        throw Error(
          `Unable to remove the associated expansion sequence from the dataset ${simulation_dataset_id} and the activity ${simulated_activity_id}`,
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
          models.filterValueById(id);
        } else {
          throw Error(`Unable to delete model "${model.name}"`);
        }
      }
    } catch (e) {
      catchError('Model Delete Failed', e as Error);
      showFailureToast('Model Delete Failed');
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

  async deletePlanTags(ids: Tag['id'][], user: User | null): Promise<number | null> {
    try {
      if (!queryPermissions.DELETE_PLAN_TAGS(user)) {
        throwPermissionError('delete plan tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(gql.DELETE_PLAN_TAGS, { ids }, user);
      const { delete_plan_tags } = data;
      if (delete_plan_tags != null) {
        const { affected_rows } = delete_plan_tags;
        if (affected_rows !== ids.length) {
          throw Error('Some plan tags were not successfully deleted');
        }
        showSuccessToast('Plan Updated Successfully');
        return affected_rows;
      } else {
        throw Error('Unable to delete plan tags');
      }
    } catch (e) {
      catchError('Delete Plan Tags Failed', e as Error);
      showFailureToast('Delete Plan Tags Failed');
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

  async deleteSchedulingConditionTags(ids: Tag['id'][], user: User | null): Promise<number | null> {
    try {
      if (!queryPermissions.DELETE_SCHEDULING_CONDITION_METADATA_TAGS(user)) {
        throwPermissionError('delete scheduling condition tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(
        gql.DELETE_SCHEDULING_CONDITION_METADATA_TAGS,
        { ids },
        user,
      );
      const { delete_scheduling_condition_tags } = data;
      if (delete_scheduling_condition_tags != null) {
        const { affected_rows } = delete_scheduling_condition_tags;
        if (affected_rows !== ids.length) {
          throw Error('Some scheduling condition tags were not successfully created');
        }
        return affected_rows;
      } else {
        throw Error('Unable to delete scheduling condition tags');
      }
    } catch (e) {
      catchError('Delete Scheduling Condition Tags Failed', e as Error);
      showFailureToast('Delete Scheduling Condition Tags Failed');
      return null;
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

  async deleteSchedulingGoalTags(ids: Tag['id'][], user: User | null): Promise<number | null> {
    try {
      if (!queryPermissions.DELETE_SCHEDULING_GOAL_METADATA_TAGS(user)) {
        throwPermissionError('delete scheduling goal tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(gql.DELETE_SCHEDULING_GOAL_METADATA_TAGS, { ids }, user);
      const { delete_scheduling_goal_tags } = data;
      if (delete_scheduling_goal_tags != null) {
        const { affected_rows } = delete_scheduling_goal_tags;
        if (affected_rows !== ids.length) {
          throw Error('Some scheduling goal tags were not successfully created');
        }
        return affected_rows;
      } else {
        throw Error('Unable to delete scheduling goal tags');
      }
    } catch (e) {
      catchError('Delete Scheduling Goal Tags Failed', e as Error);
      showFailureToast('Delete Scheduling Goal Tags Failed');
      return null;
    }
  },

  // async deleteSchedulingSpecGoal(goal_id: number, specification_id: number, user: User | null): Promise<boolean> {
  //   try {
  //     if (!queryPermissions.DELETE_SCHEDULING_GOAL_PLAN_SPECIFICATION(user)) {
  //       throwPermissionError('delete this scheduling goal');
  //     }

  //     const data = await reqHasura<{ goal_id: number; specification_id: number }>(
  //       gql.DELETE_SCHEDULING_SPEC_GOAL,
  //       { goal_id, specification_id },
  //       user,
  //     );
  //     if (data.deleteSchedulingSpecGoal != null) {
  //       return true;
  //     } else {
  //       throw Error(`Unable to delete scheduling goal with ID: "${goal_id}"`);
  //     }
  //   } catch (e) {
  //     catchError('Scheduling Goal Delete Failed', e as Error);
  //     showFailureToast('Scheduling Goal Delete Failed');
  //     return false;
  //   }
  // },

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

      showSuccessToast('Tag Deleted Successfully');
      return true;
    } catch (e) {
      catchError('Delete Tag Failed', e as Error);
      showFailureToast('Delete Tag Failed');
      return false;
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

  async deleteUserSequence(sequence: UserSequence, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_USER_SEQUENCE(user, sequence)) {
        throwPermissionError('delete this user sequence');
      }

      const { confirm } = await showConfirmModal(
        'Delete',
        `Are you sure you want to delete "${sequence.name}"?`,
        'Delete User Sequence',
      );

      if (confirm) {
        const data = await reqHasura<{ id: number }>(gql.DELETE_USER_SEQUENCE, { id: sequence.id }, user);
        if (data.deleteUserSequence != null) {
          showSuccessToast('User Sequence Deleted Successfully');
          return true;
        } else {
          throw Error(`Unable to delete user sequence "${sequence.name}"`);
        }
      }

      return false;
    } catch (e) {
      catchError('User Sequence Delete Failed', e as Error);
      showFailureToast('User Sequence Delete Failed');
      return false;
    }
  },

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

  async expand(
    expansionSetId: number,
    simulationDatasetId: number,
    plan: Plan,
    model: Model,
    user: User | null,
  ): Promise<void> {
    try {
      planExpansionStatus.set(Status.Incomplete);

      if (!queryPermissions.EXPAND(user, plan, model)) {
        throwPermissionError('expand this plan');
      }

      const data = await reqHasura<{ id: number }>(gql.EXPAND, { expansionSetId, simulationDatasetId }, user);
      if (data.expand != null) {
        planExpansionStatus.set(Status.Complete);
        showSuccessToast('Plan Expanded Successfully');
      } else {
        throw Error('Unable to expand plan');
      }
    } catch (e) {
      catchError('Plan Expansion Failed', e as Error);
      planExpansionStatus.set(Status.Failed);
      showFailureToast('Plan Expansion Failed');
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
        return activityDirectiveRevisions;
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
        const { activity_types } = data;
        if (activity_types != null) {
          return activity_types;
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

  async getEffectiveActivityArguments(
    modelId: number,
    activityTypeName: string,
    argumentsMap: ArgumentsMap,
    user: User | null,
  ): Promise<EffectiveArguments | null> {
    try {
      const data = await reqHasura<EffectiveArguments>(
        gql.GET_EFFECTIVE_ACTIVITY_ARGUMENTS,
        {
          activityTypeName,
          arguments: argumentsMap,
          modelId,
        },
        user,
      );
      const { effectiveActivityArguments } = data;
      return effectiveActivityArguments;
    } catch (e) {
      catchError(e as Error);
      return null;
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
    simulated_activity_id: number,
    simulation_dataset_id: number,
    user: User | null,
  ): Promise<string | null> {
    try {
      const data = await reqHasura<SeqId>(
        gql.GET_EXPANSION_SEQUENCE_ID,
        {
          simulated_activity_id,
          simulation_dataset_id,
        },
        user,
      );
      const { expansionSequence } = data;

      if (expansionSequence) {
        const { seq_id } = expansionSequence;
        return seq_id;
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
      const data = await reqHasura<GetSeqJsonResponse>(
        gql.GET_EXPANSION_SEQUENCE_SEQ_JSON,
        {
          seqId,
          simulationDatasetId,
        },
        user,
      );
      const { getSequenceSeqJson } = data;
      if (getSequenceSeqJson != null) {
        const { errors, seqJson, status } = getSequenceSeqJson;

        if (status === 'FAILURE') {
          const [firstError] = errors;
          const { message } = firstError;
          return message;
        } else {
          return JSON.stringify(seqJson, null, 2);
        }
      } else {
        throw Error(`Unable to get expansion sequence seq json for seq ID "${seqId}"`);
      }
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async getExtensions(user: User | null): Promise<Extension[]> {
    try {
      const data = await reqHasura<Extension[]>(gql.GET_EXTENSIONS, {}, user);
      const { extensions = [] } = data;
      if (extensions != null) {
        return extensions;
      } else {
        throw Error('Unable to retrieve extensions');
      }
    } catch (e) {
      catchError(e as Error);
      return [];
    }
  },

  async getModels(user: User | null): Promise<ModelSlim[]> {
    try {
      const data = await reqHasura<ModelSlim[]>(gql.GET_MODELS, {}, user);
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

  async getParsedAmpcsCommandDictionary(
    commandDictionaryId: number | null | undefined,
    user: User | null,
  ): Promise<AmpcsCommandDictionary | null> {
    if (commandDictionaryId !== null && commandDictionaryId !== undefined) {
      try {
        const data = await reqHasura<[{ parsed_json: AmpcsCommandDictionary }]>(
          gql.GET_PARSED_COMMAND_DICTIONARY,
          { commandDictionaryId },
          user,
        );
        const { command_dictionary } = data;

        if (!Array.isArray(command_dictionary) || !command_dictionary.length) {
          catchError(`Unable to find command dictionary with id ${commandDictionaryId}`);
          return null;
        } else {
          const [{ parsed_json }] = command_dictionary;
          return parsed_json;
        }
      } catch (e) {
        catchError(e as Error);
        return null;
      }
    } else {
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

  async getPlanMergeConflictingActivities(
    merge_request_id: number,
    user: User | null,
  ): Promise<PlanMergeConflictingActivity[]> {
    try {
      const query = convertToQuery(gql.SUB_PLAN_MERGE_CONFLICTING_ACTIVITIES);
      const data = await reqHasura<PlanMergeConflictingActivity[]>(query, { merge_request_id }, user);
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
    merge_request_id: number,
    user: User | null,
  ): Promise<PlanMergeNonConflictingActivity[]> {
    try {
      const data = await reqHasura<PlanMergeNonConflictingActivity[]>(
        gql.GET_PLAN_MERGE_NON_CONFLICTING_ACTIVITIES,
        {
          merge_request_id,
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
      const { merge_requests } = data;
      if (merge_requests != null) {
        const [merge_request] = merge_requests; // Query uses 'limit: 1' so merge_requests.length === 1.
        return merge_request;
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
  ): Promise<ActivityDirective[] | null> {
    try {
      const data = await reqHasura<PlanSnapshotActivity[]>(
        gql.GET_PLAN_SNAPSHOT_ACTIVITY_DIRECTIVES,
        { planSnapshotId: snapshot.snapshot_id },
        user,
      );
      const { plan_snapshot_activity_directives: planSnapshotActivityDirectives } = data;

      if (planSnapshotActivityDirectives) {
        return planSnapshotActivityDirectives.map(({ snapshot_id: _snapshot_id, ...planSnapshotActivityDirective }) => {
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

  async getResourceTypes(model_id: number, user: User | null, limit: number | null = null): Promise<ResourceType[]> {
    try {
      const data = await reqHasura<ResourceType[]>(gql.GET_RESOURCE_TYPES, { limit, model_id }, user);
      const { resource_types } = data;
      if (resource_types != null) {
        return resource_types;
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
      const { plan_dataset: plan_datasets } = data;
      if (plan_datasets != null) {
        let resources: Resource[] = [];
        for (const dataset of plan_datasets) {
          const {
            dataset: { profiles },
            offset_from_plan_start,
          } = dataset;
          const sampledResources: Resource[] = sampleProfiles(profiles, startTimeYmd, offset_from_plan_start);
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
    condition_id: number | null,
    user: User | null,
  ): Promise<SchedulingConditionPlanSpecification[] | null> {
    if (condition_id !== null) {
      try {
        const data = await reqHasura<SchedulingConditionPlanSpecification[]>(
          gql.GET_SCHEDULING_SPEC_CONDITIONS_FOR_CONDITION,
          {
            condition_id,
          },
          user,
        );
        const { scheduling_specification_conditions } = data;
        return scheduling_specification_conditions;
      } catch (e) {
        catchError(e as Error);
        return null;
      }
    } else {
      return null;
    }
  },

  async getSchedulingSpecGoalsForGoal(
    goal_id: number | null,
    user: User | null,
  ): Promise<SchedulingGoalPlanSpecification[] | null> {
    if (goal_id !== null) {
      try {
        const data = await reqHasura<SchedulingGoalPlanSpecification[]>(
          gql.GET_SCHEDULING_SPEC_GOALS_FOR_GOAL,
          { goal_id },
          user,
        );
        const { scheduling_specification_goals } = data;
        return scheduling_specification_goals;
      } catch (e) {
        catchError(e as Error);
        return null;
      }
    } else {
      return null;
    }
  },

  async getSpans(datasetId: number, user: User | null, signal: AbortSignal | undefined = undefined): Promise<Span[]> {
    try {
      const data = await reqHasura<Span[]>(gql.GET_SPANS, { datasetId }, user, signal);
      const { span: spans } = data;
      if (spans != null) {
        return spans;
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

  async getTsFilesConstraints(model_id: number, user: User | null): Promise<TypeScriptFile[]> {
    if (model_id !== null && model_id !== undefined) {
      try {
        const data = await reqHasura<DslTypeScriptResponse>(gql.GET_TYPESCRIPT_CONSTRAINTS, { model_id }, user);
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

  async getTsFilesScheduling(model_id: number | null | undefined, user: User | null): Promise<TypeScriptFile[]> {
    if (model_id !== null && model_id !== undefined) {
      try {
        const data = await reqHasura<DslTypeScriptResponse>(gql.GET_TYPESCRIPT_SCHEDULING, { model_id }, user);
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

  async getView(
    query: URLSearchParams | null,
    user: User | null,
    activityTypes: ActivityType[] = [],
    resourceTypes: ResourceType[] = [],
  ): Promise<View | null> {
    try {
      if (query !== null) {
        const viewIdAsNumber = getSearchParameterNumber(SearchParameters.VIEW_ID, query);

        if (viewIdAsNumber !== null) {
          const data = await reqHasura<View>(gql.GET_VIEW, { id: viewIdAsNumber }, user);
          const { view } = data;

          if (view !== null) {
            return view;
          }
        }
      }
      return generateDefaultView(activityTypes, resourceTypes);
    } catch (e) {
      catchError(e as Error);
      return null;
    }
  },

  async initialSimulationUpdate(
    plan_id: number,
    simulation_template_id: number | null = null,
    simulation_start_time: string | null = null,
    simulation_end_time: string | null = null,
    user: User | null,
  ): Promise<boolean> {
    try {
      if (!queryPermissions.INITIAL_SIMULATION_UPDATE(user)) {
        throwPermissionError('update a simulation');
      }

      const simulationInput: SimulationInitialUpdateInput = {
        arguments: {} as ArgumentsMap,
        simulation_end_time,
        simulation_start_time,
        simulation_template_id,
      };
      const data = await reqHasura<{ returning: { id: number }[] }>(
        gql.INITIAL_SIMULATION_UPDATE,
        { plan_id: plan_id, simulation: simulationInput },
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

  async insertExpansionSequenceToActivity(
    simulation_dataset_id: number,
    simulated_activity_id: number,
    seq_id: string,
    user: User | null,
  ): Promise<string | null> {
    try {
      if (!queryPermissions.INSERT_EXPANSION_SEQUENCE_TO_ACTIVITY(user)) {
        throwPermissionError('add an expansion sequence to an activity');
      }

      const input: ExpansionSequenceToActivityInsertInput = { seq_id, simulated_activity_id, simulation_dataset_id };
      const data = await reqHasura<{ seq_id: string }>(gql.INSERT_EXPANSION_SEQUENCE_TO_ACTIVITY, { input }, user);
      const { sequence } = data;

      if (sequence != null) {
        showSuccessToast('Expansion Sequence Added To Activity Successfully');
        const { seq_id } = sequence;
        return seq_id;
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
      const { errors, valid } = await effects.validateViewJSON(viewJSON);

      if (valid) {
        return { definition: viewJSON };
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

  async planMergeBegin(
    merge_request_id: number,
    sourcePlan: PlanForMerging,
    targetPlan: PlanForMerging,
    user: User | null,
  ): Promise<boolean> {
    try {
      if (!queryPermissions.PLAN_MERGE_BEGIN(user, sourcePlan, targetPlan, sourcePlan.model)) {
        throwPermissionError('begin a merge');
      }

      const data = await reqHasura<{ merge_request_id: number }>(gql.PLAN_MERGE_BEGIN, { merge_request_id }, user);
      if (data.begin_merge != null) {
        return true;
      } else {
        throw Error('Unable to begin plan merge');
      }
    } catch (error) {
      showFailureToast('Begin Merge Failed');
      catchError('Begin Merge Failed', error as Error);
      return false;
    }
  },

  async planMergeCancel(
    merge_request_id: number,
    sourcePlan: PlanForMerging,
    targetPlan: PlanForMerging,
    user: User | null,
  ): Promise<boolean> {
    try {
      if (!queryPermissions.PLAN_MERGE_CANCEL(user, sourcePlan, targetPlan, sourcePlan.model)) {
        throwPermissionError('cancel this merge request');
      }

      const data = await reqHasura<{ merge_request_id: number }>(gql.PLAN_MERGE_CANCEL, { merge_request_id }, user);
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
    merge_request_id: number,
    sourcePlan: PlanForMerging,
    targetPlan: PlanForMerging,
    user: User | null,
  ): Promise<boolean> {
    try {
      if (!queryPermissions.PLAN_MERGE_COMMIT(user, sourcePlan, targetPlan, sourcePlan.model)) {
        throwPermissionError('approve this merge request');
      }

      const data = await reqHasura<{ merge_request_id: number }>(gql.PLAN_MERGE_COMMIT, { merge_request_id }, user);
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
    merge_request_id: number,
    sourcePlan: PlanForMerging,
    targetPlan: PlanForMerging,
    user: User | null,
  ): Promise<boolean> {
    try {
      if (!queryPermissions.PLAN_MERGE_DENY(user, sourcePlan, targetPlan, sourcePlan.model)) {
        throwPermissionError('deny this merge request');
      }

      const data = await reqHasura<{ merge_request_id: number }>(gql.PLAN_MERGE_DENY, { merge_request_id }, user);
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
    merge_request_id: number,
    sourcePlan: PlanForMerging,
    targetPlan: PlanForMerging,
    user: User | null,
  ): Promise<boolean> {
    try {
      if (!queryPermissions.PLAN_MERGE_REQUEST_WITHDRAW(user, sourcePlan, targetPlan, sourcePlan.model)) {
        throwPermissionError('withdraw this merge request');
      }

      const data = await reqHasura<{ merge_request_id: number }>(
        gql.PLAN_MERGE_REQUEST_WITHDRAW,
        { merge_request_id },
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
    merge_request_id: number,
    resolution: PlanMergeResolution,
    sourcePlan: PlanForMerging,
    targetPlan: PlanForMerging,
    user: User | null,
  ): Promise<void> {
    try {
      if (!queryPermissions.PLAN_MERGE_RESOLVE_ALL_CONFLICTS(user, sourcePlan, targetPlan, sourcePlan.model)) {
        throwPermissionError('resolve merge request conflicts');
      }

      const data = await reqHasura(gql.PLAN_MERGE_RESOLVE_ALL_CONFLICTS, { merge_request_id, resolution }, user);
      if (data.set_resolution_bulk == null) {
        throw Error('Unable to resolve all merge request conflicts');
      }
    } catch (e) {
      showFailureToast('Resolve All Merge Request Conflicts Failed');
      catchError('Resolve All Merge Request Conflicts Failed', e as Error);
    }
  },

  async planMergeResolveConflict(
    merge_request_id: number,
    activity_id: ActivityDirectiveId,
    resolution: PlanMergeResolution,
    sourcePlan: PlanForMerging,
    targetPlan: PlanForMerging,
    user: User | null,
  ): Promise<void> {
    try {
      if (!queryPermissions.PLAN_MERGE_RESOLVE_CONFLICT(user, sourcePlan, targetPlan, sourcePlan.model)) {
        throwPermissionError('resolve merge request conflicts');
      }

      const data = await reqHasura(
        gql.PLAN_MERGE_RESOLVE_CONFLICT,
        { activity_id, merge_request_id, resolution },
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
    activity_directive_id: ActivityDirectiveId,
    preset_id: ActivityPresetId,
    user: User | null,
  ): Promise<boolean> {
    try {
      if (!queryPermissions.DELETE_PRESET_TO_DIRECTIVE(user, plan)) {
        throwPermissionError('remove the preset from this activity directive');
      }

      const data = await reqHasura<{ preset_id: number }>(
        gql.DELETE_PRESET_TO_DIRECTIVE,
        { activity_directive_id, plan_id: plan.id, preset_id },
        user,
      );
      if (data.delete_preset_to_directive_by_pk != null) {
        showSuccessToast('Removed Activity Preset Successfully');
        return true;
      } else {
        throw Error(
          `Unable to remove activity preset with ID: "${preset_id}" from directive with ID: "${activity_directive_id}"`,
        );
      }
    } catch (e) {
      catchError('Activity Preset Removal Failed', e as Error);
      showFailureToast('Activity Preset Removal Failed');
      return false;
    }
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

      const { confirm, value } = await showRestorePlanSnapshotModal(snapshot, get(activityDirectives).length, user);

      if (confirm) {
        if (value && value.shouldCreateSnapshot) {
          const { description, name, snapshot, tags } = value;

          await effects.createPlanSnapshotHelper(snapshot.plan_id, name, description, tags, user);
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

  async schedule(analysis_only: boolean = false, plan: Plan | null, user: User | null): Promise<void> {
    try {
      if (plan) {
        if (
          !queryPermissions.UPDATE_SCHEDULING_PLAN_SPECIFICATIONS(user, plan) ||
          !queryPermissions.SCHEDULE(user, plan, plan.model)
        ) {
          throwPermissionError(`run ${analysis_only ? 'scheduling analysis' : 'scheduling'}`);
        }

        const specificationId = get(selectedSpecId);
        if (plan !== null && specificationId !== null) {
          const plan_revision = await effects.getPlanRevision(plan.id, user);
          if (plan_revision !== null) {
            await effects.updateSchedulingSpec(specificationId, { analysis_only, plan_revision }, plan, user);
          } else {
            throw Error(`Plan revision for plan ${plan.id} was not found.`);
          }

          const data = await reqHasura<SchedulingResponse>(gql.SCHEDULE, { specificationId }, user);
          const { schedule } = data;
          if (schedule) {
            const { reason, analysisId } = schedule;
            if (reason) {
              catchSchedulingError(reason);
              showFailureToast(`Scheduling ${analysis_only ? 'Analysis ' : ''}Failed`);
              return;
            }

            const unsubscribe = schedulingRequests.subscribe(async (requests: SchedulingRequest[]) => {
              const matchingRequest = requests.find(request => request.analysis_id === analysisId);
              if (matchingRequest) {
                if (matchingRequest.canceled) {
                  unsubscribe();
                } else if (matchingRequest.status === 'success') {
                  // If a new simulation was run during scheduling, the response will include a datasetId
                  // which will need to be cross referenced with a simulation_dataset.id so we
                  // can load that new simulation. Load the associated sim dataset if it is not already loaded
                  const currentSimulationDataset = get(simulationDataset);
                  if (
                    typeof matchingRequest.dataset_id === 'number' &&
                    (!currentSimulationDataset || matchingRequest.dataset_id !== currentSimulationDataset.dataset_id)
                  ) {
                    const simDatasetIdData = await reqHasura<{ id: number }>(
                      gql.GET_SIMULATION_DATASET_ID,
                      { datasetId: matchingRequest.dataset_id },
                      user,
                    );
                    const { simulation_dataset } = simDatasetIdData;
                    // the request above will return either 0 or 1 element
                    if (Array.isArray(simulation_dataset) && simulation_dataset.length > 0) {
                      simulationDatasetId.set(simulation_dataset[0].id);
                    }
                  }
                  showSuccessToast(`Scheduling ${analysis_only ? 'Analysis ' : ''}Complete`);
                  unsubscribe();
                } else if (matchingRequest.status === 'failed') {
                  if (matchingRequest.reason) {
                    catchSchedulingError(matchingRequest.reason);
                  }
                  showFailureToast(`Scheduling ${analysis_only ? 'Analysis ' : ''}Failed`);
                  unsubscribe();
                }
              }
            });
            const planIdUnsubscribe = planId.subscribe(currentPlanId => {
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
        const data = await reqHasura<SimulateResponse>(gql.SIMULATE, { force, planId: plan.id }, user);
        const { simulate } = data;
        if (simulate != null) {
          const { simulationDatasetId: newSimulationDatasetId } = simulate;
          simulationDatasetId.set(newSimulationDatasetId);
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

  async updateActivityDirective(
    plan: Plan,
    id: ActivityDirectiveId,
    partialActivityDirective: Partial<ActivityDirective>,
    activityType: ActivityType | null,
    user: User | null,
    newFiles: File[] = [],
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

      const data = await reqHasura<ActivityDirective>(
        gql.UPDATE_ACTIVITY_DIRECTIVE,
        {
          activityDirectiveSetInput,
          id,
          plan_id: plan.id,
        },
        user,
      );

      if (data.update_activity_directive_by_pk) {
        const { update_activity_directive_by_pk: updatedDirective } = data;
        activityDirectivesMap.update((currentActivityDirectivesMap: ActivityDirectivesMap) => ({
          ...currentActivityDirectivesMap,
          [id]: updatedDirective,
        }));
        showSuccessToast('Activity Directive Updated Successfully');
      } else {
        throw Error(`Unable to update directive with ID: "${id}"`);
      }
    } catch (e) {
      catchError('Activity Directive Update Failed', e as Error);
      showFailureToast('Activity Directive Update Failed');
    }
  },

  async updateActivityPreset(updatedActivityPreset: ActivityPresetSetInput, user: User | null): Promise<void> {
    try {
      if (!queryPermissions.UPDATE_ACTIVITY_PRESET(user, updatedActivityPreset)) {
        throwPermissionError('update this activity preset');
      }

      const { id, ...restOfPresetPayload } = updatedActivityPreset;
      const { update_activity_presets_by_pk } = await reqHasura<ActivityPreset>(
        gql.UPDATE_ACTIVITY_PRESET,
        {
          activityPresetSetInput: restOfPresetPayload,
          id,
        },
        user,
      );

      if (update_activity_presets_by_pk != null) {
        const { name: presetName } = update_activity_presets_by_pk;
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
    tags: ConstraintDefinitionTagsInsertInput[],
    tagIdsToDelete: number[],
    user: User | null,
  ): Promise<number | null> {
    try {
      if (!queryPermissions.UPDATE_CONSTRAINT_DEFINITION_TAGS(user)) {
        throwPermissionError('create constraint definition tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(
        gql.UPDATE_CONSTRAINT_DEFINITION_TAGS,
        { constraintId, constraintRevision, tagIdsToDelete, tags },
        user,
      );
      const { deleteConstraintDefinitionTags, insertConstraintDefinitionTags } = data;
      if (insertConstraintDefinitionTags != null && deleteConstraintDefinitionTags != null) {
        const { affected_rows } = insertConstraintDefinitionTags;

        showSuccessToast('Constraint Updated Successfully');

        return affected_rows;
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

  async updateConstraintPlanSpecification(
    plan: Plan,
    constraintPlanSpecification: Omit<ConstraintPlanSpec, 'constraint_metadata'>,
    user: User | null,
  ) {
    try {
      if (!queryPermissions.UPDATE_CONSTRAINT_PLAN_SPECIFICATIONS(user, plan)) {
        throwPermissionError('update this constraint plan specification');
      }
      const { enabled, constraint_id: constraintId, constraint_revision: revision } = constraintPlanSpecification;

      const { updateConstraintPlanSpecification } = await reqHasura(
        gql.UPDATE_CONSTRAINT_PLAN_SPECIFICATION,
        { enabled, id: constraintId, planId: plan.id, revision },
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
    constraintSpecsToUpdate: ConstraintPlanSpecInsertInput[],
    constraintSpecIdsToDelete: number[],
    user: User | null,
  ) {
    try {
      if (!queryPermissions.UPDATE_CONSTRAINT_PLAN_SPECIFICATIONS(user, plan)) {
        throwPermissionError('update this constraint plan specification');
      }

      const { deleteConstraintPlanSpecifications, updateConstraintPlanSpecifications } = await reqHasura(
        gql.UPDATE_CONSTRAINT_PLAN_SPECIFICATIONS,
        { constraintSpecIdsToDelete, constraintSpecsToUpdate, planId: plan.id },
        user,
      );

      if (updateConstraintPlanSpecifications !== null || deleteConstraintPlanSpecifications !== null) {
        showSuccessToast(`Constraint Plan Specifications Updated Successfully`);
      } else {
        throw Error('Unable to update the constraint specifications for the plan');
      }
    } catch (e) {
      catchError('Constraint Plan Specifications Update Failed', e as Error);
      showFailureToast('Constraint Plan Specifications Update Failed');
    }
  },

  async updateExpansionRule(id: number, rule: ExpansionRuleSetInput, user: User | null): Promise<string | null> {
    try {
      savingExpansionRule.set(true);
      createExpansionRuleError.set(null);

      if (!queryPermissions.UPDATE_EXPANSION_RULE(user, rule)) {
        throwPermissionError('update this expansion rule');
      }

      const data = await reqHasura(gql.UPDATE_EXPANSION_RULE, { id, rule }, user);
      const { updateExpansionRule } = data;
      if (updateExpansionRule != null) {
        const { updated_at } = updateExpansionRule;
        showSuccessToast('Expansion Rule Updated Successfully');
        savingExpansionRule.set(false);
        return updated_at;
      } else {
        throw Error(`Unable to update expansion rule with ID: "${id}"`);
      }
    } catch (e) {
      catchError('Expansion Rule Update Failed', e as Error);
      showFailureToast('Expansion Rule Update Failed');
      savingExpansionRule.set(false);
      createExpansionRuleError.set((e as Error).message);
      return null;
    }
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
    tags: SchedulingConditionDefinitionTagsInsertInput[],
    tagIdsToDelete: number[],
    user: User | null,
  ): Promise<number | null> {
    try {
      if (!queryPermissions.UPDATE_SCHEDULING_CONDITION_DEFINITION_TAGS(user)) {
        throwPermissionError('create scheduling condition definition tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(
        gql.UPDATE_SCHEDULING_CONDITION_DEFINITION_TAGS,
        { conditionId, conditionRevision, tagIdsToDelete, tags },
        user,
      );
      const { deleteSchedulingConditionDefinitionTags, insertSchedulingConditionDefinitionTags } = data;
      if (insertSchedulingConditionDefinitionTags != null && deleteSchedulingConditionDefinitionTags != null) {
        const { affected_rows } = insertSchedulingConditionDefinitionTags;

        showSuccessToast('Scheduling Condition Updated Successfully');

        return affected_rows;
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
    tags: SchedulingGoalDefinitionTagsInsertInput[],
    tagIdsToDelete: number[],
    user: User | null,
  ): Promise<number | null> {
    try {
      if (!queryPermissions.UPDATE_SCHEDULING_GOAL_DEFINITION_TAGS(user)) {
        throwPermissionError('create scheduling condition definition tags');
      }

      const data = await reqHasura<{ affected_rows: number }>(
        gql.UPDATE_SCHEDULING_GOAL_DEFINITION_TAGS,
        { goalId, goalRevision, tagIdsToDelete, tags },
        user,
      );
      const { deleteSchedulingGoalDefinitionTags, insertSchedulingGoalDefinitionTags } = data;
      if (insertSchedulingGoalDefinitionTags != null && deleteSchedulingGoalDefinitionTags != null) {
        const { affected_rows } = insertSchedulingGoalDefinitionTags;

        showSuccessToast('Scheduling Goal Updated Successfully');

        return affected_rows;
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

  async updateSchedulingGoalPlanSpecification(
    plan: Plan,
    schedulingSpecificationId: number,
    schedulingGoalPlanSpecification: SchedulingGoalPlanSpecInsertInput,
    user: User | null,
  ) {
    try {
      if (!queryPermissions.UPDATE_SCHEDULING_GOAL_PLAN_SPECIFICATION(user, plan)) {
        throwPermissionError('update this scheduling goal plan specification');
      }
      const {
        enabled,
        goal_id: goalId,
        goal_revision: revision,
        priority,
        simulate_after: simulateAfter,
      } = schedulingGoalPlanSpecification;

      const { updateSchedulingGoalPlanSpecification } = await reqHasura(
        gql.UPDATE_SCHEDULING_GOAL_PLAN_SPECIFICATION,
        { enabled, id: goalId, priority, revision, simulateAfter, specificationId: schedulingSpecificationId },
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
    schedulingSpecificationId: number,
    goalSpecsToUpdate: SchedulingGoalPlanSpecInsertInput[],
    goalSpecIdsToDelete: number[],
    user: User | null,
  ) {
    try {
      if (!queryPermissions.UPDATE_SCHEDULING_GOAL_PLAN_SPECIFICATIONS(user, plan)) {
        throwPermissionError('update this scheduling goal plan specification');
      }
      const { deleteConstraintPlanSpecifications, updateSchedulingGoalPlanSpecifications } = await reqHasura(
        gql.UPDATE_SCHEDULING_GOAL_PLAN_SPECIFICATIONS,
        {
          goalSpecIdsToDelete,
          goalSpecsToUpdate,
          specificationId: schedulingSpecificationId,
        },
        user,
      );

      if (updateSchedulingGoalPlanSpecifications !== null || deleteConstraintPlanSpecifications !== null) {
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
      if (!queryPermissions.UPDATE_SCHEDULING_PLAN_SPECIFICATIONS(user, plan)) {
        throwPermissionError('update this scheduling spec');
      }

      const data = await reqHasura(gql.UPDATE_SCHEDULING_SPEC, { id, spec }, user);
      if (data.updateSchedulingSpec == null) {
        throw Error(`Unable to update scheduling spec with ID: "${id}"`);
      }
    } catch (e) {
      catchError(e as Error);
    }
  },

  // async updateSchedulingSpecGoal(
  //   goal_id: number,
  //   specification_id: number,
  //   spec_goal: Partial<SchedulingGoalPlanSpecification>,
  //   plan: Plan,
  //   user: User | null,
  // ): Promise<void> {
  //   try {
  //     if (!queryPermissions.UPDATE_SCHEDULING_SPEC_GOAL(user, plan)) {
  //       throwPermissionError('update this scheduling spec goal');
  //     }

  //     const data = await reqHasura(gql.UPDATE_SCHEDULING_SPEC_GOAL, { goal_id, spec_goal, specification_id }, user);
  //     if (data.updateSchedulingSpecGoal != null) {
  //       showSuccessToast('Scheduling Spec Goal Updated Successfully');
  //     } else {
  //       throw Error(`Unable to update scheduling spec goal with ID: "${goal_id}"`);
  //     }
  //   } catch (e) {
  //     catchError('Scheduling Spec Goal Update Failed', e as Error);
  //     showFailureToast('Scheduling Spec Goal Update Failed');
  //   }
  // },

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

      const { update_simulation_template_by_pk } = await reqHasura<SimulationTemplate>(
        gql.UPDATE_SIMULATION_TEMPLATE,
        {
          id,
          simulationTemplateSetInput,
        },
        user,
      );

      if (update_simulation_template_by_pk != null) {
        const { description: templateDescription } = update_simulation_template_by_pk;
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
      createTagError.set(null);
      if (!queryPermissions.UPDATE_TAG(user, tagSetInput)) {
        throwPermissionError('update tag');
      }
      const data = await reqHasura<Tag>(gql.UPDATE_TAG, { id, tagSetInput }, user);
      const { update_tags_by_pk: updatedTag } = data;
      if (notify) {
        showSuccessToast('Tag Updated Successfully');
      }
      createTagError.set(null);
      return updatedTag;
    } catch (e) {
      createTagError.set((e as Error).message);
      catchError('Update Tags Failed', e as Error);
      showFailureToast('Update Tags Failed');
      return null;
    }
  },

  async updateUserSequence(
    id: number,
    sequence: Partial<UserSequence>,
    sequenceOwner: UserId,
    user: User | null,
  ): Promise<string | null> {
    try {
      if (!queryPermissions.UPDATE_USER_SEQUENCE(user, { owner: sequenceOwner })) {
        throwPermissionError('update this user sequence');
      }

      const data = await reqHasura<Pick<UserSequence, 'id' | 'updated_at'>>(
        gql.UPDATE_USER_SEQUENCE,
        { id, sequence },
        user,
      );
      const { updateUserSequence } = data;
      if (updateUserSequence != null) {
        const { updated_at } = updateUserSequence;
        showSuccessToast('User Sequence Updated Successfully');
        return updated_at;
      } else {
        throw Error(`Unable to update user sequence with ID: "${id}"`);
      }
    } catch (e) {
      catchError('User Sequence Update Failed', e as Error);
      showFailureToast('User Sequence Update Failed');
      return null;
    }
  },

  async updateView(id: number, view: Partial<View>, user: User | null): Promise<boolean> {
    try {
      if (!queryPermissions.UPDATE_VIEW(user, { owner: view.owner ?? null })) {
        throwPermissionError('update this view');
      }

      const data = await reqHasura<Pick<View, 'id'>>(gql.UPDATE_VIEW, { id, view }, user);
      if (data.updatedView) {
        showSuccessToast('View Updated Successfully');
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
        const response = (await reqHasura<[{ name: string }]>(gql.GET_UPLOADED_FILENAME, { id }, user))[
          'uploaded_file'
        ];
        if (response !== null) {
          generatedFilenames[newFile.name] = `${env.PUBLIC_AERIE_FILE_STORE_PREFIX}${response[0]['name']}`;
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
          view.update(() => newView);
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
  modelParameters: ParametersMap | null,
  simArgs: ArgumentsMap,
  pathsToReplace: Record<string, string>,
): ArgumentsMap {
  if (modelParameters === null) {
    return simArgs;
  }
  const result: ArgumentsMap = {};
  for (const parameterName in modelParameters) {
    const parameter: Parameter = modelParameters[parameterName];
    const arg: Argument = simArgs[parameterName];
    if (arg !== undefined) {
      result[parameterName] = replacePathsHelper(parameter.schema, arg, pathsToReplace);
    }
  }
  return result;
}

function replacePathsHelper(schema: ValueSchema, arg: Argument, pathsToReplace: Record<string, string>) {
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
