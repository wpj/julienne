import type * as webpack from 'webpack';
import { getOptions as getLoaderOptions } from 'loader-utils';

import { pathToName } from './utils';
import { Flag, isFlagged } from './webpack/shared';

export default function loader(
  this: webpack.loader.LoaderContext,
  content: string,
): string {
  let options = getLoaderOptions(this);
  let flag = options.flag as Flag;

  if (!isFlagged(content, flag)) {
    return content;
  }

  let defaultExportMatch = content.match(/export default (\w+);/);

  if (!defaultExportMatch) {
    throw new Error(
      "Rewriting flagged modules that don't provide a default export is not supported",
    );
  }

  // // TODO: receive cwd from options
  let id = pathToName({ path: this.resourcePath, cwd: process.cwd() });

  let defaultExport = defaultExportMatch[1];

  let rewrite = `import { wrap } from 'julienne';\n${content}`.replace(
    /export default \w+;/,
    `export default wrap(${defaultExport}, '${id}');`,
  );

  return rewrite;
}
