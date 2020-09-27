import type { RenderToString } from '../../src';

import type { Component } from './types';

/**
 * Render function components returning strings and generate basic HTML markup.
 */
export const renderToString: RenderToString<Component> = ({
  props,
  scripts,
  stylesheets,
  template,
}) => {
  let stylesheetTags = stylesheets.map(
    (href) => `<link rel="stylesheet" href="${href}" type="text/css" />`,
  );

  let scriptTags = scripts.map(
    (src) => `<script type="text/javascript" src="${src}"></script>`,
  );

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
