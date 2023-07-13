export type ActivityDirectiveTagsInsertInput = {
  directive_id: number;
  plan_id: number;
  tag_id: number;
};

export type ConstraintTagsInsertInput = {
  constraint_id: number;
  tag_id: number;
};

export type ExpansionRuleTagsInsertInput = {
  rule_id: number;
  tag_id: number;
};

export type PlanTagsInsertInput = {
  plan_id: number;
  tag_id: number;
};

export type Tag = {
  color: string;
  created_at: string;
  id: number;
  name: string;
  owner: string;
};

export type TagsMap = Record<Tag['id'], Tag>;

export type TagsInsertInput = Pick<Tag, 'color' | 'name'>;

export type TagsChangeEvent = CustomEvent<{ tag: Tag; type: 'select' | 'create' | 'remove' }>;
