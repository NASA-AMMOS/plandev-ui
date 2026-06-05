import type { Tag } from '../types/tags';

/**
 * Returns true if tagsA and tagsB do not contain the same tag IDs.
 */
export function diffTags(tagsA: Tag[], tagsB: Tag[]): boolean {
  if (tagsA.length !== tagsB.length) {
    return true;
  }

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
