import type { RenderToString } from 'julienne';
import React, { ComponentType } from 'react';
import {
  renderToStaticMarkup,
  renderToString as reactRenderToString,
} from 'react-dom/server';
import Document from './document';

const DOCTYPE = '<!doctype html>\n';

export const renderToString: RenderToString<ComponentType> = ({
  props,
  scripts,
  stylesheets,
  template,
}) => {
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
  return (
    DOCTYPE +
    renderToStaticMarkup(
      <Document
        body={html}
        head={null}
        pageData={pageData}
        scripts={scripts}
        stylesheets={stylesheets}
      />,
    )
  );
};
