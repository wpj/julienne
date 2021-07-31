// @ts-check
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { dirname, join as joinPath } from 'path';
import svelteAutoPreprocess from 'svelte-preprocess';

let baseResolveDir = dirname(new URL(import.meta.url).pathname);

/** @param {string} path */
function resolve(path) {
  return joinPath(baseResolveDir, path);
}

/**
 * @typedef {import('svelte').SvelteComponent} SvelteComponent
 */

/**
 * @template C
 * @typedef {import('julienne').ServerRender<C>} ServerRender
 */

/** @type {ServerRender<SvelteComponent>} */
const render = (Component, props) => {
  let { head, html } = Component.render(props);

  return { html, head };
};

let templates = {
  main: './src/templates/main.svelte',
};

let preprocess =
  /** @type { import("@sveltejs/vite-plugin-svelte").PreprocessorGroup } */ (
    svelteAutoPreprocess()
  );

/** @type {import('vite').UserConfig} */
const viteConfig = {
  plugins: [
    svelte({
      preprocess,
    }),
  ],
};

/**
 * @param {string} code
 *
 * @returns {Promise<boolean>}
 */
async function checkForHydrateExport(code) {
  /*
   * For svelte code specifically, this is a hacky check. When `export const hydrate = true`
   * is added to a context module, svelte transpiles that to `const hydrate = true; export { hydrate }`,
   * but since the original code is also included in the CSS source map, this check works.
   *
   * In the future, this should probably be re-implemented to use acorn to parse a module's exports.
   */
  return (
    code.includes('export let hydrate = true') ||
    code.includes('export const hydrate = true')
  );
}

export let sharedOptions = {
  experimental: {
    partialHydration: {
      flags: [checkForHydrateExport],
      wrap: resolve('./src/wrap.ts'),
    },
  },
  render: {
    client: './src/render.ts',
    server: render,
  },
  templates,
  viteConfig,
};
