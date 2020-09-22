import { promises as fs } from 'fs';
import { Readable } from 'stream';
import { dirname, join as pathJoin } from 'path';

import { ensureDir } from 'fs-extra';

import { Compiler } from './compiler';
import type {
  GetData,
  GetPage,
  GetResource,
  Output,
  TemplateConfig,
} from './types';
import type { Render } from './render';
import { writeResource } from './resource';
import { startServer } from './server';
import { getAssets } from './utils';

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

function normalizePagePath(pagePath: string) {
  if (pagePath.endsWith('.html')) {
    return pagePath;
  }

  return pathJoin(pagePath, 'index.html');
}

export class Site<Templates extends TemplateConfig> {
  __experimentalIncludeStaticModules: boolean;
  cwd: string;
  output: Output;
  pages: Map<string, GetPage<keyof Templates>> = new Map();
  render: Render;
  resources: Map<string, GetResource> = new Map();
  runtime: string;
  templates: Templates;

  constructor({
    __experimentalIncludeStaticModules = true,
    cwd = process.cwd(),
    output: {
      path: outputPath = pathJoin(cwd, '__julienne__'),
      publicPath = '/',
    } = {},
    render,
    runtime,
    templates,
  }: {
    __experimentalIncludeStaticModules?: boolean;
    cwd?: string;
    output?: Partial<OutputConfig>;
    render: Render;
    runtime: string;
    templates: Templates;
  }) {
    this.__experimentalIncludeStaticModules = __experimentalIncludeStaticModules;
    this.cwd = cwd;
    this.output = getOutput({ path: outputPath, publicPath });
    this.render = render;
    this.runtime = runtime;
    this.templates = templates;
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

      if (data instanceof Readable) {
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

  async build(): Promise<void> {
    let {
      __experimentalIncludeStaticModules,
      cwd,
      output,
      pages,
      render,
      resources,
      runtime,
      templates,
    } = this;

    let compiler = new Compiler({
      __experimentalIncludeStaticModules,
      cwd,
      compileServer: true,
      mode: 'production',
      output,
      runtime,
      templates,
    });

    let compilation = await compiler.compile();

    if (compilation.server?.warnings) {
      compilation.server.warnings.forEach(console.warn.bind(console));
    }

    if (compilation.client.warnings) {
      compilation.client.warnings.forEach(console.warn.bind(console));
    }

    if (!compilation.server?.asset) {
      throw new Error('Server module not found');
    }

    let serverModule = await import(compilation.server.asset);

    // Pages need to be rendered first so that any resources created during the
    // page creation process are ready to be processed.
    await Promise.allSettled(
      Array.from(pages.entries()).map(async ([pagePath, getPage]) => {
        let page;
        try {
          page = await getPage();
        } catch (e) {
          console.error(
            `Error occurred when creating page ${pagePath}, aborting`,
            e,
          );
          return;
        }

        if (!(page.template in templates)) {
          throw new Error(`Template error: ${page.template} does not exist.`);
        }

        let templateAssets = compilation.client.templateAssets[page.template];

        let { scripts, stylesheets } = getAssets(templateAssets);

        let renderedPage = await render({
          props: page.props,
          scripts,
          stylesheets,
          template: {
            name: page.template as string,
            component: serverModule[page.template],
          },
        });

        let normalizedPagePath = normalizePagePath(pagePath);

        let outputPath = pathJoin(output.client, normalizedPagePath);

        let outputDir = dirname(outputPath);

        await ensureDir(outputDir);

        await fs.writeFile(outputPath, renderedPage, 'utf8');
      }),
    );

    await Promise.allSettled(
      Array.from(resources.entries()).map(
        async ([resourcePath, getResource]) => {
          let resource;
          try {
            resource = await getResource();
          } catch (e) {
            console.error(
              `Error occurred when creating resource ${resourcePath}, aborting`,
              e,
            );
            return;
          }

          let outputPath = pathJoin(output.client, resourcePath);

          let outputDir = dirname(outputPath);

          await ensureDir(outputDir);

          return writeResource(outputPath, resource);
        },
      ),
    );
  }

  dev({ port = 3000 }: { port?: number } = {}): void {
    let {
      __experimentalIncludeStaticModules,
      cwd,
      output,
      pages,
      render,
      resources,
      runtime,
      templates,
    } = this;

    let compiler = new Compiler<Templates>({
      __experimentalIncludeStaticModules,
      compileServer: false,
      cwd,
      mode: 'development',
      output,
      runtime,
      templates,
    });

    let { client: clientWebpackCompiler } = compiler.getWebpackCompiler();

    startServer({
      clientWebpackCompiler,
      output,
      pages,
      port,
      render,
      resources,
      templates,
    });
  }
}
