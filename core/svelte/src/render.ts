import type { RenderToString } from 'julienne';
import type { SvelteComponent } from 'svelte';
import prettier from 'prettier';
import Document from './document.svelte';

const DOCTYPE = '<!doctype html>\n';

export const renderToString: RenderToString<SvelteComponent> = ({
  links,
  props,
  scripts,
  template,
}) => {
  let pageData = { props, template: template.name };

  if (!template.component) {
    return (
      DOCTYPE +
      (Document as unknown as SvelteComponent).render({
        body: null,
        head: null,
        links,
        pageData,
        scripts,
      }).html
    );
  }

  let Template = template.component;

  let { head, html } = Template.render(props);

  let renderedPage =
    DOCTYPE +
    (Document as unknown as SvelteComponent).render({
      body: html,
      head,
      links,
      pageData,
      scripts,
    }).html;

  return prettier.format(renderedPage, {
    parser: 'html',
    embeddedLanguageFormatting: 'off',
  });
};
