import webpack, {
  Compiler as WebpackCompiler,
  Stats as WebpackStats,
} from 'webpack';

import type { Output, TemplateConfig, WebpackConfig } from './types';
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
  cwd: string;
  compileServer: boolean;
  output: Output;
  templates: Templates;
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
    templates: Templates;
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

  async compile(): Promise<Compilation<Templates>> {
    let { compileServer, webpackConfig } = this;

    let clientResult = await runWebpackCompiler(webpack(webpackConfig.client));

    let clientCompilation = new ClientCompilation({
      chunkAssets: clientResult.assetsByChunkName,
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
