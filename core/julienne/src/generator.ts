import AggregateError from 'aggregate-error';
import * as fs from 'fs-extra';
import { join as pathJoin } from 'path';
import { Renderer } from './renderer';
import type { FileAction, PageAction, Store } from './store';
import type { TemplateConfig } from './types';
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
  renderer: Renderer<Component, Templates>;
  output: string;
  constructor({
    output,
    renderer,
  }: {
    output: string;
    renderer: Renderer<Component, Templates>;
  }) {
    this.output = output;
    this.renderer = renderer;
  }

  /**
   * Write the site's pages and files to disk.
   */
  async generate({ store }: { store: Store<Templates> }): Promise<void> {
    let { output, renderer } = this;

    let pageEntries = Array.from(store.entries()).filter(
      (entry): entry is [string, PageAction<keyof Templates>] =>
        entry[1].type === 'page',
    );

    // Pages need to be processed first so that any files created during the
    // page creation process are ready to be processed.
    //
    // After we're done processing the page entry, it may be worth considering
    // removing it from the store.
    let pageResults = await Promise.allSettled(
      pageEntries.map(async ([pagePath, { action }]) => {
        let normalizedPagePath = normalizePagePath(pagePath);
        let outputPath = pathJoin(output, normalizedPagePath);

        if (action.type === 'create') {
          let getPage = action.getData;

          let page = await getPage();

          let renderedPage = await renderer.renderToString({
            template: page.template,
            props: page.props,
          });

          return writeFile(outputPath, { type: 'page', data: renderedPage });
        } else {
          return fs.unlink(outputPath);
        }
      }),
    );

    let fileEntries = Array.from(store.entries()).filter(
      (entry): entry is [string, FileAction] => entry[1].type === 'file',
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

    let errors: Error[] = [];
    for (let result of [...pageResults, ...fileResults]) {
      if (result.status === 'rejected') {
        errors.push(new Error(result.reason));
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(errors);
    }
  }
}
