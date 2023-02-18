import adapterNode from '@sveltejs/adapter-node';
import preprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapterNode(),
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
