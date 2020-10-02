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

export class Site<Component, Templates extends TemplateConfig> extends Store<
  Templates
> {
  compilerOptions: CompilerOptions<Templates>;
  output: Output;
  renderToString: RenderToString<Component>;

  constructor({
    cwd = process.cwd(),
    output: outputConfig,
    renderToString,
    ...compilerOptions
  }: Options<Component, Templates>) {
    super();

    let output = getOutputWithDefaults({ cwd, ...outputConfig });

    this.compilerOptions = { cwd, output: output.compiler, ...compilerOptions };
    this.output = output;
    this.renderToString = renderToString;
  }

  async compile(): Promise<Builder<Component, Templates>> {
    let { compilerOptions, files, output, pages, renderToString } = this;

    let compiler = new Compiler(compilerOptions);

    let compilation = await compiler.compile();

    let generator = new Generator<Component, Templates>({
      compilation,
      files,
      output: output.public,
      pages,
      renderToString,
    });

    return new Builder({ compilation, generator, output });
  }

  async build(): Promise<void> {
    let builder = await this.compile();
    await builder.build();
  }

  async dev({ port = 3000 }: { port?: number } = {}): Promise<
    DevServerActions
  > {
    let { compilerOptions, files, pages, renderToString } = this;
    let { runtime, templates, webpackConfig } = compilerOptions;

    let devServer = new DevServer<Component, Templates>({
      files,
      pages,
      renderToString,
      runtime,
      templates,
      webpackConfig,
    });

    let serverActions = await devServer.start({ port });

    return serverActions;
  }
}
