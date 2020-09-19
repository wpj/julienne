import type { SvelteComponent } from 'svelte';

export type Runtime = ({
  dev,
  template,
}: {
  dev: boolean;
  template: typeof SvelteComponent;
}) => void | Promise<void>;

const ROOT_SELECTOR = '#julienne-root';
const PAGE_SELECTOR = '#julienne-data';

export function getRoot() {
  let root = document.querySelector(ROOT_SELECTOR);
  if (!root) {
    throw new Error(`${ROOT_SELECTOR} element not found.`);
  }

  return root;
}

export function getPage() {
  let pageDataElement = document.querySelector(PAGE_SELECTOR);
  if (!pageDataElement) {
    throw new Error(`${PAGE_SELECTOR} element not found.`);
  }

  let page = JSON.parse(pageDataElement.innerHTML);
  return page;
}
