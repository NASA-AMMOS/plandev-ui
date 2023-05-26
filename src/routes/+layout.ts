export const ssr = false; // SPA mode.

import '../css/app.css';
import { permissibleQueries as permissibleQueriesStore, user as userStore } from '../stores/app';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data }) => {
  // TODO: Remove this for SSR!
  // See: https://kit.svelte.dev/docs/state-management#no-side-effects-in-load
  userStore.set(data?.user);
  permissibleQueriesStore.set(data?.permissibleQueries);
  return { ...data };
};
