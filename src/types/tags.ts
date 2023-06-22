export type ActivityDirectiveTagsInsertInput = {
  directive_id: number;
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

export type TagsInsertInput = Pick<Tag, 'color' | 'name'>;
