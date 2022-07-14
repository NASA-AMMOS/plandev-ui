import { readFileSync, writeFileSync } from 'fs';

/**
 * This is a temporary fix for unpatched issues in node_modules.
 * @see https://github.com/sveltejs/kit/issues/5399
 */
function main() {
  const svelteKitViteJsPath = 'node_modules/@sveltejs/kit/dist/vite.js';
  const svelteKitViteJs = readFileSync(svelteKitViteJsPath, { encoding: 'utf8' });
  writeFileSync(
    svelteKitViteJsPath,
    svelteKitViteJs.replace(
      'chunk.dynamicImports.forEach((file) => traverse(file, false));',
      'chunk.dynamicImports.forEach((file) => traverse(file, add_js));',
    ),
  );
}

main();
