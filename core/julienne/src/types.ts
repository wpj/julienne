import type { Readable } from 'stream';

/**
 * A mapping of template names to file paths.
 */
export interface TemplateConfig {
  [name: string]: string;
}

export interface OutputConfig {
  base?: string;
  internal?: string;
  public?: string;
}

export interface Output {
  client: string;
  public: string;
  server: string;
}

export type Props = {
  [key: string]: unknown;
};

export interface Page<Template> {
  props: Props;
  template: Template;
  update?: PageUpdater<Template>;
}

export type Teardown = () => void;

export type PageUpdater<Template> = (page: Page<Template>) => Teardown;

export type MaybePromise<T> = T | Promise<T>;

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

type Attributes = Record<string, string | undefined | null>;

export type RenderToString<Component> = (options: {
  dev: boolean;
  links: Attributes[];
  props: Props;
  scripts: Attributes[];
  template: {
    name: string;
    component: Component | null;
  };
}) => MaybePromise<string>;
