import type { BaseDefinition, BaseMetadata } from '../types/metadata';
import type { Plan } from '../types/plan';
import type { SchedulingMetadataResponse } from '../types/scheduling';
import type { Tag } from '../types/tags';

export function convertResponseToMetadata<M, D>(schedulingResponse: SchedulingMetadataResponse<M, D>, tags: Tag[]): M {
  const schedulingMetadata: M = {
    ...schedulingResponse,
    ...(schedulingResponse.plans_using
      ? ({
          plans_using: schedulingResponse.plans_using.reduce((plansUsing: Pick<Plan, 'id'>[], planUsing) => {
            if (planUsing.specification) {
              return [
                ...plansUsing,
                {
                  id: planUsing.specification.plan_id,
                },
              ];
            }

            return plansUsing;
          }, []),
        } as Pick<BaseMetadata<BaseDefinition>, 'plans_using'>)
      : { plans_using: [] }),
    tags: schedulingResponse.tags.reduce((finalTags: { tag: Tag }[], { tag_id }) => {
      const tag = tags.find(tag => tag.id === tag_id);
      if (tag) {
        return [...finalTags, { tag }];
      }
      return finalTags;
    }, []),
    versions: schedulingResponse.versions.map(schedulingRevision => ({
      ...schedulingRevision,
      tags: schedulingRevision.tags.reduce((finalTags: { tag: Tag }[], { tag_id }) => {
        const tag = tags.find(tag => tag.id === tag_id);
        if (tag) {
          return [...finalTags, { tag }];
        }
        return finalTags;
      }, []),
    })),
  } as M;

  return schedulingMetadata;
}
