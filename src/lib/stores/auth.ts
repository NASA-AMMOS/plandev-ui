// NOTE: This file is kept for backwards compatibility but is largely deprecated.
// User state is now managed via Svelte context (see +layout.svelte and stores/user.ts).
// WebSocket client is now managed via the shared singleton in stores/gqlClient.ts.
//
// The OIDC token refresh functionality has been moved to lib/stores/oidc.ts,
// which uses cookies directly instead of a module-level store.
