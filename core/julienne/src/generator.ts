import * as fs from 'fs-extra';
import { join as pathJoin } from 'path';
import { Compilation } from './compilation';
import type { RenderToString } from './render';
import type { FileMap, PageMap, Props, TemplateConfig } from './types';
import { getAssets } from './utils';
import { writeFile } from './utils/file';

function normalizePagePath(pagePath: string) {
  if (pagePath.endsWith('.html')) {
    return pagePath;
  }

  return pathJoin(pagePath, 'index.html');
}

/**
 * When `generate` is invoked, all known files and pages will be generate and written to the filesystem.
 */
export class Generator<Component, Templates extends TemplateConfig> {
  compilation: Compilation;
  internalRenderToString: RenderToString<Component>;
  files: FileMap;
  output: string;
  pages: PageMap<keyof Templates>;
  serverModulePath: string;

  constructor({
    compilation,
    files,
    output,
    pages,
    renderToString,
  }: {
    compilation: Compilation;
    files: FileMap;
    output: string;
    pages: PageMap<keyof Templates>;
    renderToString: RenderToString<Component>;
  }) {
    if (!compilation.server?.asset) {
      throw new Error('Server module not found');
    }

    this.compilation = compilation;
    this.files = files;
    this.internalRenderToString = renderToString;
    this.output = output;
    this.pages = pages;
    this.serverModulePath = compilation.server.asset;
  }

  /**
   * Write the site's pages and files to disk.
   */
  async generate(): Promise<void> {
    let { files, output, pages } = this;

    // Pages need to be rendered first so that any files created during the
    // page creation process are ready to be processed.
    await Promise.allSettled(
      Array.from(pages.entries()).map(async ([pagePath, pageAction]) => {
        let normalizedPagePath = normalizePagePath(pagePath);
        let outputPath = pathJoin(output, normalizedPagePath);

        if (pageAction.type === 'create') {
          let getPage = pageAction.getData;

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

          let renderedPage = await this.renderToString({
            template: page.template,
            props: page.props,
          });

          return writeFile(outputPath, { type: 'page', data: renderedPage });
        } else {
          return fs.unlink(outputPath);
        }
      }),
    );

    await Promise.allSettled(
      Array.from(files.entries()).map(async ([filePath, fileAction]) => {
        let outputPath = pathJoin(output, filePath);

        if (fileAction.type === 'create') {
          let getFile = fileAction.getData;

          let file;
          try {
            file = await getFile();
          } catch (e) {
            console.error(
              `Error occurred when creating file ${filePath}, aborting`,
              e,
            );
            return;
          }

          return writeFile(outputPath, file);
        } else {
          return fs.unlink(outputPath);
        }
      }),
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
  }): Promise<string> {
    let { compilation, internalRenderToString, serverModulePath } = this;

    let serverModule = await import(serverModulePath);

    let templateAssets = compilation.client.templateAssets[template as string];

    if (!templateAssets) {
      throw new Error(`Render error: assets for "${template}" not found.`);
    }

    let { scripts, stylesheets } = getAssets(templateAssets);

    return internalRenderToString({
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
