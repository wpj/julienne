import type { RenderToString } from 'julienne';
import React, { ComponentType } from 'react';
import {
  renderToStaticMarkup,
  renderToString as reactRenderToString,
} from 'react-dom/server';
import Document from './document';
import { format } from 'prettier';

const DOCTYPE = '<!doctype html>\n';

export const renderToString: RenderToString<ComponentType> = async ({
  links,
  props,
  scripts,
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
          links={links}
          pageData={pageData}
          scripts={scripts}
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
        links={links}
        pageData={pageData}
        scripts={scripts}
      />,
    );

  return format(renderedPage, {
    parser: 'html',
    embeddedLanguageFormatting: 'off',
  });
};
