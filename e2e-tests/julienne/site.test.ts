import { promises as fs } from 'fs';
import http from 'http';
import { join as pathJoin } from 'path';
import rimraf from 'rimraf';
import serve from 'serve-handler';
import { Site, Store } from 'julienne';
import { renderToString } from './__fixtures__/render-raw-html';
import type { Component } from './__fixtures__/types';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type _ from 'jest-playwright-preset/types/global';

type Await<T> = T extends PromiseLike<infer U> ? U : T;

let templates = {
  main: pathJoin(process.cwd(), 'src/template-raw-html.js'),
} as const;

let runtime = './src/runtime.js';

describe('Site', () => {
  describe('generate', () => {
    let port = 8080;
    let internalOutputDirectory = pathJoin(process.cwd(), '.julienne-generate');
    let publicOutputDirectory = pathJoin(process.cwd(), 'public');

    function readGeneratedFile(path: string) {
      return fs.readFile(pathJoin(publicOutputDirectory, path), 'utf8');
    }

    beforeAll(async () => {
      let site = new Site({
        output: {
          internal: internalOutputDirectory,
          public: publicOutputDirectory,
        },
        renderToString,
        runtime,
        templates,
      });

      let store = new Store<typeof templates>();

      store.createPage('/test', () => ({
        template: 'main',
        props: { name: 'World' },
      }));

      store.createFile('/index.json', () => JSON.stringify({ key: 'val' }));

      await site.build({ store });
    });

    afterAll(() => {
      rimraf.sync(internalOutputDirectory);
      rimraf.sync(publicOutputDirectory);
    });

    test('writes static html to output directory', async () => {
      let generatedTestPage = await readGeneratedFile('/test/index.html');

      expect(generatedTestPage).toContain('Hello, World');
    });

    test('writes files to output directory', async () => {
      let generatedIndexJson = await readGeneratedFile('/index.json');

      expect(generatedIndexJson).toBe(JSON.stringify({ key: 'val' }));
    });

    test('includes generated assets on pages', async () => {
      let server = http.createServer((req, res) => {
        return serve(req, res, { public: publicOutputDirectory });
      });

      await new Promise<void>((resolve) => {
        server.listen(port, () => {
          resolve();
        });
      });

      await page.goto(`http://localhost:${port}/test`, {
        waitUntil: 'load',
      });
      await page.waitForSelector('.runtime-loaded', {
        state: 'attached',
      });

      let rootHtml = await page.$eval(
        '#julienne-root',
        (root) => root.innerHTML,
      );

      expect(rootHtml).toBe('Hello, World__generated');

      server.close();
    });
  });

  describe('dev', () => {
    let port = 5000;

    let site: Site<Component, typeof templates>;

    let serverActions: Await<ReturnType<typeof site.dev>>;

    beforeAll(async () => {
      site = new Site({
        renderToString,
        runtime,
        templates,
      });

      let store = new Store<typeof templates>();

      store.createPage('/test', () => ({
        template: 'main',
        props: { name: 'World' },
      }));

      serverActions = await site.dev({ port, store });
    });

    afterAll(async () => {
      await serverActions.close();
    });

    test('serves pages for local development', async () => {
      await page.goto(`http://localhost:${port}/test`, {
        waitUntil: 'load',
      });
      await page.waitForSelector('.runtime-loaded', {
        state: 'attached',
      });

      let rootHtml = await page.$eval(
        '#julienne-root',
        (root) => root.innerHTML,
      );

      expect(rootHtml).toBe('Hello, World__generated');
    });
  });
});
