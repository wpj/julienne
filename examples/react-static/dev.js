// @ts-check
import express from 'express';
import { createDevRenderer, requestContextKey } from 'julienne';
import { sharedOptions as options } from './config';

/**
 * @typedef {import('./types/app').Renderer} Renderer
 * @typedef {import('react').ComponentType} ComponentType
 */

let port = process.env.PORT ?? 3000;

async function main() {
  let app = express();

  /** @type {Renderer} */
  let renderer;

  let [devRenderer, vite] = await createDevRenderer(options);
  renderer = devRenderer;
  app.use(vite.middlewares);

  app.get('/', async (req, res) => {
    let document = await renderer.render(
      'main',
      {},
      { [requestContextKey]: req },
    );

    res.set('Content-Type', 'text/html');

    res.status(200).send(document);
  });

  app.listen(port, () => {
    console.log(`Listening on localhost:${port}`);
  });
}

main();
