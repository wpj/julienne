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

export function getRoot(): HTMLElement {
  let root = document.querySelector<HTMLDivElement>(ROOT_SELECTOR);
  if (!root) {
    throw new Error(`${ROOT_SELECTOR} element not found.`);
  }

  return root;
}

export function getPage(): {
  template: string;
  props: { [key: string]: unknown };
} {
  let pageDataElement = document.querySelector(PAGE_SELECTOR);
  if (!pageDataElement) {
    throw new Error(`${PAGE_SELECTOR} element not found.`);
  }

  let page = JSON.parse(pageDataElement.innerHTML);
  return page;
}
