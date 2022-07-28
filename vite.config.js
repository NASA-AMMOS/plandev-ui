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
    environment: 'jsdom',
    include: ['./src/**/*.test.ts'],
    outputFile: 'unit-test-results/json-results.json',
    reporters: ['verbose', 'json'],
  },
};

export default config;
