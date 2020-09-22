import React, { ComponentType } from 'react';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';

import Document from './document';

type Props = {
  [key: string]: unknown;
};

const DOCTYPE = '<!doctype html>\n';

export async function render({
  props,
  scripts,
  stylesheets,
  template,
}: {
  props: Props;
  scripts: string[];
  stylesheets: string[];
  template: { name: string; component: ComponentType | null };
}): Promise<string> {
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

  let html = renderToString(<Template {...props} />);

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
}
