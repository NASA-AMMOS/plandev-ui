import adapterNode from '@sveltejs/adapter-node';
import preprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapterNode(),
    vite: {
      test: {
        environment: 'jsdom',
        include: ['./src/**/*.test.ts'],
        outputFile: 'unit-test-results/json-results.json',
        reporters: ['default', 'json'],
      },
    },
  },
  preprocess: preprocess(),
};

export default config;
