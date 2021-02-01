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

export type OnLookup = (
  path: string,
) => MaybePromise<void | (() => MaybePromise<void>)>;

// TODO: Fix this type.
export type ScriptAttributes = Partial<
  Pick<
    HTMLScriptElement,
    | 'async'
    | 'crossOrigin'
    | 'defer'
    | 'integrity'
    | 'noModule'
    | 'referrerPolicy'
    | 'src'
    | 'type'
  > & { content: string }
>;

export type RenderToString<Component> = (options: {
  dev: boolean;
  props: Props;
  scripts: ScriptAttributes[];
  stylesheets: string[];
  template: {
    name: string;
    component: Component | null;
  };
}) => MaybePromise<string>;
