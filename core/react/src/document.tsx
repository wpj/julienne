import React from 'react';

export default function Document({
  body,
  head,
  pageData,
  scripts,
  stylesheets,
}: {
  body: string | null;
  head: string | null;
  pageData: unknown;
  // TODO: Fix this type.
  scripts: {
    content?: string;
    nomodule?: boolean;
    src?: string;
    type?: string;
  }[];
  stylesheets: string[];
}): JSX.Element {
  let stylesheetTags = stylesheets
    .map((href) => `<link rel="stylesheet" href="${href}" type="text/css" />`)
    .join('\n');

  let headHtml = `
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
 `;
  if (head !== null) {
    headHtml += head;
  }

  headHtml += stylesheetTags;

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

        {scripts.map(
          ({ content, type = 'text/javascript', ...attributes }, index) => {
            let scriptProps = content
              ? {
                  ...attributes,
                  type,
                  dangerouslySetInnerHTML: { __html: content },
                }
              : { ...attributes, type };

            return <script key={attributes.src ?? index} {...scriptProps} />;
          },
        )}
      </body>
    </html>
  );
}
