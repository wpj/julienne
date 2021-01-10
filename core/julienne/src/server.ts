import send from '@polka/send';
import sendType from '@polka/send-type';
import { createReadStream } from 'fs';
import { IncomingMessage, Server as HttpServer, ServerResponse } from 'http';
import mime from 'mime-types';
import { basename } from 'path';
import polka from 'polka';
import { format } from 'prettier';
import { SnowpackUserConfig, startDevServer } from 'snowpack';
import { clientEntryPointTemplate } from './code-gen';
import type { RenderToString } from './render';
import { getConfig, getSnowpackUrlForFile } from './snowpack';
import type { Store } from './store';
import type { DevServerActions, OnLookup, TemplateConfig } from './types';

// Patch polkas types - there should be a server field on polka instances.
declare module 'polka' {
  interface Polka {
    server: HttpServer;
  }
}

async function startApp(app: polka.Polka, port: number): Promise<HttpServer> {
  return new Promise((resolve, reject) => {
    app.listen(port, (err: Error) => {
      if (err) {
        reject(err);
      } else {
        resolve(app.server);
      }
    });
  });
}

export class Server<Component, Templates extends TemplateConfig> {
  cwd: string;
  renderToString: RenderToString<Component>;
  runtime: string;
  store: Store<Templates>;
  templates: Templates;
  snowpackConfig: SnowpackUserConfig | null;

  constructor({
    cwd,
    renderToString,
    runtime,
    store,
    templates,
    snowpackConfig,
  }: {
    cwd: string;
    renderToString: RenderToString<Component>;
    runtime: string;
    store: Store<Templates>;
    templates: Templates;
    snowpackConfig?: SnowpackUserConfig;
  }) {
    this.cwd = cwd;
    this.renderToString = renderToString;
    this.runtime = runtime;
    this.store = store;
    this.templates = templates;
    this.snowpackConfig = snowpackConfig ?? null;
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
      snowpackConfig: userSnowpackConfig,
      store,
      templates,
    } = this;

    let snowpackPort = 3333;

    let snowpackConfig = getConfig({
      cwd,
      port: snowpackPort,
      userConfig: userSnowpackConfig,
      runtime,
    });

    let snowpackServer = await startDevServer({
      cwd,
      config: snowpackConfig,
      lockfile: null,
    });

    let api = polka();

    /**
     * Returns the props for the page specified by the path query string
     * parameter.
     */
    api.get('/page', async (req, res) => {
      let { path } = req.query;

      if (typeof path !== 'string') {
        sendType(res, 400, 'Invalid path param');
        return;
      }

      let lookupTeardown = onLookup ? await onLookup(path) : undefined;
      let resource = store.get(path);
      if (lookupTeardown) {
        await lookupTeardown();
      }

      if (resource === undefined || resource.action.type === 'remove') {
        sendType(res, 404, { error: 'Not found' });
        return;
      }

      if (resource.type !== 'page') {
        sendType(res, 500, {
          error: `Expected to find page at ${path}, found file instead`,
        });
        return;
      }

      let getPage = resource.action.getData;
      let page = await getPage();
      sendType(res, 200, page);
    });

    let app = polka();

    /**
     * Serve requests for application assets from Snowpack.
     */
    app.use(
      async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (!req.url) {
          next();
          return;
        }

        try {
          const result = await snowpackServer.loadUrl(req.url);
          if (result.contentType) {
            res.setHeader('Content-Type', result.contentType);
          }

          return res.end(result.contents);
        } catch (err) {
          next();
        }
      },
    );

    app.use(async (req, res, next) => {
      let { path } = req;

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
        send(res, 404, 'File Not found');
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

          let headers = contentType
            ? { 'Content-Type': contentType }
            : undefined;

          sendType(res, 200, data, headers);
          return;
        }

        /**
         * Server render page requests. This skips rendering the template on the
         * server and instead does a client-side only rendering.
         */
        case 'page': {
          let getPage = resource.action.getData;

          let page = await getPage();

          let templateUrl = getSnowpackUrlForFile(
            snowpackConfig,
            cwd,
            templates[page.template],
          );

          if (!templateUrl) {
            return send(
              res,
              500,
              `Could not find Snowpack URL for template '${page.template}'`,
            );
          }

          let runtimeUrl = getSnowpackUrlForFile(snowpackConfig, cwd, runtime);

          if (runtimeUrl === null) {
            send(
              res,
              500,
              `Could not find Snowpack URL for runtime ${runtime}`,
            );
            return;
          }

          let entryPoint = clientEntryPointTemplate({
            dev: true,
            hydrate: false,
            runtime: runtimeUrl,
            template: templateUrl,
          });

          let scripts = [
            {
              content: `window.HMR_WEBSOCKET_URL = 'ws://localhost:${snowpackPort}'`,
            },
            { type: 'module', src: '/__snowpack__/hmr-client.js' },
            { content: entryPoint, type: 'module' },
          ];

          let renderedPage = await renderToString({
            dev: true,
            props: page.props,
            scripts,
            stylesheets: [],
            template: {
              name: page.template as string,
              component: null,
            },
          });

          let formattedPage = format(renderedPage, { parser: 'html' });

          send(res, 200, formattedPage, {
            'Content-Type': 'text/html;charset=utf-8',
          });
        }
      }
    });

    app.use('__julienne__', api);

    let server = await startApp(app, port);

    let actions = {
      close: async () => {
        await Promise.allSettled([
          new Promise((resolve) => {
            server.close(resolve);
          }),
          snowpackServer.shutdown(),
        ]);
      },
    };

    return actions;
  }
}
