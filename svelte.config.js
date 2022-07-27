import adapterNode from '@sveltejs/adapter-node';
import preprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapterNode(),
    env: {
      publicPrefix: '',
    },
    paths: {
      base: '',
    },
  },
  preprocess: preprocess(),
};

export default config;
