import type { ActivityDeletionAction } from '../utilities/activities';
import type { ActivityMetadata } from './activity-metadata';
import type { ExpansionRule } from './expansion';
import type { ArgumentsMap, ParametersMap } from './parameter';
import type { ValueSchema } from './schema';

export type ActivityDirectivesByView = {
  byLayerId: Record<number, ActivityDirective[]>;
  byTimelineId: Record<number, ActivityDirective[]>;
};

export type ActivityType = {
  computed_attributes_value_schema: ValueSchema;
  name: string;
  parameters: ParametersMap;
  required_parameters: string[];
};

export type ActivityTypeExpansionRules = {
  expansion_rules: ExpansionRule[];
  name: ActivityType['name'];
};

export type ActivityDirectiveId = number;
export type ActivityPresetId = number;

export type ActivityDirectivesMap = Record<ActivityDirectiveId, ActivityDirective>;
export type AnchoredActivityDirectivesMap = Record<ActivityDirectiveId, ActivityDirective[]>;

export type ActivityDirectiveDeletionMap = Record<ActivityDirectiveId, ActivityDeletionAction>;

export type ActivityDirective = {
  anchor_id: number | null;
  anchor_validations?: AnchorValidationStatus;
  anchored_to_start: boolean;
  applied_preset?: AppliedPreset | null;
  arguments: ArgumentsMap;
  created_at: string;
  id: ActivityDirectiveId;
  last_modified_arguments_at: string;
  last_modified_at: string;
  metadata: ActivityMetadata;
  name: string;
  plan_id: number;
  source_scheduling_goal_id: number;
  start_offset: string;
  tags: string[];
  type: string;
};

export type ActivityDirectiveInsertInput = {
  anchor_id: number | null;
  anchored_to_start: boolean;
  arguments: ArgumentsMap;
  metadata: ActivityMetadata;
  name: string;
  plan_id: number;
  start_offset: string;
  tags: string; // Hasura does not accept arrays so this must be in the form of "{1,2,3,...,n}"
  type: string;
};

export type ActivityDirectiveSetInput = Partial<ActivityDirectiveInsertInput>;

export type AppliedPreset = {
  activity_id: ActivityDirectiveId;
  plan_id: number;
  preset_id: ActivityPresetId;
  presets_applied: ActivityPreset;
};

export type ActivityPreset = {
  arguments: ArgumentsMap;
  associated_activity_type: string;
  id: ActivityPresetId;
  model_id: number;
  name: string;
};

export type ActivityPresetInsertInput = {
  arguments: ArgumentsMap;
  associated_activity_type: string;
  model_id: number;
  name: string;
};

export type ActivityPresetSetInput = Partial<ActivityPresetInsertInput>;

export type AnchorValidationStatus = {
  activity_id: ActivityDirectiveId;
  plan_id: number;
  reason_invalid: string;
};
