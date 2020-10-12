import type { Readable } from 'stream';
import type * as webpack from 'webpack';

/**
 * A mapping of template names to file paths.
 */
export interface TemplateConfig {
  [name: string]: string;
}

export interface OutputConfig {
  internal?: string;
  public?: string;
  publicPath?: string;
}

export interface CompilerOutput {
  client: string;
  publicPath: string;
  server: string;
}

export interface Output {
  compiler: CompilerOutput;
  public: string;
}

export type Mode = 'development' | 'production';

export type Props = {
  [key: string]: unknown;
};

export interface Page<Template> {
  template: Template;
  props: Props;
  update?: PageUpdater<Template>;
}

export type Teardown = () => void;

export type PageUpdater<Template> = (page: Page<Template>) => Teardown;

export type MaybePromise<T> = T | Promise<T>;

/**
 * A lazy, potentially async page.
 */
export type GetPage<Template> = () => MaybePromise<Page<Template>>;

/**
 * Lazy, potentially async file data.
 */
export type GetData = () => MaybePromise<string | Readable | Buffer>;

export type FileCreateAction<T> = { type: 'create'; getData: T };
export type FileRemoveAction = { type: 'remove' };
export type OutputFileAction<T> = FileCreateAction<T> | FileRemoveAction;

export type PageMap<Template> = Map<
  string,
  OutputFileAction<GetPage<Template>>
>;

export type FileMap = Map<string, OutputFileAction<GetFile>>;

/**
 * A lazy, potentially async file.
 */
export type GetFile = () => MaybePromise<File>;

export type WebpackConfig = {
  client: webpack.Configuration;
  server: webpack.Configuration;
};

export interface DevServerActions {
  close: () => void;
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

export type EntryAssets = Record<string, string[]>;
