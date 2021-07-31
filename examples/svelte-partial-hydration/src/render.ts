import type { SvelteComponent } from 'svelte';

export default function render({
  component: Component,
  props,
  target,
}: {
  component: typeof SvelteComponent;
  props: Record<string, unknown>;
  target: HTMLElement;
}): void {
  new Component({
    hydrate: true,
    props,
    target,
  });
}
