import { join as pathJoin } from 'path';
import {
  buildClient,
  buildServer,
  Format,
  Options as ApplicationBuildOptions,
} from './application';
import { Build } from './build';
import { Builder } from './builder';
import { DevServer } from './dev-server';
import { Generator } from './generator';
import { Renderer } from './renderer';
import { Store } from './store';
import type {
  DevServerActions,
  OnLookup,
  Output,
  OutputConfig,
  RenderToString,
  TemplateConfig,
} from './types';

declare global {
  interface ImportMeta {
    env: {
      IS_ESM: boolean;
    };
  }
}

let isEsm = import.meta.env.IS_ESM;

const FORMAT: Format = isEsm ? 'esm' : 'cjs';

function getOutputWithDefaults({
  base = '/',
  cwd,
  internal: internalOutputPath = pathJoin(cwd, '.julienne'),
  public: publicOutputPath = pathJoin(cwd, 'public'),
}: OutputConfig & { cwd: string }): Output & { base: string } {
  return {
    base,
    client: pathJoin(internalOutputPath, 'client'),
    server: pathJoin(internalOutputPath, 'server'),
    public: publicOutputPath,
  };
}

export type Options<Component, Templates extends TemplateConfig> = Omit<
  ApplicationBuildOptions<Templates>,
  'output' | 'base' | 'outDir'
> & {
  output?: OutputConfig;
  renderToString: RenderToString<Component>;
};

export class Site<Component, Templates extends TemplateConfig> {
  applicationBuildOptions: Omit<ApplicationBuildOptions<Templates>, 'outDir'>;
  cwd: string;
  output: Output;
  renderToString: RenderToString<Component>;

  constructor({
    cwd = process.cwd(),
    output: outputConfig,
    renderToString,
    ...applicationBuildOptions
  }: Options<Component, Templates>) {
    let output = getOutputWithDefaults({ cwd, ...outputConfig });

    this.applicationBuildOptions = {
      cwd,
      base: output.base,
      ...applicationBuildOptions,
    };
    this.cwd = cwd;
    this.output = output;
    this.renderToString = renderToString;
  }

  async compile(): Promise<Builder<Component, Templates>> {
    let { applicationBuildOptions, output, renderToString } = this;

    let clientBuild = await buildClient({
      ...applicationBuildOptions,
      outDir: output.client,
    });
    let serverBuild = await buildServer({
      ...applicationBuildOptions,
      format: FORMAT,
      outDir: output.server,
    });

    let build = new Build({
      client: clientBuild,
      server: serverBuild,
    });

    let renderer = new Renderer({ build, renderToString });

    let generator = new Generator<Component, Templates>({
      output: output.public,
      renderer,
    });

    return new Builder({ build, generator, output });
  }

  async build({ store }: { store: Store<Templates> }): Promise<void> {
    let builder = await this.compile();
    await builder.write({ store });
  }

  async dev({
    onLookup,
    port = 3000,
    store,
  }: {
    onLookup?: OnLookup;
    port?: number;
    store: Store<Templates>;
  }): Promise<DevServerActions> {
    let { applicationBuildOptions, cwd, renderToString } = this;
    let { runtime, viteConfig, templates } = applicationBuildOptions;

    let devServer = new DevServer<Component, Templates>({
      cwd,
      renderToString,
      runtime,
      store,
      viteConfig,
      templates,
    });

    let serverActions = await devServer.start({ onLookup, port });

    return serverActions;
  }
}
