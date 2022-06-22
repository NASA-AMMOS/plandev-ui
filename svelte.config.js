import adapterNode from '@sveltejs/adapter-node';
import preprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapterNode(),
    vite: {
      test: {
        environment: 'jsdom',
        include: ['./tests/unit/**/*.test.ts'],
        outputFile: 'unit-test-results/json-results.json',
        reporters: 'json',
      },
    },
  },
  preprocess: preprocess(),
};

export default config;
