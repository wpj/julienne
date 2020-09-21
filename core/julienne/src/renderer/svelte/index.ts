import type { SvelteComponent } from 'svelte';

import type { Props, TemplateConfig } from '../../types';
import type { Renderer } from '../types';
import type { Compilation } from '../../compilation';

import DefaultDocument from './document.svelte';

const DOCTYPE = '<!doctype html>\n';

export class Svelte<Templates extends TemplateConfig>
  implements Renderer<Templates> {
  __experimentalIncludeStaticModules: boolean;
  compilation: Compilation<Templates>;

  constructor({
    __experimentalIncludeStaticModules = true,
    compilation,
  }: {
    __experimentalIncludeStaticModules?: boolean;
    compilation: Compilation<Templates>;
  }) {
    this.__experimentalIncludeStaticModules = __experimentalIncludeStaticModules;
    this.compilation = compilation;
  }

  async render({
    template,
    props,
  }: {
    template: keyof Templates;
    props: Props;
  }): Promise<string> {
    let { __experimentalIncludeStaticModules, compilation } = this;

    let templateAssets = compilation.client.templateAssets[template];
    let scripts = templateAssets.filter((asset) => asset.endsWith('.js'));
    let links = templateAssets.filter((asset) => asset.endsWith('.css'));

    if (compilation.server === null) {
      return (
        DOCTYPE +
        ((DefaultDocument as unknown) as SvelteComponent).render({
          body: null,
          head: null,
          links,
          pageData: __experimentalIncludeStaticModules ? { props } : null,
          scripts,
        }).html
      );
    }

    let mod = await import(compilation.server.asset);
    let Template = mod[template] as SvelteComponent;
    let { head, html } = Template.render(props);

    return (
      DOCTYPE +
      ((DefaultDocument as unknown) as SvelteComponent).render({
        body: html,
        head,
        links,
        pageData: __experimentalIncludeStaticModules ? { props } : null,
        scripts,
      }).html
    );
  }
}
