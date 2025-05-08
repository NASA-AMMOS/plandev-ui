import adapterNode from '@sveltejs/adapter-node';
import preprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapterNode(),
    alias: {
      '@melt-ui/*': './node_modules/@melt-ui/*',
      '@melt-ui/svelte/index.js': './node_modules/@melt-ui/svelte/dist/index.js',
      'bits-ui/*': './node_modules/bits-ui/*',
      'svelte/elements.js': './node_modules/svelte/elements',
    },
    paths: {
      base: '',
    },
  },
  onwarn(warning, defaultHandler) {
    // don't warn on components containing only global styles
    if (warning.code === 'vite-plugin-svelte-css-no-scopable-elements') {
      return;
    }

    // handle all other warnings normally
    defaultHandler(warning);
  },
  preprocess: preprocess(),
};

export default config;
