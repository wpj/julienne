import defaultRuntime from '@julienne/default-runtime';
import type { Runtime } from '@julienne/runtime';

function registerServiceWorker() {
  return navigator.serviceWorker.register('/sw.js');
}

const runtime: Runtime = ({ dev, template }) => {
  defaultRuntime({ dev, template });

  if (!dev) {
    registerServiceWorker().catch((e) => {
      console.error(e);
    });
  }
};

export default runtime;
