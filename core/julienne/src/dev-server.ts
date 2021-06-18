import { App } from '@tinyhttp/app';
import { createReadStream } from 'fs';
import { Server as HttpServer } from 'http';
import mime from 'mime-types';
import { basename } from 'path';
import {
  createServer as createViteServer,
  UserConfig as ViteUserConfig,
} from 'vite';
import type { Store } from './store';
import type {
  DevServerActions,
  OnLookup,
  RenderToString,
  TemplateConfig,
} from './types';
import {
  getTemplateManifest,
  getVirtualEntriesFromManifest,
  virtualPlugin,
} from './utils';

type Await<T> = T extends PromiseLike<infer U> ? U : T;

async function startApp(app: App, port: number): Promise<HttpServer> {
  return new Promise((resolve) => {
    let server = app.listen(port, () => {
      resolve(server);
    });
  });
}

export class DevServer<Component, Templates extends TemplateConfig> {
  cwd: string;
  renderToString: RenderToString<Component>;
  runtime: string;
  store: Store<Templates>;
  templates: Templates;
  viteConfig: ViteUserConfig;

  constructor({
    cwd,
    renderToString,
    runtime,
    store,
    templates,
    viteConfig = {},
  }: {
    cwd: string;
    renderToString: RenderToString<Component>;
    runtime: string;
    store: Store<Templates>;
    templates: Templates;
    viteConfig?: ViteUserConfig;
  }) {
    this.cwd = cwd;
    this.renderToString = renderToString;
    this.runtime = runtime;
    this.store = store;
    this.templates = templates;
    this.viteConfig = viteConfig;
  }

  async start({
    onLookup,
    port,
  }: {
    onLookup?: OnLookup;
    port: number;
  }): Promise<DevServerActions> {
    let {
      cwd,
      renderToString,
      runtime,
      viteConfig: viteUserConfig,
      store,
      templates,
    } = this;

    let entryManifest = getTemplateManifest({
      cwd,
      dev: true,
      hydrate: true,
      runtime,
      templates,
    });

    let virtualEntries = getVirtualEntriesFromManifest(entryManifest);

    let viteConfig: ViteUserConfig = {
      ...viteUserConfig,
      logLevel: viteUserConfig.logLevel ?? 'silent',
      root: cwd,
      plugins: [
        virtualPlugin(virtualEntries),
        ...(viteUserConfig.plugins ?? []),
      ],
    };

    let vite = await createViteServer({
      ...viteConfig,
      configFile: false,
      server: {
        middlewareMode: true,
      },
    });

    let api = new App();

    /**
     * Returns the props for the page specified by the path query string
     * parameter.
     */
    api.get('/page', async (req, res) => {
      let { path } = req.query;

      if (typeof path !== 'string') {
        res.status(400).send('Invalid path param');

        return;
      }

      let lookupTeardown = onLookup ? await onLookup(path) : undefined;
      let resource = store.get(path);
      if (lookupTeardown) {
        await lookupTeardown();
      }

      if (resource === undefined || resource.action.type === 'remove') {
        res.status(404).json({ error: 'Not found' });

        return;
      }

      if (resource.type !== 'page') {
        res.status(500).json({
          error: `Expected to find page at ${path}, found file instead`,
        });
        return;
      }

      let getPage = resource.action.getData;
      let page = await getPage();
      res.json(page);
    });

    let app = new App();

    app.use(vite.middlewares);

    app.use(async (req, res, next) => {
      let { path, originalUrl: url } = req;
      let lookupTeardown = onLookup ? await onLookup(path) : undefined;
      let resource = store.get(path);
      if (lookupTeardown) {
        await lookupTeardown();
      }

      if (resource === undefined) {
        next();
        return;
      }

      if (resource.action.type === 'remove') {
        res.status(404).send('File not found');
        return;
      }

      switch (resource.type) {
        /**
         * Serve requests for known files (those created by createFile or
         * copyFile).
         */
        case 'file': {
          let getFile = resource.action.getData;

          let file = await getFile();

          let data =
            file.type === 'copy' ? createReadStream(file.from) : file.data;

          let contentType = mime.contentType(
            path.endsWith('/') ? 'index.html' : basename(path),
          );

          if (contentType) {
            res.set('Content-Type', contentType);
          }

          res.send(data);

          return;
        }

        /**
         * Server render page requests. This skips rendering the template on the
         * server and instead does a client-side only rendering.
         */
        case 'page': {
          let getPage = resource.action.getData;

          let page = await getPage();

          try {
            let templateMod: Await<ReturnType<typeof vite.ssrLoadModule>>;
            try {
              templateMod = await vite.ssrLoadModule(templates[page.template]);
            } catch (e) {
              return res
                .status(500)
                .send(
                  `Could not find server module for template '${page.template}'`,
                );
            }

            let scripts = [
              {
                type: 'module',
                src: entryManifest[page.template as string].path,
              },
            ];

            let renderedPage = await renderToString({
              dev: true,
              links: [],
              props: page.props,
              scripts,
              template: {
                name: page.template as string,
                component: templateMod.default,
              },
            });

            let transformedPage = await vite.transformIndexHtml(
              url,
              renderedPage,
            );

            res.type('text/html;charset=utf-8').send(transformedPage);

            return;
          } catch (e) {
            vite.ssrFixStacktrace(e);
            console.error(e);
            res.status(500).end(e.message);
          }
        }
      }
    });

    app.use('__julienne__', api);

    let server = await startApp(app, port);

    let actions = {
      close: async () => {
        server.close();
        await vite.close();
      },
    };

    return actions;
  }
}
