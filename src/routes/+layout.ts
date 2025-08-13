import { browser } from '$app/environment';
import { createClient } from 'graphql-ws';
import '../css/app.css';
import { gqlWsClient } from '../stores/auth';
import { getClientOptions } from '../stores/subscribable';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data }) => {
  if (browser) {
    gqlWsClient.set(createClient(getClientOptions()));
  }

  return { ...data };
};
