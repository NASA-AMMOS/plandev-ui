/* eslint-disable sort-keys */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./node_modules/@nasa-jpl/stellar-svelte/dist/**/*.{html,js,svelte,ts}', './src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {},
  },
  plugins: [],
  presets: [require('@nasa-jpl/stellar-svelte/tailwindConfig')],
};
