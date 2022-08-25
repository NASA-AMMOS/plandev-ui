import { writable, type Writable } from 'svelte/store';

/* Writeable. */

export const activityMetadataDefinitions: Writable<ActivityMetadataDefinition[]> = writable([]);
