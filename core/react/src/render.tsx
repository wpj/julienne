import type { RenderToString } from 'julienne';
import React, { ComponentType } from 'react';
import {
  renderToStaticMarkup,
  renderToString as reactRenderToString,
} from 'react-dom/server';
import Document from './document';
import { promises as fs } from 'fs';
import { format } from 'prettier';

/*
 * react-refresh integration adapated @snowpack/plugin-react-refresh
 * (https://github.com/snowpackjs/snowpack/blob/158bb9388a0bbb4a8a9d5dd07b576c727a61cf28/plugins/plugin-react-refresh/plugin.js)
 */
let reactRefreshLoc = require.resolve(
  'react-refresh/cjs/react-refresh-runtime.development.js',
);
let cachedReactRefreshCode: string;
async function createReactRefreshScript() {
  if (cachedReactRefreshCode === undefined) {
    cachedReactRefreshCode = (
      await fs.readFile(reactRefreshLoc, { encoding: 'utf-8' })
    ).replace(`process.env.NODE_ENV`, JSON.stringify('development'));
  }

  return `
  function debounce(e,t){let u;return()=>{clearTimeout(u),u=setTimeout(e,t)}}
  {
    const exports = {};
    ${cachedReactRefreshCode}
    exports.performReactRefresh = debounce(exports.performReactRefresh, 30);
    window.$RefreshRuntime$ = exports;
    window.$RefreshRuntime$.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
  }
`;
}

const DOCTYPE = '<!doctype html>\n';

export const renderToString: RenderToString<ComponentType> = async ({
  dev,
  props,
  scripts,
  stylesheets,
  template,
}) => {
  if (dev) {
    scripts = [{ content: await createReactRefreshScript() }, ...scripts];
  }

  let pageData = { props, template: template.name };

  if (!template.component) {
    return (
      DOCTYPE +
      renderToStaticMarkup(
        <Document
          body={null}
          head={null}
          pageData={pageData}
          scripts={scripts}
          stylesheets={stylesheets}
        />,
      )
    );
  }

  let Template = template.component;

  let html = reactRenderToString(<Template {...props} />);

  // TODO: handle head
  let renderedPage =
    DOCTYPE +
    renderToStaticMarkup(
      <Document
        body={html}
        head={null}
        pageData={pageData}
        scripts={scripts}
        stylesheets={stylesheets}
      />,
    );

  return format(renderedPage, {
    parser: 'html',
    embeddedLanguageFormatting: 'off',
  });
};
