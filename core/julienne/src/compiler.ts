import type * as webpack from 'webpack';
import mergeWebpackConfigs from 'webpack-merge';
import type { Compilation } from './compilation';
import type { CompilerOutput, TemplateConfig, WebpackConfig } from './types';
import {
  Compiler as WebpackCompiler,
  createClientConfig,
  createServerConfig,
} from './webpack';

// julienne generates its own entry, so we need to remove entries from the user
// configuration.
function cleanWebpackConfig({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  entry: _throwawayEntry,
  ...config
}: webpack.Configuration) {
  return config;
}

export interface Options<Templates extends TemplateConfig> {
  __experimentalIncludeStaticModules?: boolean;
  cwd?: string;
  output: CompilerOutput;
  runtime: string;
  templates: Templates;
  webpackConfig?: WebpackConfig;
}

export class Compiler<Templates extends TemplateConfig> {
  __experimentalIncludeStaticModules: boolean;
  cwd: string;
  output: CompilerOutput;
  runtime: string;
  templates: Templates;
  webpackConfig: WebpackConfig;

  constructor({
    __experimentalIncludeStaticModules = true,
    cwd = process.cwd(),
    output,
    runtime,
    templates,
    webpackConfig,
  }: Options<Templates>) {
    this.__experimentalIncludeStaticModules = __experimentalIncludeStaticModules;
    this.cwd = cwd;
    this.output = output;
    this.runtime = runtime;
    this.templates = templates;

    // We're creating skeleton webpack configs to ease the common task of adding
    // loaders and plugins in the case where a user is mutating the webpack
    // configuration after creating a site.
    this.webpackConfig = webpackConfig ?? {
      client: { module: { rules: [] }, plugins: [] },
      server: { module: { rules: [] }, plugins: [] },
    };
  }

  /**
   * Compile the site's assets and return a site generator.
   */
  async compile(): Promise<Compilation> {
    let {
      __experimentalIncludeStaticModules,
      cwd,
      output,
      runtime,
      templates,
      webpackConfig: baseWebpackConfig,
    } = this;

    let webpackConfig = {
      client: mergeWebpackConfigs(
        cleanWebpackConfig(baseWebpackConfig.client),
        createClientConfig({
          __experimentalIncludeStaticModules,
          mode: 'production',
          outputPath: output.client,
          publicPath: output.publicPath,
          runtime,
          templates,
        }),
      ),
      server: mergeWebpackConfigs(
        cleanWebpackConfig(baseWebpackConfig.server),
        createServerConfig({
          __experimentalIncludeStaticModules,
          mode: 'production',
          outputPath: output.server,
          publicPath: output.publicPath,
          templates,
        }),
      ),
    };

    let compiler = new WebpackCompiler({
      cwd,
      compileServer: true,
      output,
      templates,
      webpackConfig,
    });

    let compilation = await compiler.compile();

    if (compilation.server?.warnings) {
      compilation.server.warnings.forEach(console.warn.bind(console));
    }

    if (compilation.client.warnings) {
      compilation.client.warnings.forEach(console.warn.bind(console));
    }

    return compilation;
  }
}
