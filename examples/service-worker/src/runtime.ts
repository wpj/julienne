import type { SvelteComponent } from 'svelte';
import type { Runtime } from '@julienne/runtime';
import svelteRuntime from '@julienne/svelte-runtime';

function registerServiceWorker() {
  return navigator.serviceWorker.register('/sw.js');
}

const runtime: Runtime<typeof SvelteComponent> = ({
  dev,
  hydrate,
  template,
}) => {
  svelteRuntime({ dev, hydrate, template });

  if (!dev) {
    registerServiceWorker().catch((e) => {
      console.error(e);
    });
  }
};

export default runtime;
