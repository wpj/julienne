import { getPage, getRoot, Runtime } from '@julienne/runtime';
import type { SvelteComponent } from 'svelte';

import App from './app.svelte';
import { createJsonSlug } from './helpers';

function isInternalURL(url: string) {
  return new RegExp(`^${location.origin}`).test(url);
}

async function fetchPageJson(pageUrl: string) {
  let jsonUrl = createJsonSlug(pageUrl);

  return fetch(jsonUrl).then((resp) => resp.json());
}

async function updateTemplate(
  url: string,
  updateState: boolean,
  app: InstanceType<typeof SvelteComponent>,
) {
  let { template, props } = await fetchPageJson(url);

  let Template = await import(`./templates/${template}.svelte`).then(
    (mod) => mod.default,
  );

  app.$set({
    props,
    template: Template,
  });

  if (updateState) {
    history.pushState(null, null, url);
  }
}

function handleLinkClick(
  e: MouseEvent,
  app: InstanceType<typeof SvelteComponent>,
) {
  let a = e.target as HTMLAnchorElement;

  if (a.href && isInternalURL(a.href)) {
    e.preventDefault();
    updateTemplate(a.href, true, app);
  }
}

const runtime: Runtime = ({ dev, template: Template }) => {
  let page = getPage();

  let app = new App({
    hydrate: !dev,
    props: {
      props: page.props,
      template: Template,
    },
    target: getRoot(),
  });

  document.addEventListener('click', (e: MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'A') {
      handleLinkClick(e, app);
    }
  });

  window.addEventListener('popstate', () => {
    updateTemplate(location.href, false, app);
  });
};
export default runtime;
