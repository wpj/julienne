import type { Readable } from 'stream';

import type * as webpack from 'webpack';

import type { Resource } from './resource';

/**
 * A mapping of template names to file paths.
 */
export interface TemplateConfig {
  [name: string]: string;
}

export interface Output {
  client: string;
  publicPath: string;
  server: string;
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
 * Lazy, potentially async resource data.
 */
export type GetData = () => MaybePromise<string | Readable | Buffer>;

export type PageMap<T> = Map<string, GetPage<T>>;

export type ResourceMap = Map<string, GetResource>;

/**
 * A lazy, potentially async resource.
 */
export type GetResource = () => MaybePromise<Resource>;

export type WebpackConfig = {
  client: webpack.Configuration;
  server: webpack.Configuration;
};
