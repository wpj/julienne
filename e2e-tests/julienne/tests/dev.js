// @ts-check
import express from 'express';
import { createDevRenderer, requestContextKey } from 'julienne';
import { suite } from 'uvu';
import * as assert from 'uvu/assert';
import { render as serverRender } from './fixtures/render-raw-html.js';
import * as ENV from './utils/browser.js';
import { createResolve } from './utils/path.js';
import { startApp } from './utils/server.js';

let cwd = process.cwd();
let resolve = createResolve(import.meta.url);

let templates = {
  main: resolve('../src/template-raw-html.js'),
};

let clientRender = resolve('../src/client-render.js');

let options = {
  cwd,
  render: {
    server: serverRender,
    client: clientRender,
  },
  templates,
};

let test = suite('e2e:dev');

test.before(ENV.setup);
test.after(ENV.reset);

test('serves pages', async (context) => {
  /** @type {import('playwright').Page} */
  let page = context.page;

  let port = 3000;
  let app = express();

  let [renderer, vite] = await createDevRenderer(options);
  app.use(vite.middlewares);

  app.get('/', async (req, res) => {
    let document = await renderer.render(
      'main',
      { name: 'World' },
      { [requestContextKey]: req },
    );

    res.set('Content-Type', 'text/html');

    res.status(200).send(document);
  });

  let stop = await startApp(app, port);

  page.on('requestfailed', (request) => {
    assert.unreachable(`${request.url()} ${request.failure()?.errorText}`);
  });

  await page.goto(`http:localhost:${port}`);

  try {
    await page.waitForSelector('.runtime-loaded');
  } catch (error) {
    assert.unreachable(error.message);
  }

  // Preemptively close the page so that vite's websocket connection doesn't
  // error.
  await page.close();

  await vite.close();
  await stop();
});

test.run();
