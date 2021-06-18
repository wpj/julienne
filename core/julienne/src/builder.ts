import fs from 'fs-extra';
import type { Build } from './build';
import type { Generator } from './generator';
import type { Store } from './store';
import type { Output, TemplateConfig } from './types';

export class Builder<Component, Templates extends TemplateConfig> {
  build: Build;
  generator: Generator<Component, Templates>;
  output: Output;

  constructor({
    build,
    generator,
    output,
  }: {
    build: Build;
    generator: Generator<Component, Templates>;
    output: Output;
  }) {
    this.build = build;
    this.generator = generator;
    this.output = output;
  }

  /**
   * Writes static files and pages to the filesystem and copies the client
   * build assets to the public directory.
   */
  async write({ store }: { store: Store<Templates> }): Promise<void> {
    let { generator, output } = this;

    await fs.copy(output.client, output.public);

    await generator.generate({ store });
  }
}
