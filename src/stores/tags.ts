import type { Tag } from '../types/tags';
import gql from '../utilities/gql';
import { gqlSubscribable } from './subscribable';

/* Subscriptions. */

export const tags = gqlSubscribable<Tag[]>(gql.SUB_TAGS, {}, [], null);
