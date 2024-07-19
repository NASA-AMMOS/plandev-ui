import { writable, type Writable } from 'svelte/store';
import type { Plugins } from '../types/plugin';
import { defaultPlugins } from '../utilities/plugins';

/* Writeable. */

export const plugins: Writable<Plugins> = writable(defaultPlugins);
export const pluginsLoaded: Writable<boolean> = writable(false);
export const pluginsError: Writable<string> = writable('');
