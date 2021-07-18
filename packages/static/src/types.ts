import type { Readable } from 'stream';

export type MaybePromise<T> = T | Promise<T>;

export type Props = Record<string, unknown>;

export interface Page<Template> {
  props: Props;
  template: Template;
}

export type Copy = {
  type: 'copy';
  from: string;
};

export type Generated = {
  type: 'generated';
  data: string | Buffer;
};

export type Stream = {
  type: 'stream';
  data: Readable;
};

/**
 * A file destined to be written to the output directory.
 */
export type File = Copy | Generated | Stream;

/**
 * A lazy, potentially async page.
 */
export type GetPage<Template> = () => MaybePromise<Page<Template>>;

/**
 * Lazy, potentially async file data.
 */
export type GetData = () => MaybePromise<string | Readable | Buffer>;

/**
 * A lazy, potentially async file.
 */
export type GetFile = () => MaybePromise<File>;

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
