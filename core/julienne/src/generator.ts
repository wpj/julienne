import AggregateError from 'aggregate-error';
import * as fs from 'fs-extra';
import { join as pathJoin } from 'path';
import { Compilation } from './compilation';
import type { RenderToString } from './render';
import type { FileAction, PageAction, Store } from './store';
import type { Props, TemplateConfig } from './types';
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
  output: string;
  serverModulePath: string;

  constructor({
    compilation,
    output,
    renderToString,
  }: {
    compilation: Compilation;
    output: string;
    renderToString: RenderToString<Component>;
  }) {
    this.compilation = compilation;
    this.internalRenderToString = renderToString;
    this.output = output;
    this.serverModulePath = compilation.server.asset;
  }

  /**
   * Write the site's pages and files to disk.
   */
  async generate({ store }: { store: Store<Templates> }): Promise<void> {
    let { output } = this;
    let errors: Error[] = [];

    let storeEntries = Array.from(store.entries());

    let pageEntries = storeEntries.filter(
      (entry): entry is [string, PageAction<keyof Templates>] =>
        entry[1].type === 'page',
    );

    let fileEntries = storeEntries.filter(
      (entry): entry is [string, FileAction] => entry[1].type === 'file',
    );

    // Pages need to be rendered first so that any files created during the
    // page creation process are ready to be processed.
    let pageResults = await Promise.allSettled(
      pageEntries.map(async ([pagePath, { action }]) => {
        let normalizedPagePath = normalizePagePath(pagePath);
        let outputPath = pathJoin(output, normalizedPagePath);

        if (action.type === 'create') {
          let getPage = action.getData;

          let page = await getPage();

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

    let fileResults = await Promise.allSettled(
      fileEntries.map(async ([filePath, { action }]) => {
        let outputPath = pathJoin(output, filePath);

        if (action.type === 'create') {
          let getFile = action.getData;

          let file = await getFile();

          return writeFile(outputPath, file);
        } else {
          return fs.unlink(outputPath);
        }
      }),
    );

    [...pageResults, ...fileResults].forEach((result) => {
      if (result.status === 'rejected') {
        errors.push(result.reason);
      }
    });

    if (errors.length > 0) {
      throw new AggregateError(errors);
    }
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

    let { scripts: scriptSrcs, stylesheets } = getAssets(templateAssets);

    let scripts = scriptSrcs.map((src) => ({
      src,
    }));

    return internalRenderToString({
      dev: false,
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
