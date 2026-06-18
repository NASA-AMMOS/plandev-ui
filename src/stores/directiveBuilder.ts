import { writable, type Writable } from 'svelte/store';

/* Writeable. */
export const activeDirectiveName: Writable<string> = writable('');
export const activeDirectiveType: Writable<string> = writable('');
export const activeDirectiveStartTime: Writable<string> = writable('');
export const directiveBuilderIsVisible: Writable<boolean> = writable(false);

export function resetDirectiveBuilderStores(): void {
  activeDirectiveName.set('');
  activeDirectiveType.set('');
  activeDirectiveStartTime.set('');
}