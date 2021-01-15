import webpack, {
  Compiler as WebpackCompiler,
  Stats as WebpackStats,
} from 'webpack';
import VirtualModulesPlugin from 'webpack-virtual-modules';
import { clientEntryPointTemplate, moduleMapTemplate } from './code-gen';
import {
  ClientCompilation,
  Compilation,
  CompilationWarnings,
  ServerCompilation,
} from './compilation';
import type { CompilerOutput, WebpackConfig } from './types';
import { EntryAssets, TemplateConfig } from './types';
import { getEntryAssets } from './utils';

let filename = '_julienne/static/chunks/[name]-[contenthash].js';
let chunkFilename = '_julienne/static/chunks/[name].[contenthash].js';
let mode = 'production' as const;

export function createServerConfig({
  outputPath,
  publicPath,
  templates,
}: {
  __experimentalIncludeStaticModules: boolean;
  outputPath: string;
  publicPath: string;
  templates: TemplateConfig;
}): webpack.Configuration {
  // This path must be in cwd so that relative imports of template modules in
  // the virtual server module work correctly.
  let entryPath = `./___julienne_server___.js`;

  let virtualEntry = moduleMapTemplate(templates, true);

  return {
    entry: { server: entryPath },
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

export function createClientConfig({
  __experimentalIncludeStaticModules = true,
  outputPath,
  publicPath,
  runtime,
  templates,
}: {
  __experimentalIncludeStaticModules: boolean;
  outputPath: string;
  publicPath: string;
  runtime: string;
  templates: TemplateConfig;
}): webpack.Configuration {
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
              return [templateName, [virtualPath]];
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
                clientEntryPointTemplate({
                  dev: false,
                  hydrate: true,
                  runtime,
                  template: importPath,
                }),
              ];
            },
          ),
        ),
      ),
    );
  }

  return {
    entry,
    mode,
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

export class CompilerError extends Error {
  constructor(message: string | string[]) {
    super(Array.isArray(message) ? message.join('\n') : message);
  }
}

function runWebpackCompiler(
  compiler: WebpackCompiler,
): Promise<{
  entryAssets: EntryAssets;
  hash: string;
  warnings: CompilationWarnings | null;
}> {
  return new Promise((resolve, reject) => {
    compiler.run((err: Error | undefined | null, stats: WebpackStats) => {
      if (err) {
        reject(err);
      } else {
        let info = stats.toJson();

        if (stats.hasErrors()) {
          reject(new CompilerError(info.errors));
        } else if (info.namedChunkGroups === undefined) {
          reject(new CompilerError('Missing assets for chunks'));
        } else if (info.hash === undefined) {
          reject(new CompilerError('Missing build hash'));
        } else {
          let entryAssets = getEntryAssets(info.namedChunkGroups);

          resolve({
            entryAssets,
            hash: info.hash,
            warnings: stats.hasWarnings() ? info.warnings : null,
          });
        }
      }
    });
  });
}

export class Compiler {
  cwd: string;
  compileServer: boolean;
  output: CompilerOutput;
  templates: TemplateConfig;
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
    output: CompilerOutput;
    templates: TemplateConfig;
    webpackConfig: WebpackConfig;
  }) {
    this.compileServer = compileServer;
    this.cwd = cwd;
    this.output = output;
    this.templates = templates;
    this.webpackConfig = webpackConfig;
  }

  async compile(): Promise<Compilation> {
    let { webpackConfig } = this;

    let [clientResult, serverResult] = await Promise.all([
      runWebpackCompiler(webpack(webpackConfig.client)),
      runWebpackCompiler(webpack(webpackConfig.server)),
    ]);

    let clientCompilation = new ClientCompilation({
      entryAssets: clientResult.entryAssets,
      hash: clientResult.hash,
      publicPath: this.output.publicPath,
      warnings: clientResult.warnings,
    });

    let serverCompilation = new ServerCompilation({
      entryAssets: serverResult.entryAssets,
      hash: serverResult.hash,
      outputPath: this.output.server,
      warnings: serverResult.warnings,
    });

    return new Compilation({
      client: clientCompilation,
      server: serverCompilation,
    });
  }
}
