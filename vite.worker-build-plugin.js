import { normalizePath } from 'vite';
import { relative, resolve, basename, join } from 'path';
import picomatch from 'picomatch';
import colors from 'picocolors';
import * as esbuild from 'esbuild';
import { writeFile } from 'fs/promises';

/**
 * Normalize multiple paths
 * @param {string} root Root path to normalize relative to
 * @param {string | string[]} path The paths to normalize
 * @returns {string[]}
 */
export function normalizePaths(root, path) {
  return (Array.isArray(path) ? path : [path]).map(path => resolve(root, path)).map(normalizePath);
}

/**
 * The Config object for the Worker
 *
 * @typedef {Object} WorkerBuildConfig
 * @property {string | undefined} outdir The directory to send built files, defaults to `./static`
 * @property {boolean | undefined} minify If we should minify built files, defaults to the setting in the overall vite configuration.
 * @property {boolean | undefined} log If we should log when files change. Defaults to true
 */

/** A quick and dirty Vite plugin to hook in the esbuild rebuild
 * @param {string[]} paths The file paths we want to watch. Does not support globbing, so specify all files exactly!
 * @param {WorkerBuildConfig} config
 * @returns {import('vite').PluginOption}
 */
export const WorkerBuildPlugin = (paths, config) => ({
  async buildStart({ context }) {
    // Ignore if in npm run dev
    if (context === undefined) {
      return;
    }
    const root = process.cwd();
    const { outdir = './static' } = config;
    let files = normalizePaths(root, paths);

    // If npm run build, make an optimized build
    const ctx = await esbuild.context({
      bundle: true,
      entryPoints: files,
      minify: true,
      outdir,
      sourcemap: true,
      treeShaking: true,
      write: false,
    });

    const resp = await ctx.rebuild();
    resp.outputFiles.forEach(async outputFile => {
      await writeFile(join(outdir, basename(outputFile.path)), outputFile.contents);
    });

    await ctx.dispose();
  },
  // eslint-disable-next-line sort-keys
  config: () => ({ server: { watch: { disableGlobbing: true } } }),
  /** @param {import('vite').ViteDevServer} param0 */
  async configureServer({
    watcher,
    ws,
    config: {
      logger,
      build: { minify: configMinify },
    },
  }) {
    const root = process.cwd();
    const { log = true, outdir = './static', minify = configMinify !== false } = config;
    let files = normalizePaths(root, paths);
    let shouldRebuild = picomatch(files);

    // Using an esbuild and a context saves us performance!
    const ctx = await esbuild.context({
      bundle: true,
      entryPoints: files,
      metafile: true,
      minify,
      outdir,
      sourcemap: true,
      treeShaking: true,
      write: false,
    });

    // To save flat, we need to do this jank thing and manually save the files
    async function build() {
      const resp = await ctx.rebuild();

      // Automatically update the dependant files based on whatever we find is bundled in!
      files = normalizePaths(root, Object.keys(resp.metafile.inputs));
      shouldRebuild = picomatch(files);

      resp.outputFiles.forEach(async outputFile => {
        await writeFile(join(outdir, basename(outputFile.path)), outputFile.contents);
      });
    }

    const checkRebuild = async path => {
      if (shouldRebuild(path)) {
        await build();
        ws.send({ path: '*', type: 'full-reload' });
        if (log) {
          logger.info(`${colors.green('page reload')} ${colors.dim(relative(root, path))}`, {
            clear: true,
            timestamp: true,
          });
        }
      }
    };

    // Ensure Vite keeps track of the files and triggers HMR as needed.
    watcher.add(files);

    // Do a full page reload if any of the watched files changes.
    watcher.on('add', checkRebuild);
    watcher.on('change', checkRebuild);

    // Build once to start!
    await build();
  },
  name: 'vite-worker-build-plugin',
});
