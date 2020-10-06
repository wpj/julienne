import * as path from 'path';

import { loadPartialConfig } from '@babel/core';
import type webpack from 'webpack';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import svelteAutoPreprocess from 'svelte-preprocess';

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

const alias = { svelte: path.resolve('node_modules', 'svelte') };

const getRules = {
  js() {
    let userBabelConfig = loadPartialConfig();

    let babelOptions =
      userBabelConfig !== null && userBabelConfig.hasFilesystemConfig()
        ? userBabelConfig.options
        : defaultBabelConfig;

    return {
      test: /\.(js|ts|mjs)$/,
      use: {
        loader: require.resolve('babel-loader'),
        options: babelOptions,
      },
      exclude: /node_modules/,
    };
  },
  svelte({
    css,
    dev,
    generate,
    hydratable,
  }: {
    css: boolean;
    dev: boolean;
    generate?: 'ssr';
    hydratable: boolean;
  }) {
    let svelteUse: webpack.RuleSetUseItem[] = [
      {
        loader: require.resolve('svelte-loader'),
        options: {
          css,
          dev,
          emitCss: css,
          generate,
          hydratable,
          hotReload: false, // pending https://github.com/sveltejs/svelte/issues/2377
          preprocess: svelteAutoPreprocess(),
        },
      },
    ];

    return {
      test: /\.(svelte|html)$/,
      use: svelteUse,
    };
  },
  css({
    dev,
    isServer,
    modules,
  }: {
    dev: boolean;
    isServer: boolean;
    modules: boolean;
  }) {
    let loaders = [];

    if (!isServer) {
      if (dev) {
        loaders.push({ loader: require.resolve('style-loader') });
      } else {
        loaders.push({
          loader: MiniCssExtractPlugin.loader,
        });
      }
    }

    loaders.push({
      loader: require.resolve('css-loader'),
      options: {
        modules: modules
          ? isServer
            ? { exportOnlyLocals: true }
            : true
          : false,
      },
    });

    return {
      test: /\.css$/i,
      use: loaders,
    };
  },
};

const cssFilename = 'static/css/[contenthash].css';
const cssChunkFilename = 'static/css/[contenthash].css';

function server({
  cssModules,
  dev,
}: {
  cssModules: boolean;
  dev: boolean;
}): webpack.Configuration {
  let resolve = {
    alias,
    extensions: ['.js', '.mjs', '.ts', '.svelte', '.json', '.html'],
    mainFields: ['svelte', 'main', 'module'],
  };

  return {
    resolve,
    module: {
      rules: [
        getRules.css({ dev, isServer: true, modules: cssModules }),
        getRules.js(),
        getRules.svelte({
          css: false,
          dev,
          generate: 'ssr',
          hydratable: true,
        }),
      ],
    },
  };
}

function client({
  cssModules,
  dev,
}: {
  cssModules: boolean;
  dev: boolean;
}): webpack.Configuration {
  let resolve = {
    alias,
    extensions: ['.mjs', '.js', '.ts', '.svelte', '.json', '.html'],
    // Resolve browser before other module types so that modules that depend
    // on this functionality work in the client bundle.
    mainFields: ['svelte', 'browser', 'module', 'main'],
  };

  let rules: webpack.RuleSetRule[] = [
    getRules.js(),
    getRules.svelte({
      css: true,
      dev,
      hydratable: !dev,
    }),
    getRules.css({ dev, isServer: false, modules: cssModules }),
  ];

  let plugins = [];

  if (!dev) {
    plugins.push(
      new MiniCssExtractPlugin({
        filename: cssFilename,
        chunkFilename: cssChunkFilename,
      }),
    );
  }

  return {
    resolve,
    module: {
      rules,
    },
    plugins,
  };
}

export function createWebpackConfig({
  cssModules = false,
  dev = false,
}: {
  cssModules?: boolean;
  dev?: boolean;
} = {}): { client: webpack.Configuration; server: webpack.Configuration } {
  return {
    client: client({ cssModules, dev }),
    server: server({ cssModules, dev }),
  };
}
