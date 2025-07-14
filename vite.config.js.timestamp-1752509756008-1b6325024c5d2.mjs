// vite.config.js
import { sveltekit } from "file:///Users/yellenki/Desktop/Work/Aerie/aerie-ui/node_modules/@sveltejs/kit/src/exports/vite/index.js";
import svg from "file:///Users/yellenki/Desktop/Work/Aerie/aerie-ui/node_modules/@poppanator/sveltekit-svg/dist/index.js";
import basicSsl from "file:///Users/yellenki/Desktop/Work/Aerie/aerie-ui/node_modules/@vitejs/plugin-basic-ssl/dist/index.mjs";
import { defineConfig, loadEnv } from "file:///Users/yellenki/Desktop/Work/Aerie/aerie-ui/node_modules/vite/dist/node/index.js";

// vite.worker-build-plugin.js
import { normalizePath } from "file:///Users/yellenki/Desktop/Work/Aerie/aerie-ui/node_modules/vite/dist/node/index.js";
import { relative, resolve, basename, join } from "path";
import picomatch from "file:///Users/yellenki/Desktop/Work/Aerie/aerie-ui/node_modules/picomatch/index.js";
import colors from "file:///Users/yellenki/Desktop/Work/Aerie/aerie-ui/node_modules/picocolors/picocolors.js";
import * as esbuild from "file:///Users/yellenki/Desktop/Work/Aerie/aerie-ui/node_modules/esbuild/lib/main.js";
import { writeFile } from "fs/promises";
function normalizePaths(root, path) {
  return (Array.isArray(path) ? path : [path]).map((subpath) => resolve(root, subpath)).map(normalizePath);
}
var WorkerBuildPlugin = (paths, config2) => ({
  async buildStart({ context: context2 }) {
    if (context2 === void 0) {
      return;
    }
    const root = process.cwd();
    const { outdir = "./static" } = config2;
    const files = normalizePaths(root, paths);
    const ctx = await esbuild.context({
      bundle: true,
      entryPoints: files,
      minify: true,
      outdir,
      sourcemap: true,
      treeShaking: true,
      write: false
    });
    const resp = await ctx.rebuild();
    resp.outputFiles.forEach(async (outputFile) => {
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
      build: { minify: configMinify }
    }
  }) {
    const root = process.cwd();
    const { log = true, outdir = "./static", minify = configMinify !== false } = config2;
    let files = normalizePaths(root, paths);
    let shouldRebuild = picomatch(files);
    const ctx = await esbuild.context({
      bundle: true,
      entryPoints: files,
      metafile: true,
      minify,
      outdir,
      sourcemap: true,
      treeShaking: true,
      write: false
    });
    async function build() {
      const resp = await ctx.rebuild();
      files = normalizePaths(root, Object.keys(resp.metafile.inputs));
      shouldRebuild = picomatch(files);
      resp.outputFiles.forEach(async (outputFile) => {
        await writeFile(join(outdir, basename(outputFile.path)), outputFile.contents);
      });
    }
    const checkRebuild = async (path) => {
      if (shouldRebuild(path)) {
        await build();
        ws.send({ path: "*", type: "full-reload" });
        if (log) {
          logger.info(`${colors.green("page reload")} ${colors.dim(relative(root, path))}`, {
            clear: true,
            timestamp: true
          });
        }
      }
    };
    watcher.add(files);
    watcher.on("add", checkRebuild);
    watcher.on("change", checkRebuild);
    await build();
  },
  name: "vite-worker-build-plugin"
});

// vite.config.js
import { lezer } from "file:///Users/yellenki/Desktop/Work/Aerie/aerie-ui/node_modules/@lezer/generator/dist/rollup-plugin-lezer.js";
var config = ({ mode }) => {
  const viteEnvVars = loadEnv(mode, process.cwd());
  return defineConfig({
    build: {
      minify: true
    },
    css: {
      devSourcemap: true
    },
    plugins: [
      ...viteEnvVars.VITE_HTTPS === "true" ? [basicSsl()] : [],
      lezer(),
      sveltekit(),
      svg({
        svgoOptions: {
          multipass: true,
          plugins: [
            {
              name: "preset-default",
              // by default svgo removes the viewBox which prevents svg icons from scaling
              // not a good idea! https://github.com/svg/svgo/pull/1461
              params: { overrides: { removeViewBox: false } }
            },
            {
              name: "addClassesToSVGElement",
              params: {
                classNames: ["st-icon"]
              }
            }
          ]
        }
      }),
      WorkerBuildPlugin(
        ["./src/workers/customTS.worker.ts", "./node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js"],
        {
          log: true
        }
      )
    ],
    server: {
      host: viteEnvVars.VITE_HOST ?? "localhost"
    },
    test: {
      alias: [{ find: /^svelte$/, replacement: "svelte/internal" }],
      // https://github.com/vitest-dev/vitest/issues/2834
      coverage: {
        exclude: ["src/routes/*"],
        include: ["src/**/*"],
        reporter: ["text", "json", "html"],
        reportsDirectory: "./unit-test-results/coverage"
      },
      environment: "jsdom",
      include: ["./src/**/*.test.ts"],
      outputFile: {
        html: "unit-test-results/html-results/index.html",
        json: "unit-test-results/json-results.json",
        junit: "unit-test-results/junit-results.xml"
      },
      reporters: ["verbose", "json", "junit", "html"]
    }
  });
};
var vite_config_default = config;
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiLCAidml0ZS53b3JrZXItYnVpbGQtcGx1Z2luLmpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL3llbGxlbmtpL0Rlc2t0b3AvV29yay9BZXJpZS9hZXJpZS11aVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL3llbGxlbmtpL0Rlc2t0b3AvV29yay9BZXJpZS9hZXJpZS11aS92aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMveWVsbGVua2kvRGVza3RvcC9Xb3JrL0FlcmllL2FlcmllLXVpL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgc3ZlbHRla2l0IH0gZnJvbSAnQHN2ZWx0ZWpzL2tpdC92aXRlJztcbmltcG9ydCBzdmcgZnJvbSAnQHBvcHBhbmF0b3Ivc3ZlbHRla2l0LXN2Zyc7XG5pbXBvcnQgYmFzaWNTc2wgZnJvbSAnQHZpdGVqcy9wbHVnaW4tYmFzaWMtc3NsJztcbmltcG9ydCB7IGRlZmluZUNvbmZpZywgbG9hZEVudiB9IGZyb20gJ3ZpdGUnO1xuaW1wb3J0IHsgV29ya2VyQnVpbGRQbHVnaW4gfSBmcm9tICcuL3ZpdGUud29ya2VyLWJ1aWxkLXBsdWdpbic7XG5pbXBvcnQgeyBsZXplciB9IGZyb20gJ0BsZXplci9nZW5lcmF0b3Ivcm9sbHVwJztcblxuY29uc3QgY29uZmlnID0gKHsgbW9kZSB9KSA9PiB7XG4gIGNvbnN0IHZpdGVFbnZWYXJzID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpKTtcbiAgcmV0dXJuIGRlZmluZUNvbmZpZyh7XG4gICAgYnVpbGQ6IHtcbiAgICAgIG1pbmlmeTogdHJ1ZSxcbiAgICB9LFxuICAgIGNzczoge1xuICAgICAgZGV2U291cmNlbWFwOiB0cnVlLFxuICAgIH0sXG4gICAgcGx1Z2luczogW1xuICAgICAgLi4uKHZpdGVFbnZWYXJzLlZJVEVfSFRUUFMgPT09ICd0cnVlJyA/IFtiYXNpY1NzbCgpXSA6IFtdKSxcbiAgICAgIGxlemVyKCksXG4gICAgICBzdmVsdGVraXQoKSxcbiAgICAgIHN2Zyh7XG4gICAgICAgIHN2Z29PcHRpb25zOiB7XG4gICAgICAgICAgbXVsdGlwYXNzOiB0cnVlLFxuICAgICAgICAgIHBsdWdpbnM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgbmFtZTogJ3ByZXNldC1kZWZhdWx0JyxcbiAgICAgICAgICAgICAgLy8gYnkgZGVmYXVsdCBzdmdvIHJlbW92ZXMgdGhlIHZpZXdCb3ggd2hpY2ggcHJldmVudHMgc3ZnIGljb25zIGZyb20gc2NhbGluZ1xuICAgICAgICAgICAgICAvLyBub3QgYSBnb29kIGlkZWEhIGh0dHBzOi8vZ2l0aHViLmNvbS9zdmcvc3Znby9wdWxsLzE0NjFcbiAgICAgICAgICAgICAgcGFyYW1zOiB7IG92ZXJyaWRlczogeyByZW1vdmVWaWV3Qm94OiBmYWxzZSB9IH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBuYW1lOiAnYWRkQ2xhc3Nlc1RvU1ZHRWxlbWVudCcsXG4gICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgIGNsYXNzTmFtZXM6IFsnc3QtaWNvbiddLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgfSksXG4gICAgICBXb3JrZXJCdWlsZFBsdWdpbihcbiAgICAgICAgWycuL3NyYy93b3JrZXJzL2N1c3RvbVRTLndvcmtlci50cycsICcuL25vZGVfbW9kdWxlcy9tb25hY28tZWRpdG9yL2VzbS92cy9sYW5ndWFnZS90eXBlc2NyaXB0L3RzLndvcmtlci5qcyddLFxuICAgICAgICB7XG4gICAgICAgICAgbG9nOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgKSxcbiAgICBdLFxuICAgIHNlcnZlcjoge1xuICAgICAgaG9zdDogdml0ZUVudlZhcnMuVklURV9IT1NUID8/ICdsb2NhbGhvc3QnLFxuICAgIH0sXG4gICAgdGVzdDoge1xuICAgICAgYWxpYXM6IFt7IGZpbmQ6IC9ec3ZlbHRlJC8sIHJlcGxhY2VtZW50OiAnc3ZlbHRlL2ludGVybmFsJyB9XSwgLy8gaHR0cHM6Ly9naXRodWIuY29tL3ZpdGVzdC1kZXYvdml0ZXN0L2lzc3Vlcy8yODM0XG4gICAgICBjb3ZlcmFnZToge1xuICAgICAgICBleGNsdWRlOiBbJ3NyYy9yb3V0ZXMvKiddLFxuICAgICAgICBpbmNsdWRlOiBbJ3NyYy8qKi8qJ10sXG4gICAgICAgIHJlcG9ydGVyOiBbJ3RleHQnLCAnanNvbicsICdodG1sJ10sXG4gICAgICAgIHJlcG9ydHNEaXJlY3Rvcnk6ICcuL3VuaXQtdGVzdC1yZXN1bHRzL2NvdmVyYWdlJyxcbiAgICAgIH0sXG4gICAgICBlbnZpcm9ubWVudDogJ2pzZG9tJyxcbiAgICAgIGluY2x1ZGU6IFsnLi9zcmMvKiovKi50ZXN0LnRzJ10sXG4gICAgICBvdXRwdXRGaWxlOiB7XG4gICAgICAgIGh0bWw6ICd1bml0LXRlc3QtcmVzdWx0cy9odG1sLXJlc3VsdHMvaW5kZXguaHRtbCcsXG4gICAgICAgIGpzb246ICd1bml0LXRlc3QtcmVzdWx0cy9qc29uLXJlc3VsdHMuanNvbicsXG4gICAgICAgIGp1bml0OiAndW5pdC10ZXN0LXJlc3VsdHMvanVuaXQtcmVzdWx0cy54bWwnLFxuICAgICAgfSxcbiAgICAgIHJlcG9ydGVyczogWyd2ZXJib3NlJywgJ2pzb24nLCAnanVuaXQnLCAnaHRtbCddLFxuICAgIH0sXG4gIH0pO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgY29uZmlnO1xuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMveWVsbGVua2kvRGVza3RvcC9Xb3JrL0FlcmllL2FlcmllLXVpXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMveWVsbGVua2kvRGVza3RvcC9Xb3JrL0FlcmllL2FlcmllLXVpL3ZpdGUud29ya2VyLWJ1aWxkLXBsdWdpbi5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMveWVsbGVua2kvRGVza3RvcC9Xb3JrL0FlcmllL2FlcmllLXVpL3ZpdGUud29ya2VyLWJ1aWxkLXBsdWdpbi5qc1wiO2ltcG9ydCB7IG5vcm1hbGl6ZVBhdGggfSBmcm9tICd2aXRlJztcbmltcG9ydCB7IHJlbGF0aXZlLCByZXNvbHZlLCBiYXNlbmFtZSwgam9pbiB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHBpY29tYXRjaCBmcm9tICdwaWNvbWF0Y2gnO1xuaW1wb3J0IGNvbG9ycyBmcm9tICdwaWNvY29sb3JzJztcbmltcG9ydCAqIGFzIGVzYnVpbGQgZnJvbSAnZXNidWlsZCc7XG5pbXBvcnQgeyB3cml0ZUZpbGUgfSBmcm9tICdmcy9wcm9taXNlcyc7XG5cbi8qKlxuICogTm9ybWFsaXplIG11bHRpcGxlIHBhdGhzXG4gKiBAcGFyYW0ge3N0cmluZ30gcm9vdCBSb290IHBhdGggdG8gbm9ybWFsaXplIHJlbGF0aXZlIHRvXG4gKiBAcGFyYW0ge3N0cmluZyB8IHN0cmluZ1tdfSBwYXRoIFRoZSBwYXRocyB0byBub3JtYWxpemVcbiAqIEByZXR1cm5zIHtzdHJpbmdbXX1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZVBhdGhzKHJvb3QsIHBhdGgpIHtcbiAgcmV0dXJuIChBcnJheS5pc0FycmF5KHBhdGgpID8gcGF0aCA6IFtwYXRoXSkubWFwKHN1YnBhdGggPT4gcmVzb2x2ZShyb290LCBzdWJwYXRoKSkubWFwKG5vcm1hbGl6ZVBhdGgpO1xufVxuXG4vKipcbiAqIFRoZSBDb25maWcgb2JqZWN0IGZvciB0aGUgV29ya2VyXG4gKlxuICogQHR5cGVkZWYge09iamVjdH0gV29ya2VyQnVpbGRDb25maWdcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nIHwgdW5kZWZpbmVkfSBvdXRkaXIgVGhlIGRpcmVjdG9yeSB0byBzZW5kIGJ1aWx0IGZpbGVzLCBkZWZhdWx0cyB0byBgLi9zdGF0aWNgXG4gKiBAcHJvcGVydHkge2Jvb2xlYW4gfCB1bmRlZmluZWR9IG1pbmlmeSBJZiB3ZSBzaG91bGQgbWluaWZ5IGJ1aWx0IGZpbGVzLCBkZWZhdWx0cyB0byB0aGUgc2V0dGluZyBpbiB0aGUgb3ZlcmFsbCB2aXRlIGNvbmZpZ3VyYXRpb24uXG4gKiBAcHJvcGVydHkge2Jvb2xlYW4gfCB1bmRlZmluZWR9IGxvZyBJZiB3ZSBzaG91bGQgbG9nIHdoZW4gZmlsZXMgY2hhbmdlLiBEZWZhdWx0cyB0byB0cnVlXG4gKi9cblxuLyoqIEEgcXVpY2sgYW5kIGRpcnR5IFZpdGUgcGx1Z2luIHRvIGhvb2sgaW4gdGhlIGVzYnVpbGQgcmVidWlsZFxuICogQHBhcmFtIHtzdHJpbmdbXX0gcGF0aHMgVGhlIGZpbGUgcGF0aHMgd2Ugd2FudCB0byB3YXRjaC4gRG9lcyBub3Qgc3VwcG9ydCBnbG9iYmluZywgc28gc3BlY2lmeSBhbGwgZmlsZXMgZXhhY3RseSFcbiAqIEBwYXJhbSB7V29ya2VyQnVpbGRDb25maWd9IGNvbmZpZ1xuICogQHJldHVybnMge2ltcG9ydCgndml0ZScpLlBsdWdpbk9wdGlvbn1cbiAqL1xuZXhwb3J0IGNvbnN0IFdvcmtlckJ1aWxkUGx1Z2luID0gKHBhdGhzLCBjb25maWcpID0+ICh7XG4gIGFzeW5jIGJ1aWxkU3RhcnQoeyBjb250ZXh0IH0pIHtcbiAgICAvLyBJZ25vcmUgaWYgaW4gbnBtIHJ1biBkZXZcbiAgICBpZiAoY29udGV4dCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHJvb3QgPSBwcm9jZXNzLmN3ZCgpO1xuICAgIGNvbnN0IHsgb3V0ZGlyID0gJy4vc3RhdGljJyB9ID0gY29uZmlnO1xuICAgIGNvbnN0IGZpbGVzID0gbm9ybWFsaXplUGF0aHMocm9vdCwgcGF0aHMpO1xuXG4gICAgLy8gSWYgbnBtIHJ1biBidWlsZCwgbWFrZSBhbiBvcHRpbWl6ZWQgYnVpbGRcbiAgICBjb25zdCBjdHggPSBhd2FpdCBlc2J1aWxkLmNvbnRleHQoe1xuICAgICAgYnVuZGxlOiB0cnVlLFxuICAgICAgZW50cnlQb2ludHM6IGZpbGVzLFxuICAgICAgbWluaWZ5OiB0cnVlLFxuICAgICAgb3V0ZGlyLFxuICAgICAgc291cmNlbWFwOiB0cnVlLFxuICAgICAgdHJlZVNoYWtpbmc6IHRydWUsXG4gICAgICB3cml0ZTogZmFsc2UsXG4gICAgfSk7XG5cbiAgICBjb25zdCByZXNwID0gYXdhaXQgY3R4LnJlYnVpbGQoKTtcbiAgICByZXNwLm91dHB1dEZpbGVzLmZvckVhY2goYXN5bmMgb3V0cHV0RmlsZSA9PiB7XG4gICAgICBhd2FpdCB3cml0ZUZpbGUoam9pbihvdXRkaXIsIGJhc2VuYW1lKG91dHB1dEZpbGUucGF0aCkpLCBvdXRwdXRGaWxlLmNvbnRlbnRzKTtcbiAgICB9KTtcblxuICAgIGF3YWl0IGN0eC5kaXNwb3NlKCk7XG4gIH0sXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBzb3J0LWtleXNcbiAgY29uZmlnOiAoKSA9PiAoeyBzZXJ2ZXI6IHsgd2F0Y2g6IHsgZGlzYWJsZUdsb2JiaW5nOiB0cnVlIH0gfSB9KSxcbiAgLyoqIEBwYXJhbSB7aW1wb3J0KCd2aXRlJykuVml0ZURldlNlcnZlcn0gcGFyYW0wICovXG4gIGFzeW5jIGNvbmZpZ3VyZVNlcnZlcih7XG4gICAgd2F0Y2hlcixcbiAgICB3cyxcbiAgICBjb25maWc6IHtcbiAgICAgIGxvZ2dlcixcbiAgICAgIGJ1aWxkOiB7IG1pbmlmeTogY29uZmlnTWluaWZ5IH0sXG4gICAgfSxcbiAgfSkge1xuICAgIGNvbnN0IHJvb3QgPSBwcm9jZXNzLmN3ZCgpO1xuICAgIGNvbnN0IHsgbG9nID0gdHJ1ZSwgb3V0ZGlyID0gJy4vc3RhdGljJywgbWluaWZ5ID0gY29uZmlnTWluaWZ5ICE9PSBmYWxzZSB9ID0gY29uZmlnO1xuICAgIGxldCBmaWxlcyA9IG5vcm1hbGl6ZVBhdGhzKHJvb3QsIHBhdGhzKTtcbiAgICBsZXQgc2hvdWxkUmVidWlsZCA9IHBpY29tYXRjaChmaWxlcyk7XG5cbiAgICAvLyBVc2luZyBhbiBlc2J1aWxkIGFuZCBhIGNvbnRleHQgc2F2ZXMgdXMgcGVyZm9ybWFuY2UhXG4gICAgY29uc3QgY3R4ID0gYXdhaXQgZXNidWlsZC5jb250ZXh0KHtcbiAgICAgIGJ1bmRsZTogdHJ1ZSxcbiAgICAgIGVudHJ5UG9pbnRzOiBmaWxlcyxcbiAgICAgIG1ldGFmaWxlOiB0cnVlLFxuICAgICAgbWluaWZ5LFxuICAgICAgb3V0ZGlyLFxuICAgICAgc291cmNlbWFwOiB0cnVlLFxuICAgICAgdHJlZVNoYWtpbmc6IHRydWUsXG4gICAgICB3cml0ZTogZmFsc2UsXG4gICAgfSk7XG5cbiAgICAvLyBUbyBzYXZlIGZsYXQsIHdlIG5lZWQgdG8gZG8gdGhpcyBqYW5rIHRoaW5nIGFuZCBtYW51YWxseSBzYXZlIHRoZSBmaWxlc1xuICAgIGFzeW5jIGZ1bmN0aW9uIGJ1aWxkKCkge1xuICAgICAgY29uc3QgcmVzcCA9IGF3YWl0IGN0eC5yZWJ1aWxkKCk7XG5cbiAgICAgIC8vIEF1dG9tYXRpY2FsbHkgdXBkYXRlIHRoZSBkZXBlbmRhbnQgZmlsZXMgYmFzZWQgb24gd2hhdGV2ZXIgd2UgZmluZCBpcyBidW5kbGVkIGluIVxuICAgICAgZmlsZXMgPSBub3JtYWxpemVQYXRocyhyb290LCBPYmplY3Qua2V5cyhyZXNwLm1ldGFmaWxlLmlucHV0cykpO1xuICAgICAgc2hvdWxkUmVidWlsZCA9IHBpY29tYXRjaChmaWxlcyk7XG5cbiAgICAgIHJlc3Aub3V0cHV0RmlsZXMuZm9yRWFjaChhc3luYyBvdXRwdXRGaWxlID0+IHtcbiAgICAgICAgYXdhaXQgd3JpdGVGaWxlKGpvaW4ob3V0ZGlyLCBiYXNlbmFtZShvdXRwdXRGaWxlLnBhdGgpKSwgb3V0cHV0RmlsZS5jb250ZW50cyk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBjaGVja1JlYnVpbGQgPSBhc3luYyBwYXRoID0+IHtcbiAgICAgIGlmIChzaG91bGRSZWJ1aWxkKHBhdGgpKSB7XG4gICAgICAgIGF3YWl0IGJ1aWxkKCk7XG4gICAgICAgIHdzLnNlbmQoeyBwYXRoOiAnKicsIHR5cGU6ICdmdWxsLXJlbG9hZCcgfSk7XG4gICAgICAgIGlmIChsb2cpIHtcbiAgICAgICAgICBsb2dnZXIuaW5mbyhgJHtjb2xvcnMuZ3JlZW4oJ3BhZ2UgcmVsb2FkJyl9ICR7Y29sb3JzLmRpbShyZWxhdGl2ZShyb290LCBwYXRoKSl9YCwge1xuICAgICAgICAgICAgY2xlYXI6IHRydWUsXG4gICAgICAgICAgICB0aW1lc3RhbXA6IHRydWUsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gRW5zdXJlIFZpdGUga2VlcHMgdHJhY2sgb2YgdGhlIGZpbGVzIGFuZCB0cmlnZ2VycyBITVIgYXMgbmVlZGVkLlxuICAgIHdhdGNoZXIuYWRkKGZpbGVzKTtcblxuICAgIC8vIERvIGEgZnVsbCBwYWdlIHJlbG9hZCBpZiBhbnkgb2YgdGhlIHdhdGNoZWQgZmlsZXMgY2hhbmdlcy5cbiAgICB3YXRjaGVyLm9uKCdhZGQnLCBjaGVja1JlYnVpbGQpO1xuICAgIHdhdGNoZXIub24oJ2NoYW5nZScsIGNoZWNrUmVidWlsZCk7XG5cbiAgICAvLyBCdWlsZCBvbmNlIHRvIHN0YXJ0IVxuICAgIGF3YWl0IGJ1aWxkKCk7XG4gIH0sXG4gIG5hbWU6ICd2aXRlLXdvcmtlci1idWlsZC1wbHVnaW4nLFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW1ULFNBQVMsaUJBQWlCO0FBQzdVLE9BQU8sU0FBUztBQUNoQixPQUFPLGNBQWM7QUFDckIsU0FBUyxjQUFjLGVBQWU7OztBQ0h1UyxTQUFTLHFCQUFxQjtBQUMzVyxTQUFTLFVBQVUsU0FBUyxVQUFV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QUcsVUFBVSxZQUFZO0FBR2pDLFVBQU0sTUFBTTtBQUFBLEVBQ2Q7QUFBQSxFQUNBLE1BQU07QUFDUjs7O0FEdkhBLFNBQVMsYUFBYTtBQUV0QixJQUFNLFNBQVMsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUMzQixRQUFNLGNBQWMsUUFBUSxNQUFNLFFBQVEsSUFBSSxDQUFDO0FBQy9DLFNBQU8sYUFBYTtBQUFBLElBQ2xCLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxJQUNWO0FBQUEsSUFDQSxLQUFLO0FBQUEsTUFDSCxjQUFjO0FBQUEsSUFDaEI7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNQLEdBQUksWUFBWSxlQUFlLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO0FBQUEsTUFDeEQsTUFBTTtBQUFBLE1BQ04sVUFBVTtBQUFBLE1BQ1YsSUFBSTtBQUFBLFFBQ0YsYUFBYTtBQUFBLFVBQ1gsV0FBVztBQUFBLFVBQ1gsU0FBUztBQUFBLFlBQ1A7QUFBQSxjQUNFLE1BQU07QUFBQTtBQUFBO0FBQUEsY0FHTixRQUFRLEVBQUUsV0FBVyxFQUFFLGVBQWUsTUFBTSxFQUFFO0FBQUEsWUFDaEQ7QUFBQSxZQUNBO0FBQUEsY0FDRSxNQUFNO0FBQUEsY0FDTixRQUFRO0FBQUEsZ0JBQ04sWUFBWSxDQUFDLFNBQVM7QUFBQSxjQUN4QjtBQUFBLFlBQ0Y7QUFBQSxVQUNGO0FBQUEsUUFDRjtBQUFBLE1BQ0YsQ0FBQztBQUFBLE1BQ0Q7QUFBQSxRQUNFLENBQUMsb0NBQW9DLHNFQUFzRTtBQUFBLFFBQzNHO0FBQUEsVUFDRSxLQUFLO0FBQUEsUUFDUDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxRQUFRO0FBQUEsTUFDTixNQUFNLFlBQVksYUFBYTtBQUFBLElBQ2pDO0FBQUEsSUFDQSxNQUFNO0FBQUEsTUFDSixPQUFPLENBQUMsRUFBRSxNQUFNLFlBQVksYUFBYSxrQkFBa0IsQ0FBQztBQUFBO0FBQUEsTUFDNUQsVUFBVTtBQUFBLFFBQ1IsU0FBUyxDQUFDLGNBQWM7QUFBQSxRQUN4QixTQUFTLENBQUMsVUFBVTtBQUFBLFFBQ3BCLFVBQVUsQ0FBQyxRQUFRLFFBQVEsTUFBTTtBQUFBLFFBQ2pDLGtCQUFrQjtBQUFBLE1BQ3BCO0FBQUEsTUFDQSxhQUFhO0FBQUEsTUFDYixTQUFTLENBQUMsb0JBQW9CO0FBQUEsTUFDOUIsWUFBWTtBQUFBLFFBQ1YsTUFBTTtBQUFBLFFBQ04sTUFBTTtBQUFBLFFBQ04sT0FBTztBQUFBLE1BQ1Q7QUFBQSxNQUNBLFdBQVcsQ0FBQyxXQUFXLFFBQVEsU0FBUyxNQUFNO0FBQUEsSUFDaEQ7QUFBQSxFQUNGLENBQUM7QUFDSDtBQUVBLElBQU8sc0JBQVE7IiwKICAibmFtZXMiOiBbImNvbmZpZyIsICJjb250ZXh0Il0KfQo=
