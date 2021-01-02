import { join as pathJoin } from 'path';
import { Builder } from './builder';
import { Compiler, Options as CompilerOptions } from './compiler';
import { Generator } from './generator';
import type { RenderToString } from './render';
import { Server as DevServer } from './server';
import { Store } from './store';
import type {
  DevServerActions,
  Output,
  OutputConfig,
  TemplateConfig,
} from './types';

function getOutputWithDefaults({
  cwd,
  internal: internalOutputPath = pathJoin(cwd, '.julienne'),
  public: publicOutputPath = pathJoin(cwd, 'public'),
  publicPath = '/',
}: OutputConfig & { cwd: string }): Output {
  return {
    compiler: {
      client: pathJoin(internalOutputPath, 'client'),
      publicPath,
      server: pathJoin(internalOutputPath, 'server'),
    },
    public: publicOutputPath,
  };
}

export type Options<Component, Templates extends TemplateConfig> = Omit<
  CompilerOptions<Templates>,
  'output'
> & {
  output?: OutputConfig;
  renderToString: RenderToString<Component>;
};

export class Site<Component, Templates extends TemplateConfig> {
  compilerOptions: CompilerOptions<Templates>;
  cwd: string;
  output: Output;
  renderToString: RenderToString<Component>;

  constructor({
    cwd = process.cwd(),
    output: outputConfig,
    renderToString,
    ...compilerOptions
  }: Options<Component, Templates>) {
    let output = getOutputWithDefaults({ cwd, ...outputConfig });

    this.compilerOptions = { cwd, output: output.compiler, ...compilerOptions };
    this.cwd = cwd;
    this.output = output;
    this.renderToString = renderToString;
  }

  async compile(): Promise<Builder<Component, Templates>> {
    let { compilerOptions, output, renderToString } = this;

    let compiler = new Compiler(compilerOptions);

    let compilation = await compiler.compile();

    let generator = new Generator<Component, Templates>({
      compilation,
      output: output.public,
      renderToString,
    });

    return new Builder({ compilation, generator, output });
  }

  async build({ store }: { store: Store<Templates> }): Promise<void> {
    let builder = await this.compile();
    await builder.build({ store });
  }

  async dev({
    port = 3000,
    store,
  }: {
    port?: number;
    store: Store<Templates>;
  }): Promise<DevServerActions> {
    let { compilerOptions, cwd, renderToString } = this;
    let { runtime, snowpackConfig, templates } = compilerOptions;
    let { files, pages } = store;

    let devServer = new DevServer<Component, Templates>({
      cwd,
      files,
      pages,
      renderToString,
      runtime,
      snowpackConfig,
      templates,
    });

    let serverActions = await devServer.start({ port });

    return serverActions;
  }
}
