// @ts-check
import reactRefresh from '@vitejs/plugin-react-refresh';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server.js';
import { Helmet } from 'react-helmet';

/**
 * @typedef { import("react").ComponentType } ComponentType
 */

/**
 * @template C
 * @typedef { import('julienne').ServerRender<C> } ServerRender
 * */

/** @type {ServerRender<ComponentType>} */
let renderWithHelmet = (Component, props) => {
  let html = renderToStaticMarkup(React.createElement(Component, props));
  let helmet = Helmet.renderStatic();

  let title = /** @type {import('react').ReactElement} */ (
    /** @type {unknown} */ (helmet.title.toComponent())
  );
  let head = renderToStaticMarkup(title);

  return { html, head };
};

export let templates = {
  main: './src/templates/main.tsx',
};

/** @type { import("vite").UserConfig } */
let viteConfig = {
  plugins: [reactRefresh()],
};

export let sharedOptions = {
  render: {
    client: './src/render.tsx',
    server: renderWithHelmet,
  },
  templates,
  viteConfig,
};
