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
import type {
  DevServerActions,
  FileMap,
  PageMap,
  TemplateConfig,
} from './types';

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
  files: FileMap;
  pages: PageMap<keyof Templates>;
  renderToString: RenderToString<Component>;
  runtime: string;
  templates: Templates;
  snowpackConfig: SnowpackUserConfig | null;

  constructor({
    cwd,
    files,
    pages,
    renderToString,
    runtime,
    templates,
    snowpackConfig,
  }: {
    cwd: string;
    files: FileMap;
    pages: PageMap<keyof Templates>;
    renderToString: RenderToString<Component>;
    runtime: string;
    templates: Templates;
    snowpackConfig?: SnowpackUserConfig;
  }) {
    this.cwd = cwd;
    this.files = files;
    this.pages = pages;
    this.renderToString = renderToString;
    this.runtime = runtime;
    this.templates = templates;
    this.snowpackConfig = snowpackConfig ?? null;
  }

  async start({ port }: { port: number }): Promise<DevServerActions> {
    let {
      cwd,
      files,
      pages,
      renderToString,
      runtime,
      snowpackConfig: userSnowpackConfig,
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

      let pageAction = pages.get(path);

      let getPage = pageAction?.type === 'create' ? pageAction.getData : null;

      if (getPage !== null) {
        let page = await getPage();
        sendType(res, 200, page);
      } else {
        sendType(res, 404, { error: 'Not found' });
      }
    });

    let app = polka();

    /**
     * Serve requests for known files (those created by createFile or
     * copyFile).
     */
    app.use(async (req, res, next) => {
      let { path } = req;

      let fileAction = files.get(path);

      if (fileAction === undefined) {
        next();
        return;
      }

      if (fileAction.type === 'remove') {
        send(res, 404, 'Not found');
        return;
      }

      let getFile = fileAction.getData;

      let file = await getFile();

      let data = file.type === 'copy' ? createReadStream(file.from) : file.data;

      let contentType = mime.contentType(
        path.endsWith('/') ? 'index.html' : basename(path),
      );

      let headers = contentType ? { 'Content-Type': contentType } : undefined;

      sendType(res, 200, data, headers);
    });

    /**
     * Server render page requests. This skips rendering the template on the
     * server and instead does a client-side only rendering.
     */
    app.use(async (req, res, next) => {
      let { path } = req;

      let pageAction = pages.get(path);

      if (pageAction === undefined) {
        return next();
      }

      if (pageAction.type === 'remove') {
        send(res, 404, 'Not found');
        return;
      }

      let getPage = pageAction.getData;

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
        send(res, 500, `Could not find Snowpack URL for runtime ${runtime}`);
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
    });

    app.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
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
