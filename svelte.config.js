import adapterNode from '@sveltejs/adapter-node';
import preprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapterNode({
      esbuild(defaultOptions) {
        return {
          ...defaultOptions,
          external: ['pg-native'],
        };
      },
    }),
    target: '#svelte',
    vite: {
      mode: process***REMOVED***.MODE || 'develop',
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
