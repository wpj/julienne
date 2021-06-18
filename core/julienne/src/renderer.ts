import { Build } from './build';
import type { Props, RenderToString, TemplateConfig } from './types';
import { getAssets } from './utils';

export class Renderer<Component, Templates extends TemplateConfig> {
  build: Build;
  internalRenderToString: RenderToString<Component>;

  constructor({
    build,
    renderToString,
  }: {
    build: Build;
    renderToString: RenderToString<Component>;
  }) {
    this.build = build;
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
    let { build, internalRenderToString } = this;

    let templatePath = build.server.entryAssets[template as string][0];
    let templateComponent = await import(templatePath).then(
      (mod) => mod.default,
    );
    if (!templateComponent) {
      throw new Error(`No component for template "${template}" found.`);
    }

    let templateAssets = build.client.templateAssets[template as string];

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!templateAssets) {
      throw new Error(`Render error: assets for "${template}" not found.`);
    }

    let { scripts: scriptSrcs, stylesheets } = getAssets(templateAssets);

    let scripts = scriptSrcs.map((src) => ({
      src,
      type: 'module',
    }));

    let links = stylesheets.map((href) => {
      return { href, type: 'text/css', rel: 'stylesheet' };
    });

    return internalRenderToString({
      dev: false,
      links,
      props,
      scripts,
      template: {
        name: template as string,
        component: templateComponent,
      },
    });
  }
}
