import { promises as fs } from 'fs';
import { ensureDir } from 'fs-extra';
import { dirname, join as pathJoin } from 'path';
import { Compilation } from './compilation';
import type { Render } from './render';
import { writeResource } from './resource';
import type {
  Output,
  PageMap,
  Props,
  ResourceMap,
  TemplateConfig,
} from './types';
import { getAssets } from './utils';

function normalizePagePath(pagePath: string) {
  if (pagePath.endsWith('.html')) {
    return pagePath;
  }

  return pathJoin(pagePath, 'index.html');
}

export class SiteGenerator<Templates extends TemplateConfig> {
  compilation: Compilation;
  output: Output;
  pages: PageMap<keyof Templates>;
  renderInternal: Render;
  resources: ResourceMap;
  serverModulePath: string;
  templates: Templates;

  constructor({
    compilation,
    output,
    pages,
    render,
    resources,
    templates,
  }: {
    compilation: Compilation;
    output: Output;
    pages: PageMap<keyof Templates>;
    render: Render;
    resources: ResourceMap;
    templates: Templates;
  }) {
    if (!compilation.server?.asset) {
      throw new Error('Server module not found');
    }

    this.compilation = compilation;
    this.output = output;
    this.pages = pages;
    this.renderInternal = render;
    this.resources = resources;
    this.serverModulePath = compilation.server.asset;
    this.templates = templates;
  }

  /**
   * Write the site's pages and resources to disk.
   */
  async generate(): Promise<void> {
    let { output, pages, resources, templates } = this;

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

        let renderedPage = await this.renderToString({
          template: page.template,
          props: page.props,
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

  /**
   * Render `template` with `props` as input and return the rendered string.
   */
  async renderToString({
    props,
    template,
  }: {
    props: Props;
    template: keyof Templates;
  }) {
    let { compilation, renderInternal, serverModulePath } = this;

    let serverModule = await import(serverModulePath);

    let templateAssets = compilation.client.templateAssets[template as string];

    let { scripts, stylesheets } = getAssets(templateAssets);

    return renderInternal({
      props,
      scripts,
      stylesheets,
      template: {
        name: template as string,
        component: serverModule[template],
      },
    });
  }
}
