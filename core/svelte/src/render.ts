import type { SvelteComponent } from 'svelte';

import Document from './document.svelte';

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
  template: { name: string; component: SvelteComponent | null };
}): Promise<string> {
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

  return (
    DOCTYPE +
    ((Document as unknown) as SvelteComponent).render({
      body: html,
      head,
      pageData,
      scripts,
      stylesheets,
    }).html
  );
}
