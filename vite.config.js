import { sveltekit } from '@sveltejs/kit/vite';
import svg from '@poppanator/sveltekit-svg';
import { WorkerBuildPlugin } from './vite.worker-build-plugin';

/** @type {import('vite').UserConfig} */
const config = {
  build: {
    minify: true,
  },
  css: {
    devSourcemap: true,
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
    WorkerBuildPlugin(
      ['./src/workers/customTS.worker.ts', './node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js'],
      {
        log: true,
      },
    ),
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
