/**
 * Leaf module holding whether offline mode is active as a plain module-level
 * boolean (not a Svelte store). `subscribable.ts` needs to check this on
 * every `subscribe()`/`resubscribe()` call, and importing `stores/offline.ts`
 * directly from there would create an import cycle (`offline.ts` reads
 * `simulationDataset` from `stores/simulation.ts`, which itself builds
 * `gqlSubscribable`s via `subscribable.ts`). Keeping this flag in its own
 * dependency-free module breaks that cycle.
 */
let offlineActive = false;

/** Sets whether offline mode is active. Called by `stores/offline.ts`. */
export function setOfflineActive(value: boolean): void {
  offlineActive = value;
}

/** Returns whether offline mode is currently active. */
export function isOfflineActive(): boolean {
  return offlineActive;
}
