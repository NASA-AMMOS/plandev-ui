import { base } from '$app/paths';
import '../css/app.css';
import { user as userStore, version as versionStore } from '../stores/app';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data, fetch }) => {
  const versionResponse = await fetch(`${base}/version.json`);
  const version = await versionResponse.json();

  // Set version store.
  versionStore.set(version);

  // Set user store.
  userStore.set(data?.user);

  return { ...data };
};
