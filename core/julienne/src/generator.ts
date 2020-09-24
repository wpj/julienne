import { promises as fs } from 'fs';
import { ensureDir } from 'fs-extra';
import { dirname, join as pathJoin } from 'path';
import { Compilation } from './compilation';
import type { Render } from './render';
import { writeResource } from './resource';
import type { Output, PageMap, ResourceMap, TemplateConfig } from './types';
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
  render: Render;
  resources: ResourceMap;
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
    this.compilation = compilation;
    this.output = output;
    this.pages = pages;
    this.render = render;
    this.resources = resources;
    this.templates = templates;
  }

  /**
   * Write the site's pages and resources to disk.
   */
  async generate(): Promise<void> {
    let { compilation, output, pages, render, resources, templates } = this;

    if (!compilation.server?.asset) {
      throw new Error('Server module not found');
    }

    let serverModule = await import(compilation.server.asset);

    let clientCompilation = compilation.client;

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

        let templateAssets =
          clientCompilation.templateAssets[page.template as string];

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
}
