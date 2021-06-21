// @ts-check
import del from 'del';
import express from 'express';
import { build, createRenderer, requestContextKey } from 'julienne';
import * as path from 'path';
import sirv from 'sirv';
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

let test = suite('e2e:prod');

test.before(ENV.setup);
test.after(ENV.reset);

test.before.each((context) => {
  let outputDirName = Math.random().toString(36).substring(7);

  let baseOutputDir = path.join(cwd, outputDirName);

  context.baseOutputDir = baseOutputDir;

  context.output = {
    internal: path.join(baseOutputDir, '.julienne'),
    public: path.join(baseOutputDir, 'public'),
  };
});

test.after.each(async (context) => {
  await del(context.baseOutputDir);
});

test('serves pages', async (context) => {
  /** @type {import('playwright').Page} */
  let page = context.page;
  let output = context.output;

  let port = 5000;
  let app = express();

  await build({ ...options, output });

  let renderer = await createRenderer({ ...options, output });

  app.use(sirv(output.public));

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

  await stop();
});

test.run();
