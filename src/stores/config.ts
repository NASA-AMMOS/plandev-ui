import { writable } from 'svelte/store';
import type { Config } from '../types/config';
import { defaultConfig } from '../utilities/config';

export const config = writable<Config>(defaultConfig);
