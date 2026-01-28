import type { Readable } from 'svelte/motion';
import { derived, writable, type Writable } from 'svelte/store';
import type { Tag, TagsMap } from '../types/tags';
import gql from '../utilities/gql';
import { gqlSubscribable } from './subscribable';

/* Writeable. */

export const createTagError: Writable<string | null> = writable(null);
/* Subscriptions. */

export const tagsStore = gqlSubscribable<Tag[] | null>(gql.SUB_TAGS, {}, null, null);

/* Derived. */
export const tags: Readable<Tag[]> = derived([tagsStore], ([$tags]) => $tags ?? []);

export const tagsMap: Readable<TagsMap> = derived([tags], ([$tags]) =>
  ($tags ?? []).reduce((map: TagsMap, tag) => {
    map[tag.id] = tag;
    return map;
  }, {}),
);
