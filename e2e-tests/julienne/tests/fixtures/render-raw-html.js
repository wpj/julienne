/**
 * @template Component
 * @template Templates
 * @typedef {import('julienne').Render<Component>} Render
 * */

/** @typedef {import('./types').Component} Component */

/**
 * Render function components returning strings and generate basic HTML markup.
 *
 * @type {Render<Component>}
 */
export const render = (component, props) => {
  return component(props);
};
