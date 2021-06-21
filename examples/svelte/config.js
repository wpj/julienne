// @ts-check
import { svelte } from '@sveltejs/vite-plugin-svelte';
import svelteAutoPreprocess from 'svelte-preprocess';

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

export let sharedOptions = {
  render: {
    client: './src/render.ts',
    server: render,
  },
  templates,
  viteConfig,
};
