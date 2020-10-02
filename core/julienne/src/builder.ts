import * as fs from 'fs-extra';
import type { Compilation } from './compilation';
import type { Generator } from './generator';
import type { Output, TemplateConfig } from './types';

export class Builder<Component, Templates extends TemplateConfig> {
  compilation: Compilation;
  generator: Generator<Component, Templates>;
  output: Output;

  constructor({
    compilation,
    generator,
    output,
  }: {
    compilation: Compilation;
    generator: Generator<Component, Templates>;
    output: Output;
  }) {
    this.compilation = compilation;
    this.generator = generator;
    this.output = output;
  }

  /**
   * Writes static files and pages to the filesystem and copies the client
   * compilation assets to the public directory.
   */
  async build(): Promise<void> {
    let { generator, output } = this;

    await fs.copy(output.compiler.client, output.public);

    await generator.generate();
  }
}
