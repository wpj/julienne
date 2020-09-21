import webpack, {
  Compiler as WebpackCompiler,
  Stats as WebpackStats,
} from 'webpack';

import type { Mode, Output, TemplateConfig } from './types';
import {
  Compilation,
  ClientCompilation,
  CompilationWarnings,
  ServerCompilation,
} from './compilation';

export class CompilerError extends Error {
  constructor(message: string | string[]) {
    super(Array.isArray(message) ? message.join('\n') : message);
  }
}

import { createClientConfig, createServerConfig } from './webpack';
import { moduleMapTemplate } from './utils';

function runWebpackCompiler(
  compiler: WebpackCompiler,
): Promise<{
  warnings: CompilationWarnings | null;
  assetsByChunkName: NonNullable<
    WebpackStats.ToJsonOutput['assetsByChunkName']
  >;
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
        } else {
          resolve({
            assetsByChunkName: info.assetsByChunkName,
            warnings: stats.hasWarnings() ? info.warnings : null,
          });
        }
      }
    });
  });
}

const defaultMode: Mode = 'production';

/*
 * TODO: expose a method for modifying loader configurations. One way to go
 * about this could be something like:
 *
 * compiler.configureLoaders((loaderName, loaderOptions) => {
 *   if (loaderName === "babel-loader") {
 *     loaderOptions.exclude = /node_modules/
 *   }
 * })
 *
 * Note that this method should be invoked for nested loaders like those
 * configured to run on svelte modules in addition to top level loaders
 * like babel-loader.
 */
export class Compiler<Templates extends TemplateConfig> {
  __experimentalIncludeStaticModules: boolean;
  client: {
    webpackConfig: webpack.Configuration;
  };
  cwd: string;
  compileServer: boolean;
  output: Output;
  server: {
    webpackConfig: webpack.Configuration;
  };
  templates: Templates;

  constructor({
    __experimentalIncludeStaticModules = true,
    cwd = process.cwd(),
    compileServer,
    mode = defaultMode,
    output,
    runtimeModule = require.resolve('@julienne/default-runtime'),
    templates,
  }: {
    __experimentalIncludeStaticModules?: boolean;
    cwd?: string;
    compileServer: boolean;
    mode?: Mode;
    output: Output;
    runtimeModule?: string;
    templates: Templates;
  }) {
    this.__experimentalIncludeStaticModules = __experimentalIncludeStaticModules;
    this.compileServer = compileServer;
    this.cwd = cwd;
    this.output = output;
    this.templates = templates;

    this.client = {
      webpackConfig: createClientConfig({
        __experimentalIncludeStaticModules,
        cwd,
        entry: templates,
        mode,
        outputPath: output.client,
        publicPath: output.publicPath,
        runtimeModule,
      }),
    };

    this.server = {
      webpackConfig: createServerConfig({
        __experimentalIncludeStaticModules,
        cwd,
        entrySource: moduleMapTemplate(templates, true),
        mode,
        outputPath: output.server,
        publicPath: output.publicPath,
      }),
    };
  }

  getWebpackCompiler(): { client: webpack.Compiler; server: webpack.Compiler } {
    return {
      client: webpack(this.client.webpackConfig),
      server: webpack(this.server.webpackConfig),
    };
  }

  async compile(): Promise<Compilation<Templates>> {
    let { client, compileServer, server } = this;

    let clientResult = await runWebpackCompiler(webpack(client.webpackConfig));

    let clientCompilation = new ClientCompilation({
      chunkAssets: clientResult.assetsByChunkName,
      publicPath: this.output.publicPath,
      templates: this.templates,
      warnings: clientResult.warnings,
    });

    let serverCompilation;
    if (compileServer) {
      let serverResult = await runWebpackCompiler(
        webpack(server.webpackConfig),
      );

      serverCompilation = new ServerCompilation({
        chunkAssets: serverResult.assetsByChunkName,
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
