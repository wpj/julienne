import { Compilation } from './compilation';
import type { RenderToString } from './render';
import type { Props, TemplateConfig } from './types';
import { getAssets } from './utils';

export class Renderer<Component, Templates extends TemplateConfig> {
  compilation: Compilation;
  internalRenderToString: RenderToString<Component>;

  constructor({
    compilation,
    renderToString,
  }: {
    compilation: Compilation;
    renderToString: RenderToString<Component>;
  }) {
    this.compilation = compilation;
    this.internalRenderToString = renderToString;
  }

  /**
   * Render `template` with `props` as input and return the rendered string.
   */
  async renderToString({
    props,
    template,
  }: {
    props: Props;
    template: keyof Templates;
  }): Promise<string> {
    let { compilation, internalRenderToString } = this;

    let serverModule = await import(compilation.server.asset);

    let templateAssets = compilation.client.templateAssets[template as string];

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!templateAssets) {
      throw new Error(`Render error: assets for "${template}" not found.`);
    }

    let { scripts: scriptSrcs, stylesheets } = getAssets(templateAssets);

    let scripts = scriptSrcs.map((src) => ({
      src,
    }));

    return internalRenderToString({
      dev: false,
      props,
      scripts,
      stylesheets,
      template: {
        name: template as string,
        component: serverModule[template],
      },
    });
  }
}
