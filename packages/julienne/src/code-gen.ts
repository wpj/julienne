/**
 * Generates a module that uses `render` to client-side render `component`. A
 * virtual entrypoint is created for each component when bundling or running
 * the dev server.
 */
export function clientEntryPointTemplate(options: {
  component: string;
  render: string;
}): string {
  let render = JSON.stringify(options.render);
  let component = JSON.stringify(options.component);
  return `
import component from ${component};
import render from ${render};

let root = document.querySelector('#julienne-root');
let pageDataElement = document.querySelector('#julienne-data');
let page = JSON.parse(pageDataElement.innerHTML);

render({ component, props: page.props, target: root });
`;
}
