import { derived, writable, type Readable, type Writable } from 'svelte/store';
import type { Parcel } from '../types/sequencing';
import type { Workspace } from '../types/workspace';
import gql from '../utilities/gql';
import { gqlSubscribable } from './subscribable';

/* Writable */
export const workspaceColumns: Writable<string> = writable('1fr 3px 3fr');

export const workspaceId: Writable<number> = writable(-1);

/* Subscriptions. */
export const parcels = gqlSubscribable<Parcel[]>(gql.SUB_PARCELS, {}, [], null);
export const workspaces = gqlSubscribable<Workspace[]>(gql.SUB_WORKSPACES, {}, [], null);

/* Derived. */
export const workspace: Readable<Workspace | undefined> = derived(
  [workspaceId, workspaces],
  ([$workspaceId, $workspaces]) => {
    return $workspaces.find(({ id }) => $workspaceId === id);
  },
);

export const parcel: Readable<Parcel | undefined> = derived([workspace, parcels], ([$workspace, $parcels]) => {
  if ($workspace) {
    return $parcels.find(({ id }) => $workspace.parcel_id === id);
  }
});
