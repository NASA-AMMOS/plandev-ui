import '../css/app.css';
import type { LayoutLoad } from './$types';

import { browser } from '$app/environment';
import { createClient } from 'graphql-ws';
import { gqlWsClient, userStore } from '../lib/stores/auth';
import { getClientOptions } from '../stores/subscribable';

export const load: LayoutLoad = async ({ data }) => {
  console.log('in +layout.ts!', Object.keys(data));

  if (browser) {
    console.log('HERE!');
    // TODO: add code to take locals and set the user store and gqlWsClient accordingly
    userStore.set(data.user ?? undefined); // TODO: resolve undefined vs null for user. this is ridiculous
    gqlWsClient.set(createClient(getClientOptions()));
  }

  return { ...data };
};
