import adapterNode from '@sveltejs/adapter-node';
import preprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapterNode(),
    target: '#svelte',
    vite: {
      mode: process***REMOVED***.MODE || 'development',
      server: {
        fs: {
          strict: false,
        },
      },
    },
  },
  preprocess: preprocess(),
};

export default config;
