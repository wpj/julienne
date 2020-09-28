import webpack, {
  Compiler as WebpackCompiler,
  Stats as WebpackStats,
} from 'webpack';
import nodeExternals from 'webpack-node-externals';
import VirtualModulesPlugin from 'webpack-virtual-modules';
import {
  ClientCompilation,
  Compilation,
  CompilationWarnings,
  ServerCompilation,
} from './compilation';
import type { Mode, Output, WebpackConfig } from './types';
import { TemplateConfig } from './types';
import { moduleMapTemplate } from './utils';

const hotMiddlewareEntryPath = require.resolve('webpack-hot-middleware/client');
const hotMiddlewareEntry = `${hotMiddlewareEntryPath}?reload=true`;

const filenames = {
  development: '_julienne/static/chunks/[name].js',
  production: '_julienne/static/chunks/[name]-[contenthash].js',
};

const chunkFilenames = {
  development: '_julienne/static/chunks/[name].chunk.js',
  production: '_julienne/static/chunks/[name].[contenthash].js',
};

export function createServerConfig({
  mode,
  outputPath,
  publicPath,
  templates,
}: {
  __experimentalIncludeStaticModules: boolean;
  mode: Mode;
  outputPath: string;
  publicPath: string;
  templates: TemplateConfig;
}): webpack.Configuration {
  // This path must be in cwd so that relative imports of template modules in
  // the virtual server module work correctly.
  let entryPath = `./___julienne_server___.js`;

  let virtualEntry = moduleMapTemplate(templates, true);

  return {
    entry: { server: entryPath },
    externals: [nodeExternals()],
    mode,
    optimization: {
      minimize: false,
    },
    output: {
      path: outputPath,
      filename: '[name].js',
      chunkFilename: '[name].[id].js',
      publicPath,
      libraryTarget: 'commonjs2',
    },
    performance: {
      hints: false, // it doesn't matter if server.js is large
    },
    plugins: [
      new VirtualModulesPlugin({
        [entryPath]: virtualEntry,
      }),
    ],
    target: 'node',
  };
}

export interface Manifest {
  [entryName: string]: { source: string; path: string };
}

function clientPageRuntimeTemplate({
  dev,
  entryPath,
  hydrate,
  runtime,
}: {
  dev: boolean;
  entryPath: string;
  hydrate: boolean;
  runtime: string;
}) {
  return `
import Template from "${entryPath}";
import runtime from "${runtime}";

runtime({ dev: ${dev}, hydrate: ${hydrate}, template: Template });
`;
}

export function createClientConfig({
  __experimentalIncludeStaticModules = true,
  mode,
  outputPath,
  publicPath,
  runtime,
  templates,
}: {
  __experimentalIncludeStaticModules: boolean;
  mode: Mode;
  // Optional because the dev config has no output.
  outputPath?: string;
  publicPath: string;
  runtime: string;
  templates: TemplateConfig;
}): webpack.Configuration {
  let dev = mode === 'development';

  // Creates virtual entries in cwd so that relative imports of template modules
  // work correctly.
  let virtualTemplateManifest = __experimentalIncludeStaticModules
    ? Object.fromEntries(
        Object.entries(templates).map(([templateName, templatePath]) => {
          let virtualFilename = `___julienne_${templateName}___.js`;
          let virtualPath = `./${virtualFilename}`;
          return [
            templateName,
            {
              virtualPath,
              importPath: templatePath,
            },
          ];
        }),
      )
    : null;

  let entry =
    virtualTemplateManifest !== null
      ? Object.fromEntries(
          Object.entries(virtualTemplateManifest).map(
            ([templateName, { virtualPath }]) => {
              let entryChunks = [virtualPath];

              if (dev) {
                entryChunks.push(hotMiddlewareEntry);
              }

              return [templateName, entryChunks];
            },
          ),
        )
      : templates;

  let plugins = [];

  if (virtualTemplateManifest !== null) {
    plugins.push(
      new VirtualModulesPlugin(
        Object.fromEntries(
          Object.values(virtualTemplateManifest).map(
            ({ importPath, virtualPath }) => {
              return [
                virtualPath,
                clientPageRuntimeTemplate({
                  dev,
                  entryPath: importPath,
                  hydrate: !dev,
                  runtime,
                }),
              ];
            },
          ),
        ),
      ),
    );
  }

  if (dev) {
    plugins.push(new webpack.HotModuleReplacementPlugin());
  }

  let filename = filenames[mode];
  let chunkFilename = chunkFilenames[mode];

  return {
    entry,
    mode,
    optimization:
      __experimentalIncludeStaticModules && !dev
        ? {
            moduleIds: 'hashed',
            runtimeChunk: 'single',
            splitChunks: {
              cacheGroups: {
                vendor: {
                  test: /[\\/]node_modules[\\/]/,
                  name: 'vendor',
                  chunks: 'all',
                },
              },
            },
          }
        : undefined,
    output: {
      path: outputPath,
      filename: __experimentalIncludeStaticModules
        ? filename
        : 'unused/[name].js',
      chunkFilename,
      publicPath,
    },
    plugins,
    target: 'web',
  };
}

export class CompilerError extends Error {
  constructor(message: string | string[]) {
    super(Array.isArray(message) ? message.join('\n') : message);
  }
}

function runWebpackCompiler(
  compiler: WebpackCompiler,
): Promise<{
  assetsByChunkName: NonNullable<
    WebpackStats.ToJsonOutput['assetsByChunkName']
  >;
  hash: string;
  warnings: CompilationWarnings | null;
}> {
  return new Promise((resolve, reject) => {
    compiler.run((err: Error, stats: WebpackStats) => {
      if (err) {
        reject(err);
      } else {
        let info = stats.toJson();

        if (stats.hasErrors()) {
          reject(new CompilerError(info.errors));
        } else if (info.assetsByChunkName === undefined) {
          reject(new CompilerError('Missing assets for chunks'));
        } else if (info.hash === undefined) {
          reject(new CompilerError('Missing build hash'));
        } else {
          resolve({
            assetsByChunkName: info.assetsByChunkName,
            hash: info.hash,
            warnings: stats.hasWarnings() ? info.warnings : null,
          });
        }
      }
    });
  });
}

export class Compiler {
  cwd: string;
  compileServer: boolean;
  output: Output;
  templates: TemplateConfig;
  webpackConfig: WebpackConfig;

  constructor({
    cwd = process.cwd(),
    compileServer,
    output,
    templates,
    webpackConfig,
  }: {
    cwd?: string;
    compileServer: boolean;
    output: Output;
    templates: TemplateConfig;
    webpackConfig: WebpackConfig;
  }) {
    this.compileServer = compileServer;
    this.cwd = cwd;
    this.output = output;
    this.templates = templates;
    this.webpackConfig = webpackConfig;
  }

  getWebpackCompiler(): { client: webpack.Compiler; server: webpack.Compiler } {
    return {
      client: webpack(this.webpackConfig.client),
      server: webpack(this.webpackConfig.server),
    };
  }

  async compile(): Promise<Compilation> {
    let { compileServer, webpackConfig } = this;

    let clientResult = await runWebpackCompiler(webpack(webpackConfig.client));

    let clientCompilation = new ClientCompilation({
      chunkAssets: clientResult.assetsByChunkName,
      hash: clientResult.hash,
      publicPath: this.output.publicPath,
      templates: this.templates,
      warnings: clientResult.warnings,
    });

    let serverCompilation;
    if (compileServer) {
      let serverResult = await runWebpackCompiler(
        webpack(webpackConfig.server),
      );

      serverCompilation = new ServerCompilation({
        chunkAssets: serverResult.assetsByChunkName,
        hash: serverResult.hash,
        outputPath: this.output.server,
        warnings: serverResult.warnings,
      });
    } else {
      serverCompilation = null;
    }

    return new Compilation({
      client: clientCompilation,
      server: serverCompilation,
    });
  }
}
