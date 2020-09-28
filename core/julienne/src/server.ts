import send from '@polka/send';
import sendType from '@polka/send-type';
import { createReadStream } from 'fs';
import { Server as HttpServer } from 'http';
import mime from 'mime-types';
import { basename } from 'path';
import polka from 'polka';
import webpack, { Stats as WebpackStats } from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import mergeWebpackConfigs from 'webpack-merge';
import { ClientCompilation, Compilation } from './compilation';
import type { RenderToString } from './render';
import type {
  DevServerActions,
  FileMap,
  PageMap,
  TemplateConfig,
  WebpackConfig,
} from './types';
import { cleanWebpackConfig, getAssets } from './utils';
import { createClientConfig } from './webpack';

// Patch polkas types - there should be a server field on polka instances.
declare module 'polka' {
  interface Polka {
    server: HttpServer;
  }
}

let defaultDevPublicPath = '/';

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

/**
 * webpack-dev-middleware stores the compilation stats in the ServerResponse
 * object. For more info, see
 * https://github.com/webpack/webpack-dev-middleware#server-side-rendering.
 */
function getDevWebpackStatsFromLocals(locals: {
  webpackStats?: WebpackStats;
  webpack?: { devMiddleware: { stats: WebpackStats } };
}): WebpackStats | undefined {
  return locals.webpackStats || locals.webpack?.devMiddleware.stats;
}

export class Server<Component, Templates extends TemplateConfig> {
  files: FileMap;
  pages: PageMap<keyof Templates>;
  renderToString: RenderToString<Component>;
  runtime: string;
  templates: Templates;
  webpackConfig: WebpackConfig | null;

  constructor({
    files,
    pages,
    renderToString,
    runtime,
    templates,
    webpackConfig,
  }: {
    files: FileMap;
    pages: PageMap<keyof Templates>;
    renderToString: RenderToString<Component>;
    runtime: string;
    templates: Templates;
    webpackConfig?: WebpackConfig;
  }) {
    this.files = files;
    this.pages = pages;
    this.renderToString = renderToString;
    this.runtime = runtime;
    this.templates = templates;
    this.webpackConfig = webpackConfig ?? null;
  }

  async start({ port }: { port: number }): Promise<DevServerActions> {
    let {
      files,
      pages,
      renderToString,
      templates,
      runtime,
      webpackConfig: baseWebpackConfig,
    } = this;

    let clientWebpackConfig = mergeWebpackConfigs(
      cleanWebpackConfig(baseWebpackConfig?.client ?? {}),
      createClientConfig({
        __experimentalIncludeStaticModules: true,
        mode: 'development',
        publicPath: defaultDevPublicPath,
        runtime,
        templates,
      }),
    );

    let clientWebpackCompiler = webpack(clientWebpackConfig);

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

    let devMiddleware = webpackDevMiddleware(clientWebpackCompiler, {
      serverSideRender: true,
      stats: 'errors-warnings',

      /*
       * webpack-dev-middleware v4 logging configuration.
       */

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      infrastructureLogging: { level: 'error' },

      /*
       * webpack-dev-middleware v3 logging configuration
       */
      logLevel: 'error',
    });
    let hotMiddleware = webpackHotMiddleware(clientWebpackCompiler, {
      log: false,
    });

    app.use(devMiddleware, hotMiddleware);

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

      let stats = getDevWebpackStatsFromLocals(res.locals);

      if (!stats) {
        send(res, 500, 'Something went wrong with the webpack compilation.');
        return;
      }

      let info = stats.toJson();

      if (info.assetsByChunkName === undefined) {
        send(res, 500, 'Webpack compilation is missing asset information.');
        return;
      }

      if (pageAction.type === 'remove') {
        send(res, 404, 'Not found');
        return;
      }

      let getPage = pageAction.getData;

      let page = await getPage();

      let clientCompilation = new ClientCompilation({
        chunkAssets: info.assetsByChunkName,
        hash: 'fake-dev-hash',
        publicPath: defaultDevPublicPath,
        templates,
        warnings: info.warnings,
      });

      let compilation = new Compilation({
        client: clientCompilation,
        server: null,
      });

      let templateAssets =
        compilation.client.templateAssets[page.template as string];

      let { scripts, stylesheets } = getAssets(templateAssets);

      let renderedPage = await renderToString({
        props: page.props,
        scripts,
        stylesheets,
        template: {
          name: page.template as string,
          component: null,
        },
      });

      send(res, 200, renderedPage, {
        'Content-Type': 'text/html;charset=utf-8',
      });
    });

    app.use('__julienne__', api);

    let server = await startApp(app, port);

    let actions = {
      close: () => {
        devMiddleware.close();
        server.close();
      },
    };

    return new Promise((resolve) => {
      devMiddleware.waitUntilValid(() => {
        resolve(actions);
      });
    });
  }
}
