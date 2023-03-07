import { sveltekit } from '@sveltejs/kit/vite';
import svg from '@poppanator/sveltekit-svg';

/** @type {import('vite').UserConfig} */
const config = {
  build: {
    minify: true,
  },
  plugins: [
    sveltekit(),
    svg({
      svgoOptions: {
        multipass: true,
        plugins: [
          {
            name: 'preset-default',
            // by default svgo removes the viewBox which prevents svg icons from scaling
            // not a good idea! https://github.com/svg/svgo/pull/1461
            params: { overrides: { removeViewBox: false } },
          },
          {
            name: 'addClassesToSVGElement',
            params: {
              classNames: ['st-icon'],
            },
          },
        ],
      },
    }),
  ],
  test: {
    alias: [{ find: /^svelte$/, replacement: 'svelte/internal' }], // https://github.com/vitest-dev/vitest/issues/2834
    environment: 'jsdom',
    include: ['./src/**/*.test.ts'],
    outputFile: {
      html: 'unit-test-results/html-results/index.html',
      json: 'unit-test-results/json-results.json',
      junit: 'unit-test-results/junit-results.xml',
    },
    reporters: ['verbose', 'json', 'junit', 'html'],
  },
};

export default config;
