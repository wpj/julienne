// @ts-check
import { getPage, getRoot } from '@julienne/runtime';

/** @typedef { import('./types').Component } Component */

/**
 * @template C
 * @typedef { import('@julienne/runtime').Runtime<C> } Runtime<C>
 */

/**
 * Renders the template function, appends a suffix to the resulting HTML (so
 * that client and server rendered HTML can be differentiated), and inserts the
 * result as innerHTML of the root element.
 *
 * @type {Runtime<Component>}
 */
const runtime = ({ template }) => {
  let root = getRoot();
  let page = getPage();

  let rendered = template(page.props) + '__generated';

  root.innerHTML = rendered;
};

export default runtime;
