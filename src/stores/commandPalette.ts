import { writable } from 'svelte/store';
import type { CommandContext } from '../types/command-palette';

/**
 * Store to control the command palette visibility
 */
export const commandPaletteOpen = writable<boolean>(false);

/**
 * Store for the current command context
 * This is updated by the CommandPaletteProvider component
 */
export const commandPaletteContext = writable<CommandContext>({
  model: null,
  plan: null,
  route: '',
  user: null,
  workspace: null,
});

/**
 * Open the command palette
 */
export function openCommandPalette(): void {
  commandPaletteOpen.set(true);
}

/**
 * Close the command palette
 */
export function closeCommandPalette(): void {
  commandPaletteOpen.set(false);
}

/**
 * Toggle the command palette
 */
export function toggleCommandPalette(): void {
  commandPaletteOpen.update(open => !open);
}
