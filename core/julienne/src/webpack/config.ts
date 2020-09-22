import * as path from 'path';

import type {
  PluginItem as BabelPluginItem,
  TransformOptions as BabelTransformOptions,
} from '@babel/core';
import webpack from 'webpack';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import svelteAutoPreprocess from 'svelte-preprocess';
import nodeExternals from 'webpack-node-externals';
import VirtualModulesPlugin from 'webpack-virtual-modules';

import { identity } from '../utils';
import { FlaggedModulePlugin } from './plugin';
import type { Mode } from '../types';

type SimplifiedBabelTransformOptions = {
  plugins: BabelPluginItem[];
  presets: BabelPluginItem[];
};

type ConfigureBabel = ({
  plugins,
  presets,
}: SimplifiedBabelTransformOptions) => BabelTransformOptions;

const defaultBabelConfig = {
  plugins: [
    require.resolve('@babel/plugin-proposal-optional-chaining'),
    require.resolve('@babel/plugin-proposal-class-properties'),
    require.resolve('@babel/plugin-proposal-object-rest-spread'),
  ],
  presets: [
    require.resolve('@babel/preset-typescript'),
    [
      require.resolve('@babel/preset-env'),
      {
        corejs: '3',
        useBuiltIns: 'entry',
      },
    ],
  ],
};

const defaultReactBabelConfig = {
  plugins: [
    require.resolve('@babel/plugin-proposal-optional-chaining'),
    require.resolve('@babel/plugin-proposal-class-properties'),
    require.resolve('@babel/plugin-proposal-object-rest-spread'),
  ],
  presets: [
    require.resolve('@babel/preset-react'),
    require.resolve('@babel/preset-typescript'),
    [
      require.resolve('@babel/preset-env'),
      {
        corejs: '3',
        useBuiltIns: 'entry',
      },
    ],
  ],
};

const hotMiddlewareEntryPath = require.resolve('webpack-hot-middleware/client');
const hotMiddlewareEntry = `${hotMiddlewareEntryPath}?reload=true`;

const alias = { svelte: path.resolve('node_modules', 'svelte') };

const getRules = {
  js({ configureBabel = identity }: { configureBabel?: ConfigureBabel }) {
    return {
      test: /\.(js|ts|mjs)$/,
      use: {
        loader: require.resolve('babel-loader'),
        options: configureBabel(defaultBabelConfig),
      },
      exclude: /node_modules/,
    };
  },
  react({ configureBabel = identity }: { configureBabel?: ConfigureBabel }) {
    return {
      test: /\.(jsx|tsx)$/,
      use: {
        loader: require.resolve('babel-loader'),
        options: configureBabel(defaultReactBabelConfig),
      },
      exclude: /node_modules/,
    };
  },
  svelte({
    css,
    dev,
    emitCss,
    generate,
    hydratable,
    useReplaceLoader = false,
  }: {
    css?: boolean;
    dev: boolean;
    emitCss?: boolean;
    generate?: 'ssr';
    hydratable: boolean;
    useReplaceLoader?: boolean;
  }) {
    let svelteUse: webpack.RuleSetUseItem[] = [
      {
        loader: require.resolve('svelte-loader'),
        options: {
          css,
          dev,
          emitCss,
          generate,
          hydratable,
          hotReload: false, // pending https://github.com/sveltejs/svelte/issues/2377
          preprocess: svelteAutoPreprocess(),
        },
      },
    ];

    if (useReplaceLoader) {
      svelteUse.unshift({
        loader: require.resolve('./replace-loader'),
        options: {
          flag: /on:click=/,
        },
      });
    }

    return {
      test: /\.(svelte|html)$/,
      use: svelteUse,
    };
  },
  css({ dev }: { dev: boolean }) {
    return {
      test: /\.css$/i,
      use: dev
        ? [require.resolve('style-loader'), require.resolve('css-loader')]
        : [MiniCssExtractPlugin.loader, require.resolve('css-loader')],
    };
  },
};

const filenames = {
  development: 'static/chunks/[name].js',
  production: 'static/chunks/[name]-[contenthash].js',
};

const chunkFilenames = {
  development: 'static/chunks/[name].chunk.js',
  production: 'static/chunks/[name].[contenthash].js',
};

const cssFilename = 'static/css/[contenthash].css';
const cssChunkFilename = 'static/css/[contenthash].css';

export function createServerConfig({
  __experimentalIncludeStaticModules = true,
  configureBabel,
  cwd,
  entrySource,
  mode,
  outputPath,
  publicPath,
}: {
  __experimentalIncludeStaticModules: boolean;
  configureBabel?: ConfigureBabel;
  cwd: string;
  entrySource: string;
  mode: Mode;
  outputPath: string;
  publicPath: string;
}): webpack.Configuration {
  let dev = mode === 'development';

  // This path must be in cwd so that relative imports of template modules in
  // the virtual server module work correctly.
  let entryPath = `./___julienne_server___.mjs`;

  let resolve = {
    alias,
    extensions: [
      '.js',
      '.jsx',
      '.mjs',
      '.ts',
      '.tsx',
      '.svelte',
      '.json',
      '.html',
    ],
    mainFields: ['svelte', 'main', 'module'],
  };

  return {
    context: cwd,
    entry: { server: entryPath },
    externals: [nodeExternals()],
    target: 'node',
    resolve,
    module: {
      rules: [
        getRules.js({ configureBabel }),
        getRules.react({ configureBabel }),
        getRules.svelte({
          css: false,
          dev,
          generate: 'ssr',
          hydratable: true,
          useReplaceLoader: !__experimentalIncludeStaticModules,
        }),
      ],
    },
    mode,
    output: {
      path: outputPath,
      filename: '[name].js',
      chunkFilename: '[name].[id].js',
      publicPath,
      libraryTarget: 'commonjs2',
    },
    optimization: {
      minimize: false,
    },
    performance: {
      hints: false, // it doesn't matter if server.js is large
    },
    plugins: [
      new VirtualModulesPlugin({
        [entryPath]: entrySource,
      }),
    ],
  };
}

type EntryName = string;

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
  configureBabel,
  cwd,
  entry,
  mode,
  outputPath,
  publicPath,
  runtime,
}: {
  __experimentalIncludeStaticModules: boolean;
  configureBabel?: ConfigureBabel;
  cwd: string;
  entry: Record<EntryName, string>;
  mode: Mode;
  outputPath: string;
  publicPath: string;
  runtime: string;
}): webpack.Configuration {
  let dev = mode === 'development';

  let resolve = {
    alias,
    extensions: [
      '.mjs',
      '.js',
      '.jsx',
      '.ts',
      '.tsx',
      '.svelte',
      '.json',
      '.html',
    ],
    // Resolve browser before other module types so that modules that depend
    // on this functionality work in the client bundle.
    mainFields: ['svelte', 'browser', 'module', 'main'],
  };

  // Creates virtual entries in cwd so that relative imports of template modules
  // work correctly.
  let virtualEntryManifest = __experimentalIncludeStaticModules
    ? Object.fromEntries(
        Object.entries(entry).map(([entryName, entryPath]) => {
          let virtualFilename = `___julienne_${entryName}___.mjs`;
          let virtualPath = `./${virtualFilename}`;
          return [
            entryName,
            {
              virtualPath,
              importPath: entryPath,
            },
          ];
        }),
      )
    : null;

  let finalEntry =
    virtualEntryManifest !== null
      ? Object.fromEntries(
          Object.entries(virtualEntryManifest).map(([entryName, entry]) => {
            let entryChunks = [entry.virtualPath];

            if (dev) {
              entryChunks.push(hotMiddlewareEntry);
            }

            return [entryName, entryChunks];
          }),
        )
      : entry;

  let rules: webpack.RuleSetRule[] = [
    getRules.js({ configureBabel }),
    getRules.react({ configureBabel }),
    getRules.svelte({
      dev,
      emitCss: __experimentalIncludeStaticModules,
      hydratable: !dev,
    }),
  ];

  if (__experimentalIncludeStaticModules) {
    rules.push(getRules.css({ dev }));
  }

  let plugins = [];

  if (virtualEntryManifest !== null) {
    plugins.push(
      new VirtualModulesPlugin(
        Object.fromEntries(
          Object.values(virtualEntryManifest).map(
            ({ virtualPath, importPath }) => {
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

    if (!dev) {
      plugins.push(
        new MiniCssExtractPlugin({
          filename: cssFilename,
          chunkFilename: cssChunkFilename,
        }),
      );
    }
  } else {
    if (!dev) {
      plugins.push(
        new FlaggedModulePlugin({
          childConfig: {
            module: {
              rules: [
                getRules.js({ configureBabel }),
                getRules.svelte({
                  dev: false,
                  emitCss: true,
                  hydratable: true,
                }),
                getRules.css({ dev: false }),
              ],
            },
            output: {
              path: outputPath,
              filename: filenames.production,
              chunkFilename: chunkFilenames.production,
              publicPath,
            },
            plugins: [
              new webpack.DefinePlugin({
                'process.browser': true,
                'process.env.NODE_ENV': JSON.stringify(mode),
              }),
              new MiniCssExtractPlugin({
                filename: cssFilename,
                chunkFilename: cssChunkFilename,
              }),
            ],
          },
          flag: '/* julienne: "include" */',
        }),
      );
    }
  }

  if (dev) {
    plugins.push(new webpack.HotModuleReplacementPlugin());
  }

  let filename = filenames[mode];
  let chunkFilename = chunkFilenames[mode];

  return {
    context: cwd,
    devtool: 'source-map',
    entry: finalEntry,
    output: {
      path: outputPath,
      filename: __experimentalIncludeStaticModules
        ? filename
        : 'unused/[name].js',
      chunkFilename,
      publicPath,
    },
    resolve,
    module: {
      rules,
    },
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
    plugins,
  };
}
