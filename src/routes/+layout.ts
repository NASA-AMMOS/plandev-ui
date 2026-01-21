import '../css/app.css';
import type { LayoutLoad } from './$types';

// Note: User state is managed via Svelte context in +layout.svelte
// WebSocket client is managed via the shared client in stores/gqlClient.ts
export const load: LayoutLoad = async ({ data }) => {
  return { ...data };
};
