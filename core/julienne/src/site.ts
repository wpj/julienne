import { join as pathJoin } from 'path';
import isStream from 'is-stream';
import type * as webpack from 'webpack';
import mergeWebpackConfigs from 'webpack-merge';
import { Compilation } from './compilation';
import { Compiler } from './compiler';
import { SiteGenerator } from './generator';
import type { RenderToString } from './render';
import { startServer } from './server';
import type {
  DevServerActions,
  GetData,
  GetPage,
  GetResource,
  Output,
  PageMap,
  ResourceMap,
  TemplateConfig,
  WebpackConfig,
} from './types';
import { createClientConfig, createServerConfig } from './webpack';

interface OutputConfig {
  path: string;
  publicPath: string;
}

function getOutput(output: OutputConfig) {
  return {
    server: pathJoin(output.path, 'server'),
    client: pathJoin(output.path, 'public'),
    publicPath: output.publicPath,
  };
}

// julienne generates its own entry, so we need to remove entries from the user
// configuration.
function cleanWebpackConfig({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  entry: _throwawayEntry,
  ...config
}: webpack.Configuration) {
  return config;
}

type CompileOptions = {
  fromCache?: string;
};

type DevOptions = {
  port?: number;
};

export interface Options<Component, Templates extends TemplateConfig> {
  __experimentalIncludeStaticModules?: boolean;
  cwd?: string;
  output?: Partial<OutputConfig>;
  renderToString: RenderToString<Component>;
  runtime: string;
  templates: Templates;
  webpackConfig?: WebpackConfig;
}

export class Site<Component, Templates extends TemplateConfig> {
  __experimentalIncludeStaticModules: boolean;
  cwd: string;
  output: Output;
  pages: PageMap<keyof Templates> = new Map();
  renderToString: RenderToString<Component>;
  resources: ResourceMap = new Map();
  runtime: string;
  templates: Templates;
  webpackConfig: WebpackConfig;

  constructor({
    __experimentalIncludeStaticModules = true,
    cwd = process.cwd(),
    output: {
      path: outputPath = pathJoin(cwd, '.julienne'),
      publicPath = '/',
    } = {},
    renderToString,
    runtime,
    templates,
    webpackConfig,
  }: Options<Component, Templates>) {
    this.__experimentalIncludeStaticModules = __experimentalIncludeStaticModules;
    this.cwd = cwd;
    this.output = getOutput({ path: outputPath, publicPath });
    this.renderToString = renderToString;
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
   * Creates a page using the given path and template configuration returned by
   * `getPage`.
   */
  createPage(path: string, getPage: GetPage<keyof Templates>): void {
    this.pages.set(path, getPage);
  }

  /**
   * Creates a resource in the site's output directory.
   */
  createResource(path: string, getData: GetData): void {
    let getResource: GetResource = async () => {
      let data = await getData();

      if (isStream.readable(data)) {
        return { type: 'stream', data };
      } else {
        return { type: 'generated', data };
      }
    };

    this.resources.set(path, getResource);
  }

  /**
   * Copies a resource to the site's output directory.
   */
  copyResource(from: string, to: string): void {
    this.resources.set(to, () => ({ type: 'file', from }));
  }

  /**
   * Compile the site's assets and return a site generator.
   *
   * `compile` will attempt to find a cached compilation manifest at the path
   * passed in `fromCache`. If one is found, the compilation will be skipped.
   */
  async compile({ fromCache }: CompileOptions = {}): Promise<
    SiteGenerator<Component, Templates>
  > {
    let {
      __experimentalIncludeStaticModules,
      cwd,
      output,
      pages,
      renderToString,
      resources,
      runtime,
      templates,
      webpackConfig: baseWebpackConfig,
    } = this;

    let compilation: Compilation;

    let cachedCompilation =
      fromCache !== undefined ? await Compilation.fromCache(fromCache) : null;

    if (cachedCompilation !== null) {
      compilation = cachedCompilation;
    } else {
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

      let compiler = new Compiler({
        cwd,
        compileServer: true,
        output,
        templates,
        webpackConfig,
      });

      compilation = await compiler.compile();

      if (compilation.server?.warnings) {
        compilation.server.warnings.forEach(console.warn.bind(console));
      }

      if (compilation.client.warnings) {
        compilation.client.warnings.forEach(console.warn.bind(console));
      }
    }

    return new SiteGenerator({
      compilation,
      output,
      pages,
      renderToString,
      resources,
      templates,
    });
  }

  /**
   * Start a server for local development.
   */
  async dev({ port = 3000 }: DevOptions = {}): Promise<DevServerActions> {
    let {
      __experimentalIncludeStaticModules,
      cwd,
      output,
      pages,
      renderToString,
      resources,
      runtime,
      templates,
      webpackConfig: baseWebpackConfig,
    } = this;

    let webpackConfig = {
      client: mergeWebpackConfigs(
        cleanWebpackConfig(baseWebpackConfig.client),
        createClientConfig({
          __experimentalIncludeStaticModules,
          mode: 'development',
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
          mode: 'development',
          outputPath: output.server,
          publicPath: output.publicPath,
          templates,
        }),
      ),
    };

    let compiler = new Compiler({
      compileServer: false,
      cwd,
      output,
      templates,
      webpackConfig,
    });

    let { client: clientWebpackCompiler } = compiler.getWebpackCompiler();

    let actions = await startServer({
      clientWebpackCompiler,
      output,
      pages,
      port,
      renderToString,
      resources,
      templates,
    });

    return actions;
  }
}
