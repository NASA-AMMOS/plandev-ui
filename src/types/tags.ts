import type { UserId } from './app';
import type { PlanSlimmer } from './plan';

export type ActivityDirectiveTagsInsertInput = {
  directive_id: number;
  plan_id: number;
  tag_id: number;
};

export type ConstraintTagsInsertInput = {
  tag_id: number;
};

export type ConstraintMetadataTagsInsertInput = {
  constraint_id: number;
  tag_id: number;
};

export type ConstraintDefinitionTagsInsertInput = {
  constraint_id: number;
  constraint_revision: number;
  tag_id: number;
};

export type SchedulingConditionMetadataTagsInsertInput = {
  condition_id: number;
  tag_id: number;
};

export type SchedulingConditionDefinitionTagsInsertInput = {
  condition_id: number;
  condition_revision: number;
  tag_id: number;
};

export type SchedulingGoalMetadataTagsInsertInput = {
  goal_id: number;
  tag_id: number;
};

export type SchedulingGoalDefinitionTagsInsertInput = {
  goal_id: number;
  goal_revision: number;
  tag_id: number;
};

export type ExpansionRuleTagsInsertInput = {
  rule_id: number;
  tag_id: number;
};

export type SchedulingTagsInsertInput = {
  tag_id: number;
};

export type SchedulingGoalTagsInsertInput = {
  goal_id: number;
  tag_id: number;
};

export type PlanTagsInsertInput = {
  plan_id: number;
  tag_id: number;
};

export type PlanSnapshotTagsInsertInput = {
  snapshot_id: number;
  tag_id: number;
};

export type Tag = {
  color: string | null;
  created_at: string;
  id: number;
  name: string;
  owner: UserId;
};

export type PlanCollaboratorTag = Tag & { plan?: PlanSlimmer };

export type TagsMap = Record<Tag['id'], Tag>;

export type TagsInsertInput = Pick<Tag, 'color' | 'name'>;

export type TagsSetInput = Pick<Tag, 'color' | 'name' | 'owner'>;

export type TagChangeType = 'select' | 'create' | 'remove';

export type TagsChangeEvent = CustomEvent<{ tag: Tag; type: TagChangeType }>;
