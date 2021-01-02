import AggregateError from 'aggregate-error';
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
    installOptions: {
      externalPackage: [...builtinModules],
    },
    mount: {
      [pathJoin(cwd, 'src')]: { url: '/_src_' },
    },
    plugins,
  };

  const [errs, config] = createConfiguration(unvalidatedConfig);

  if (errs) {
    throw new AggregateError(errs);

    // TODO: Figure out why this check is necessary, given that
    // createConfiguration returns a tuple.
  } else if (!config) {
    throw new Error('Could not load snowpack configuration');
  }

  return config;
}

/**
 * Converts a path to a Snowpack URL in web_modules or a mounted directory.
 */
export function getSnowpackUrlForFile(
  snowpackConfig: SnowpackConfig,
  cwd: string,
  path: string,
): string | null {
  let nodeModulesPath = pathJoin(cwd, 'node_modules');

  let resolvedPath = pathResolve(path);

  let snowpackUrl;

  if (isDefinitelyNodeModule(path)) {
    // If path is in node_modules, we need to convert that to a web_modules URL.
    snowpackUrl = pathJoin('/web_modules', path);
  } else {
    snowpackUrl = resolvedPath.startsWith(nodeModulesPath)
      ? pathJoin('/web_modules', resolvedPath.replace(nodeModulesPath, ''))
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
