// routes/unauthorized/+page.server.ts
import { browser } from '$app/environment';
import { error } from '@sveltejs/kit';
import type { PageLoad } from '../$types';

export const load: PageLoad = ({ url }) => {
  if (browser) {
    // get error code
    // get error message
    const code: number = parseInt(url.searchParams.get('code') ?? '500');
    const message = url.searchParams.get('message') ?? 'No message provided.';

    console.log(url);
    url.searchParams.forEach((val, key, _) => {
      console.log(val, key);
    });

    // throw
    throw error(code, message);
  }
};
