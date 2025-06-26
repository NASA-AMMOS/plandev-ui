import { fontFamily } from 'tailwindcss/defaultTheme';

/* eslint-disable sort-keys */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./node_modules/@nasa-jpl/stellar-svelte/dist/**/*.{html,js,svelte,ts}', './src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains mono', ...fontFamily.mono],
      },
    },
  },
  plugins: [],
  presets: [require('@nasa-jpl/stellar-svelte/tailwindConfig')],
};
