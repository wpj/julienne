import type { RenderToString } from 'julienne';
import type { SvelteComponent } from 'svelte';
import { format } from 'prettier';
import Document from './document.svelte';

const DOCTYPE = '<!doctype html>\n';

export const renderToString: RenderToString<SvelteComponent> = ({
  props,
  scripts,
  stylesheets,
  template,
}) => {
  let pageData = { props, template: template.name };

  if (!template.component) {
    return (
      DOCTYPE +
      ((Document as unknown) as SvelteComponent).render({
        body: null,
        head: null,
        pageData,
        scripts,
        stylesheets,
      }).html
    );
  }

  let Template = template.component;

  let { head, html } = Template.render(props);

  let renderedPage =
    DOCTYPE +
    ((Document as unknown) as SvelteComponent).render({
      body: html,
      head,
      pageData,
      scripts,
      stylesheets,
    }).html;

  return format(renderedPage, {
    parser: 'html',
    embeddedLanguageFormatting: 'off',
  });
};
