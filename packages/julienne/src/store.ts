import isStream from 'is-stream';
import type { Readable } from 'stream';
import type { File, MaybePromise, Page } from './types';

/**
 * A lazy, potentially async page.
 */
type GetPage<Template> = () => MaybePromise<Page<Template>>;

/**
 * Lazy, potentially async file data.
 */
type GetData = () => MaybePromise<string | Readable | Buffer>;

/**
 * A lazy, potentially async file.
 */
type GetFile = () => MaybePromise<File>;

export type ActionFileCreate<T> = { type: 'create'; getData: T };
export type ActionFileRemove = { type: 'remove' };

export type PageAction<Template> = {
  type: 'page';
  action: ActionFileCreate<GetPage<Template>> | ActionFileRemove;
};
export type FileAction = {
  type: 'file';
  action: ActionFileCreate<GetFile> | ActionFileRemove;
};

function validatePath(path: string, entity: string) {
  if (!path.startsWith('/')) {
    throw new Error(`${entity} paths must begin with a forward slash`);
  }
}

class ResourceMap<Template> extends Map<
  string,
  PageAction<Template> | FileAction
> {}

/**
 * Stores a site's pages and files.
 */
export class Store<Template extends string> extends ResourceMap<Template> {
  /**
   * Creates a page using the given path and template configuration returned by
   * `getPage`.
   */
  createPage(path: string, getPage: GetPage<Template>): void {
    validatePath(path, 'Page');
    this.set(path, {
      type: 'page',
      action: {
        type: 'create',
        getData: getPage,
      },
    });
  }

  /**
   * Removes a page from the site's output directory.
   */
  removePage(path: string): void {
    validatePath(path, 'Page');
    this.set(path, { type: 'page', action: { type: 'remove' } });
  }

  /**
   * Creates a file in the site's output directory.
   */
  createFile(path: string, getData: GetData): void {
    validatePath(path, 'File');
    let getFile: GetFile = async () => {
      let data = await getData();

      if (isStream.readable(data)) {
        return { type: 'stream', data };
      } else {
        return { type: 'generated', data };
      }
    };

    this.set(path, {
      type: 'file',
      action: {
        type: 'create',
        getData: getFile,
      },
    });
  }

  /**
   * Copies a file to the site's output directory.
   */
  copyFile(to: string, from: string): void {
    validatePath(to, 'File');
    let getData = () => ({ type: 'copy', from } as const);

    this.set(to, { type: 'file', action: { type: 'create', getData } });
  }

  /**
   * Removes a file from the site's output directory.
   */
  removeFile(path: string): void {
    validatePath(path, 'File');

    this.set(path, { type: 'file', action: { type: 'remove' } });
  }
}
