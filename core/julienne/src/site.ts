import { Compiler, Options as CompilerOptions } from './compiler';
import { Generator } from './generator';
import type { RenderToString } from './render';
import { Server as DevServer } from './server';
import { Store } from './store';
import type { DevServerActions, TemplateConfig } from './types';

export type Options<
  Component,
  Templates extends TemplateConfig
> = CompilerOptions<Templates> & {
  renderToString: RenderToString<Component>;
};

export class Site<Component, Templates extends TemplateConfig> extends Store<
  Templates
> {
  compilerOptions: CompilerOptions<Templates>;
  renderToString: RenderToString<Component>;

  constructor({
    renderToString,
    ...compilerOptions
  }: Options<Component, Templates>) {
    super();

    this.renderToString = renderToString;
    this.compilerOptions = compilerOptions;
  }

  async compile(): Promise<Generator<Component, Templates>> {
    let { compilerOptions, files, pages, renderToString } = this;

    let compiler = new Compiler(compilerOptions);

    let compilation = await compiler.compile();

    return new Generator<Component, Templates>({
      compilation,
      files,
      output: compiler.output.client,
      pages,
      renderToString,
      templates: compilerOptions.templates,
    });
  }

  async build(): Promise<void> {
    let generator = await this.compile();
    await generator.generate();
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
