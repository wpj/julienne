import { isAbsolute as isAbsolutePath, extname } from 'path';
import { loadPartialConfig } from '@babel/core';
import type webpack from 'webpack';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

const defaultBabelConfig = {
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

/**
 * Mark packages that resolve to JS files as external.
 *
 * This is preferable to externalizing everything in node_modules because it
 * lets webpack bundle dependencies that node doesn't know how to handle, like
 * CSS.
 */
function handleExternal(
  _context: string,
  request: string,
  callback: webpack.ExternalsFunctionCallback,
) {
  // Don't externalize relative/absolute imports.
  if (request.startsWith('.') || isAbsolutePath(request)) {
    callback();
    return;
  }

  let resolved = require.resolve(request);
  let ext = extname(resolved);

  let isNodeModule = resolved.includes('/node_modules/');
  let isJs = ext === '.js' || ext === '.mjs';

  if (isNodeModule && isJs) {
    callback(null, request);
  } else {
    callback();
  }
}

const getRules = {
  js() {
    let userBabelConfig = loadPartialConfig();

    let babelOptions =
      userBabelConfig !== null && userBabelConfig.hasFilesystemConfig()
        ? userBabelConfig.options
        : defaultBabelConfig;

    return {
      test: /\.(js|jsx|ts|tsx|mjs)$/,
      use: {
        loader: require.resolve('babel-loader'),
        options: babelOptions,
      },
      exclude: /node_modules/,
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
    extensions: ['.js', '.jsx', '.mjs', '.ts', '.tsx', '.json'],
    mainFields: ['main', 'module'],
  };

  return {
    externals: [handleExternal],
    module: {
      rules: [
        getRules.js(),
        getRules.css({ dev, isServer: true, modules: cssModules }),
      ],
    },
    resolve,
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
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json'],
    // Resolve browser before other module types so that modules that depend
    // on this functionality work in the client bundle.
    mainFields: ['browser', 'module', 'main'],
  };

  let rules: webpack.RuleSetRule[] = [
    getRules.js(),
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
    module: {
      rules,
    },
    plugins,
    resolve,
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
