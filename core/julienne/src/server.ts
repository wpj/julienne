import { createReadStream } from 'fs';
import { basename } from 'path';

import send from '@polka/send';
import sendType from '@polka/send-type';
import mime from 'mime-types';
import polka from 'polka';
import type {
  Compiler as WebpackCompiler,
  Stats as WebpackStats,
} from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';

import { ClientCompilation, Compilation } from './compilation';
import type { Render } from './render';
import type { GetResource, GetPage, Output, TemplateConfig } from './types';
import { getAssets } from './utils';

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

export function startServer<Templates extends TemplateConfig>({
  clientWebpackCompiler,
  output,
  pages,
  port,
  render,
  resources,
  templates,
}: {
  clientWebpackCompiler: WebpackCompiler;
  output: Output;
  pages: Map<string, GetPage<keyof Templates>>;
  port: number;
  render: Render;
  resources: Map<string, GetResource>;
  templates: Templates;
}): void {
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

    let getPage = pages.get(path);

    if (getPage !== undefined) {
      let page = await getPage();
      sendType(res, 200, page);
    } else {
      sendType(res, 404, { error: 'Not found' });
    }
  });

  let app = polka();

  /**
   * Serve requests for known resources (those created by createResource or
   * copyResource).
   */
  app.use(async (req, res, next) => {
    let { path } = req;

    let getResource = resources.get(path);

    if (getResource === undefined) {
      next();
      return;
    }

    let resource = await getResource();

    let data =
      resource.type === 'file'
        ? createReadStream(resource.from)
        : resource.data;

    let contentType = mime.contentType(
      path.endsWith('/') ? 'index.html' : basename(path),
    );

    let headers = contentType ? { 'Content-Type': contentType } : undefined;

    sendType(res, 200, data, headers);
  });

  app.use(
    webpackDevMiddleware(clientWebpackCompiler, {
      serverSideRender: true,
      stats: 'errors-warnings',
    }),
    webpackHotMiddleware(clientWebpackCompiler),
  );

  /**
   * Server render page requests. This skips rendering the template on the
   * server and instead does a client-side only rendering.
   */
  app.use(async (req, res, next) => {
    let { path } = req;

    let getPage = pages.get(path);

    if (getPage === undefined) {
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

    let page = await getPage();

    let clientCompilation = new ClientCompilation({
      chunkAssets: info.assetsByChunkName,
      publicPath: output.publicPath,
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

    let renderedPage = await render({
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

  app.listen(port, (err: Error) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }

    console.log(`Started on port ${port}`);
  });
}
