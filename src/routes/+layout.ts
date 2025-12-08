import '../css/app.css';
import type { LayoutLoad } from './$types';

import { browser } from '$app/environment';
import { createClient } from 'graphql-ws';
import { gqlWsClient, userStore } from '../lib/stores/auth';
import { getClientOptions } from '../stores/subscribable';

export const load: LayoutLoad = async ({ data }) => {
  if (browser) {
    userStore.set(data.user);
    gqlWsClient.set(createClient(getClientOptions()));
  }

  // no PageData should be used client-side. but if it is accessed in other +page.ts or +layout.ts files, that should be okay, for SSR purposes. but anywhere on client, userStore should be used.
  return { ...data };
};
