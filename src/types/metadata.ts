import type { UserId } from './app';
import type { Model } from './model';
import type { Plan } from './plan';
import type { Tag } from './tags';

export type BaseDefinition = {
  author: UserId;
  created_at: string;
  definition: string;
  metadata: BaseMetadata<BaseDefinition>;
  models_using: Pick<Model, 'id'>[];
  plans_using: Pick<Plan, 'id'>[];
  revision: number;
  tags: { tag: Tag }[];
};

export type BaseMetadataVersionDefinition = Pick<BaseDefinition, 'author' | 'definition' | 'revision' | 'tags'>;

export type BaseMetadata<D> = {
  created_at: string;
  description?: string;
  id: number;
  models_using: Pick<Model, 'id'>[];
  name: string;
  owner: UserId;
  plans_using: Pick<Plan, 'id'>[];
  public: boolean;
  tags: { tag: Tag }[];
  updated_at: string;
  updated_by: UserId;
  versions: D[];
};

export type BaseMetadataSlim<D> = Omit<BaseMetadata<D>, 'models_using' | 'plans_using' | 'versions'>;
