import { Site, SiteOptions, TemplateConfig } from 'julienne';
import type { SvelteComponent } from 'svelte';
import { renderToString as defaultRenderToString } from './render';
import { createWebpackConfig } from './webpack';

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<T>;

class SvelteSite<Templates extends TemplateConfig> extends Site<
  SvelteComponent,
  Templates
> {
  constructor({
    dev = false,
    renderToString = defaultRenderToString,
    runtime = '@julienne/svelte-runtime',
    ...options
  }: Optional<
    SiteOptions<SvelteComponent, Templates>,
    'renderToString' | 'runtime'
  > & {
    dev?: boolean;
  }) {
    super({
      renderToString,
      runtime,
      webpackConfig: createWebpackConfig({ dev }),
      ...options,
    });
  }
}

export { SvelteSite as Site };
