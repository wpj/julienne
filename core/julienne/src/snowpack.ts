import { builtinModules } from 'module';
import {
  isAbsolute as isAbsolutePath,
  join as pathJoin,
  resolve as pathResolve,
} from 'path';
import {
  createConfiguration,
  getUrlForFile,
  SnowpackConfig,
  SnowpackUserConfig,
} from 'snowpack';

function isDefinitelyNodeModule(path: string) {
  return (
    !path.startsWith('./') && !path.startsWith('../') && !isAbsolutePath(path)
  );
}

export const META_URL_PATH = '_snowpack';
export const PKG_URL_PATH = `/${META_URL_PATH}/pkg`;

export function getConfig({
  cwd,
  port,
  runtime,
  userConfig,
}: {
  cwd: string;
  port: number;
  runtime: string;
  userConfig: SnowpackUserConfig | null;
}): SnowpackConfig {
  let additionalPlugins = userConfig?.plugins ?? [];

  let plugins = [...additionalPlugins];

  if (isDefinitelyNodeModule(runtime)) {
    plugins.push([
      require.resolve('snowpack-plugin-known-entrypoints'),
      {
        entrypoints: [runtime],
      },
    ]);
  }

  let unvalidatedConfig: SnowpackUserConfig = {
    buildOptions: {
      clean: true,
      metaUrlPath: META_URL_PATH,
      out: '.julienne/staging',
    },
    devOptions: {
      hmr: true,
      open: 'none',
      output: 'stream',
      port,
    },
    exclude: [pathJoin(cwd, 'src/build/**/*')],
    // NOTE: If the decision is made to build server files with snowpack, set experiments.ssr to true.
    packageOptions: {
      external: [...builtinModules],
    },
    mount: {
      [pathJoin(cwd, 'src')]: { url: '/_src_' },
    },
    plugins,
    root: cwd,
  };

  const config = createConfiguration(unvalidatedConfig);

  return config;
}

/**
 * Converts a path to a Snowpack URL in PKG_URL_PATH or a mounted directory.
 */
export function getSnowpackUrlForFile(
  snowpackConfig: SnowpackConfig,
  path: string,
): string | null {
  let cwd = snowpackConfig.root;
  let nodeModulesPath = pathJoin(cwd, 'node_modules');

  let resolvedPath = pathResolve(path);

  let snowpackUrl;

  if (isDefinitelyNodeModule(path)) {
    // If path is in node_modules, we need to convert that to a PKG_URL_PATH URL.
    snowpackUrl = pathJoin(PKG_URL_PATH, path);
  } else {
    snowpackUrl = resolvedPath.startsWith(nodeModulesPath)
      ? pathJoin(PKG_URL_PATH, resolvedPath.replace(nodeModulesPath, ''))
      : getUrlForFile(path, snowpackConfig);
  }

  // If a snowpack URL was found, we want to make sure that it has a js
  // extension.
  if (snowpackUrl !== null) {
    if (!snowpackUrl.endsWith('.js')) {
      snowpackUrl = `${snowpackUrl}.js`;
    }
  }

  return snowpackUrl;
}
