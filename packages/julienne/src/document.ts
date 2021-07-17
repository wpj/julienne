import { Fragment, h, JSX } from 'preact';
import render from 'preact-render-to-string';
import type { Attributes, DocumentProps } from './types';

function cleanAttrs(
  attributes: Attributes,
): Record<string, string | boolean | null> {
  return Object.fromEntries(
    Object.entries(attributes).map(([key, val]) => {
      return [key, val === undefined ? null : val];
    }),
  );
}

function Document({
  body,
  head,
  links = [],
  pageData,
  scripts = [],
}: DocumentProps): JSX.Element {
  let headHtml = render(
    h(Fragment, {}, [
      h('meta', { charSet: 'UTF-8' }),
      h('meta', {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      }),
      ...links.map((linkProps) => {
        return h('link', cleanAttrs(linkProps));
      }),
    ]),
  );

  if (head) {
    headHtml += head;
  }

  return h('html', { lang: 'en' }, [
    h('head', { dangerouslySetInnerHTML: { __html: headHtml } }),
    h('body', {}, [
      body != null
        ? h('div', {
            id: 'julienne-root',
            dangerouslySetInnerHTML: { __html: body },
          })
        : h('div', { id: 'julienne-root' }),
      h('script', {
        type: 'application/json',
        id: 'julienne-data',
        dangerouslySetInnerHTML: { __html: JSON.stringify(pageData) },
      }),

      ...scripts.map(({ content, ...attributes }, index) => {
        const key = attributes.src ?? index;
        const cleanedAttrs = cleanAttrs(attributes);
        if (content) {
          return h('script', {
            dangerouslySetInnerHTML: { __html: content },
            ...cleanedAttrs,
          });
        }

        return h('script', { key, ...cleanedAttrs });
      }),
    ]),
  ]);
}

export function renderDocument(props: DocumentProps): string {
  let renderedDocument = '<!DOCTYPE html>' + render(h(Document, props));

  return renderedDocument;
}
