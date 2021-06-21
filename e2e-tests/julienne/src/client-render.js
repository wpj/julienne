// @ts-check

/**
 * Renders the template function and adds a signal class to the app root node.
 */
const render = ({ component, props, target }) => {
  let rendered = component(props);

  target.innerHTML = rendered;

  // Used with Page.waitForSelector in playwright-driven tests.
  target.classList.add('runtime-loaded');
};

export default render;
