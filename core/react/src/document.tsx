import React from 'react';

function cleanAttrs(
  attrs: Record<string, string | undefined | null>,
): Record<string, string | null> {
  return Object.fromEntries(
    Object.entries(attrs).map(([key, val]) => {
      return [key, val === undefined ? null : val];
    }),
  );
}

type Attributes = Record<string, string | undefined | null>;

export default function Document({
  body,
  head,
  links,
  pageData,
  scripts,
}: {
  body: string | null;
  head: string | null;
  links: Attributes[];
  pageData: unknown;
  scripts: Attributes[];
}): JSX.Element {
  let linkTags = links
    .map(({ href, rel, type }) => {
      return `<link rel=${JSON.stringify(rel)} href=${JSON.stringify(
        href,
      )} type=${JSON.stringify(type)}/>`;
    })
    .join('\n');

  let headHtml = `
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
 `;
  if (head !== null) {
    headHtml += head;
  }

  headHtml += linkTags;

  return (
    <html lang="en">
      <head dangerouslySetInnerHTML={{ __html: headHtml }} />
      <body>
        {body !== null ? (
          <div id="julienne-root" dangerouslySetInnerHTML={{ __html: body }} />
        ) : (
          <div id="julienne-root" />
        )}

        <script
          type="application/json"
          id="julienne-data"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(pageData) }}
        />

        {scripts.map(({ content, ...attributes }, index) => {
          const key = attributes.src ?? index;
          const type = attributes.type ?? 'text/javascript';

          if (content) {
            return (
              <script
                key={key}
                type={type}
                dangerouslySetInnerHTML={{ __html: content }}
                {...cleanAttrs(attributes)}
              />
            );
          }

          return (
            <script
              key={attributes.src ?? index}
              type={type}
              {...cleanAttrs(attributes)}
            />
          );
        })}
      </body>
    </html>
  );
}
