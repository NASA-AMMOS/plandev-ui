import { derived, writable, type Readable, type Writable } from 'svelte/store';
import type { Parcel } from '../types/sequencing';
import type { Workspace } from '../types/workspace';

/* Writable */
export const workspaceColumns: Writable<string> = writable('1fr 3px 3fr');

export const workspaceId: Writable<string> = writable('');

/* Derived. */

/* Subscriptions. */
export const workspace: Readable<Workspace> = derived([workspaceId], ([$workspaceId]) => {
  return {
    created_at: '',
    disk_location: 'Foo',
    id: $workspaceId,
    name: 'Foo',
    owner: 'bar',
    parcel_id: 1,
    updated_at: '',
  };
});

export const parcel: Readable<Parcel> = derived([workspace], ([$workspace]) => {
  return {
    channel_dictionary_id: null,
    command_dictionary_id: 1,
    created_at: '',
    id: $workspace.parcel_id,
    name: 'Parcel',
    owner: 'bar',
    sequence_adaptation_id: null,
    updated_at: '',
  };
});
// export const workspace = gqlSubscribable<Workspace>(gql.SUB_WORKSPACE, { workspaceId }, null, null);

// export const parcel = gqlSubscribable<Parcel>(gql.SUB_PARCEL, { parcelId: get(workspace)?.parcel_id }, null, null);
