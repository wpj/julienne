import type { SvelteComponent } from 'svelte';
import svelteRuntime from '@julienne/svelte-runtime';

function registerServiceWorker() {
  return navigator.serviceWorker.register('/sw.js');
}

export default function runtime({
  dev,
  hydrate,
  template,
}: {
  dev: boolean;
  hydrate: boolean;
  template: typeof SvelteComponent;
}): void {
  svelteRuntime({ dev, hydrate, template });

  if (!dev) {
    registerServiceWorker().catch((e) => {
      console.error(e);
    });
  }
}
