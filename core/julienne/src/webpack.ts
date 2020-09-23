import webpack from 'webpack';
import nodeExternals from 'webpack-node-externals';
import VirtualModulesPlugin from 'webpack-virtual-modules';

import { moduleMapTemplate } from './utils';
import type { Mode } from './types';

type EntryName = string;

const hotMiddlewareEntryPath = require.resolve('webpack-hot-middleware/client');
const hotMiddlewareEntry = `${hotMiddlewareEntryPath}?reload=true`;

const filenames = {
  development: 'static/chunks/[name].js',
  production: 'static/chunks/[name]-[contenthash].js',
};

const chunkFilenames = {
  development: 'static/chunks/[name].chunk.js',
  production: 'static/chunks/[name].[contenthash].js',
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
  templates: Record<EntryName, string>;
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
  outputPath: string;
  publicPath: string;
  runtime: string;
  templates: Record<EntryName, string>;
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
