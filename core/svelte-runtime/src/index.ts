import { SvelteComponent } from 'svelte';

import { getPage, getRoot } from '@julienne/runtime';

export default function runtime({
  hydrate,
  template: Template,
}: {
  dev: boolean;
  hydrate: boolean;
  template: typeof SvelteComponent;
}): void {
  let page = getPage();

  new Template({
    hydrate,
    props: page.props,
    target: getRoot(),
  });
}
