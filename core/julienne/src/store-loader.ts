import type * as webpack from 'webpack';
import { getOptions as getLoaderOptions } from 'loader-utils';
import type { Store } from './webpack/store';
import { isFlagged, Flag } from './webpack/shared';

export default function loader(
  this: webpack.loader.LoaderContext,
  content: string,
) {
  let options = getLoaderOptions(this);

  let store: Store = (options.store as unknown) as Store;
  let flag = options.flag as Flag;

  if (isFlagged(content, flag)) {
    console.log('Flagged module:', this.resourcePath);
    store.addModule(this.resourcePath);
  }

  return content;
}
