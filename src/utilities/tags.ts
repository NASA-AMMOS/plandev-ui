import type { Tag } from '../types/tags';

/**
 * Returns true if the IDs of tagsA match the order and IDs of tagsB.
 */
export function diffTags(tagsA: Tag[], tagsB: Tag[]): boolean {
  return (
    tagsA
      .map(tag => tag.id)
      .sort()
      .join() !==
    tagsB
      .map(tag => tag.id)
      .sort()
      .join()
  );
}
