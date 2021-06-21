// @ts-check
import express from 'express';
import { createDevRenderer, createRenderer, requestContextKey } from 'julienne';
import sirv from 'sirv';
import { sharedOptions as options } from './config';

/**
 * @typedef {import('./types/app').Renderer} Renderer
 * @typedef {import('react').ComponentType} ComponentType
 */

let port = process.env.PORT ?? 3000;
let dev = process.env.NODE_ENV === 'development';

async function main() {
  let app = express();

  /** @type {Renderer} */
  let renderer;

  if (dev) {
    let [devRenderer, vite] = await createDevRenderer(options);
    renderer = devRenderer;
    app.use(vite.middlewares);
  } else {
    renderer = await createRenderer(options);
    app.use(sirv('public'));
  }

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
