import type { RenderToString } from 'julienne';

import type { Component } from './types';

/**
 * Render function components returning strings and generate basic HTML markup.
 */
export const renderToString: RenderToString<Component> = ({
  links,
  props,
  scripts,
  template,
}) => {
  let stylesheetTags = links.map(
    ({ href }) => `<link rel="stylesheet" href="${href}" type="text/css" />`,
  );

  let scriptTags = scripts
    .map(({ content, type = 'text/javascript', ...attrs }) => {
      let attributes = Object.entries({ ...attrs, type }).reduce(
        (acc, [key, val]) => {
          let kv =
            typeof val === 'boolean' ? (val ? key : '') : `${key}="${val}"`;

          return acc.length > 0 ? `${acc} ${kv}` : kv;
        },
        '',
      );

      return `<script ${attributes}>${content ? content : ''}</script>`;
    })
    .join('\n');

  let templateHtml =
    template.component !== null ? template.component(props) : null;

  let pageData = JSON.stringify({ template: template.name, props });

  let julienneDataScript = `<script type="application/json" id="julienne-data">${pageData}</script>`;

  return `
<!doctype html>
<html>
  <head>
    <title>Raw HTML test</title>
    ${stylesheetTags}
  </head>
  <body>
    <div id="julienne-root">
      ${templateHtml !== null ? templateHtml : ''}
    </div>
    ${julienneDataScript}
    ${scriptTags}
  </body>
</html>
`;
};
