import { IncomingMessage } from 'http';
import { UserConfig as ViteUserConfig } from 'vite';
import type { Readable } from 'stream';

import { requestContextKey } from './constants';

type HydratedModuleInfo = {
  /**
   * A hash of the module's contents used as an identifier durable across
   * builds.
   */
  id: string;
  path: string;
};

/** Used to accumulate hydrated modules for each entrypoint. */
export type HydratedModuleStore = {
  byId: Map<string, HydratedModuleInfo>;
  byTemplate: Record<string, HydratedModuleInfo[]>;
};

export type HydratedModuleFlag =
  | string
  | RegExp
  | ((code: string) => MaybePromise<boolean>);

/**
 * A mapping of template names to file paths.
 */
export type TemplateConfig<Template extends string> = Record<Template, string>;

export interface OutputConfig {
  internal?: string;
  public?: string;
}

export interface Output {
  client: string;
  public: string;
  server: string;
}

export type Props = Record<string, unknown>;

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

export type TemplateResources = Record<
  'css' | 'modules' | 'modulePreloads',
  string[]
>;

export type ClientManifest = Record<string, TemplateResources>;
export type ServerManifest = Record<string, string>;

export type Manifest = {
  client: ClientManifest;
  server: ServerManifest;
};

export type OnLookup = (
  path: string,
) => MaybePromise<void | (() => MaybePromise<void>)>;

export type ServerContext = { [requestContextKey]?: IncomingMessage } & Record<
  string,
  unknown
>;

type RenderResult =
  | string
  | {
      html: string;
      head?: string;
    };

export interface ServerRender<Component> {
  (
    component: Component,
    props: Props,
    context?: ServerContext,
  ): MaybePromise<RenderResult>;
}

export type Attributes = { content?: string } & Record<
  string,
  string | boolean | undefined | null
>;

export interface DocumentProps {
  body?: string;
  head?: string;
  links?: Attributes[];
  pageData?: unknown;
  scripts?: Attributes[];
}

export interface RenderDocument {
  (props: DocumentProps): string;
}

export type PartialHydrationConfig = {
  wrap: string;
  flags: HydratedModuleFlag[];
};

type ExperimentalConfig = {
  partialHydration?: PartialHydrationConfig;
};

type ModulePath = string;

export type UserBuildConfig = {
  base?: string;
  cwd?: string;
  experimental?: ExperimentalConfig;
  output?: OutputConfig;
  render: {
    client: ModulePath;
  };
  templates: TemplateConfig<string>;
  viteConfig?: ViteUserConfig;
};

export type BuildConfig = {
  base: string;
  cwd: string;
  experimental?: ExperimentalConfig;
  output: Output;
  render: {
    client: ModulePath;
  };
  templates: TemplateConfig<string>;
  viteConfig: ViteUserConfig;
};

export type UserConfig<Component, Template extends string> = {
  base?: string;
  cwd?: string;
  experimental?: ExperimentalConfig;
  output?: OutputConfig;
  render: {
    client: ModulePath;
    document?: RenderDocument;
    server: ServerRender<Component>;
  };
  templates: TemplateConfig<Template>;
  viteConfig?: ViteUserConfig;
};

export type Config<Component, Template extends string> = {
  base: string;
  cwd: string;
  experimental?: ExperimentalConfig;
  output: Output;
  render: {
    client: ModulePath;
    document: RenderDocument;
    server: ServerRender<Component>;
  };
  templates: TemplateConfig<Template>;
  viteConfig: ViteUserConfig;
};

export interface Renderer<Template extends string> {
  render(
    template: Template,
    props: Props,
    context?: ServerContext,
  ): MaybePromise<string>;
}

export type GetResourcesForComponent<Template extends string> = (
  template: Template,
) => { scripts: Attributes[]; links: Attributes[] };

export type GetComponent<Component, Template extends string> = (
  template: Template,
) => Promise<Component>;

export type PostProcessHtml = (
  html: string,
  context?: ServerContext,
) => Promise<string>;

export type HandleError = (error: Error) => void;
