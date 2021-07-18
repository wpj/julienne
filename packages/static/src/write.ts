import AggregateError from 'aggregate-error';
import { promises as fs } from 'fs';
import type { Renderer } from 'julienne';
import { join as joinPath } from 'path';
import { writeFile } from './file';
import type { FileAction, PageAction } from './types';
import type { Site } from './site';

let defaultOutput = joinPath(process.cwd(), 'public');

function normalizePagePath(pagePath: string) {
  if (pagePath.endsWith('.html')) {
    return pagePath;
  }

  return joinPath(pagePath, 'index.html');
}

export async function write<Component, Template extends string>({
  output = defaultOutput,
  renderer,
  site,
}: {
  output?: string;
  renderer: Renderer<Component, Template>;
  site: Site<Template>;
}): Promise<void> {
  let pageEntries = Array.from(site.entries()).filter(
    (entry): entry is [string, PageAction<Template>] =>
      entry[1].type === 'page',
  );

  // Pages need to be processed first so that any files created during the
  // page creation process are ready to be processed.
  //
  // After we're done processing the page entry, it may be worth considering
  // removing it from the site.
  let pageResults = await Promise.allSettled(
    pageEntries.map(async ([pagePath, { action }]) => {
      let normalizedPagePath = normalizePagePath(pagePath);
      let outputPath = joinPath(output, normalizedPagePath);

      if (action.type === 'create') {
        let getPage = action.getData;

        let page = await getPage();

        let renderedPage = await renderer.render(page.template, page.props);

        return writeFile(outputPath, { type: 'page', data: renderedPage });
      } else {
        return fs.unlink(outputPath);
      }
    }),
  );

  let fileEntries = Array.from(site.entries()).filter(
    (entry): entry is [string, FileAction] => entry[1].type === 'file',
  );

  let fileResults = await Promise.allSettled(
    fileEntries.map(async ([filePath, { action }]) => {
      let outputPath = joinPath(output, filePath);

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
      let error = new Error(result.reason);
      error.stack = result.reason.stack;
      errors.push(error);
    }
  }

  if (errors.length > 0) {
    throw new AggregateError(errors);
  }
}
