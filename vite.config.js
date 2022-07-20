import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').UserConfig} */
const config = {
  build: {
    minify: true,
  },
  plugins: [sveltekit()],
  test: {
    environment: 'jsdom',
    include: ['./src/**/*.test.ts'],
    outputFile: 'unit-test-results/json-results.json',
    reporters: ['verbose', 'json'],
  },
};

export default config;
