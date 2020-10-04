import isStream from 'is-stream';
import type {
  FileMap,
  GetData,
  GetFile,
  GetPage,
  PageMap,
  TemplateConfig,
} from './types';

function validatePath(path: string, entity: string) {
  if (!path.startsWith('/')) {
    throw new Error(`${entity} paths must begin with a forward slash`);
  }
}

/**
 * Stores a site's pages and files.
 */
export class Store<Templates extends TemplateConfig> {
  public files: FileMap = new Map();
  public pages: PageMap<keyof Templates> = new Map();

  /**
   * Creates a page using the given path and template configuration returned by
   * `getPage`.
   */
  createPage(path: string, getPage: GetPage<keyof Templates>): void {
    validatePath(path, 'Page');
    this.pages.set(path, { type: 'create', getData: getPage });
  }

  /**
   * Removes a page from the site's output directory.
   */
  removePage(path: string): void {
    validatePath(path, 'Page');
    this.pages.set(path, { type: 'remove' });
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

    this.files.set(path, { type: 'create', getData: getFile });
  }

  /**
   * Copies a file to the site's output directory.
   */
  copyFile(to: string, from: string): void {
    validatePath(to, 'File');
    let getData = () => ({ type: 'copy', from } as const);

    this.files.set(to, { type: 'create', getData });
  }

  /**
   * Removes a file from the site's output directory.
   */
  removeFile(path: string): void {
    validatePath(path, 'File');

    this.files.set(path, { type: 'remove' });
  }
}
