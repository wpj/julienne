import { SvelteComponent } from 'svelte';

import { getPage, getRoot, Runtime } from '@julienne/runtime';

const runtime: Runtime<typeof SvelteComponent> = ({
  hydrate,
  template: Template,
}) => {
  let page = getPage();

  new Template({
    hydrate,
    props: page.props,
    target: getRoot(),
  });
};

export default runtime;
