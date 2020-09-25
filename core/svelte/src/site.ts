import {
  RenderToString,
  Site as JulienneSite,
  SiteOptions,
  TemplateConfig,
} from 'julienne';
import type { SvelteComponent } from 'svelte';
import { renderToString } from './render';
import { createWebpackConfig } from './webpack';

type Options<Templates extends TemplateConfig> = Omit<
  SiteOptions<SvelteComponent, Templates>,
  'renderToString' | 'runtime'
> & {
  dev?: boolean;
  renderToString?: RenderToString<SvelteComponent>;
  runtime?: string;
};

class SvelteSite<Templates extends TemplateConfig> extends JulienneSite<
  SvelteComponent,
  Templates
> {
  constructor({ dev = false, ...options }: Options<Templates>) {
    super({
      renderToString,
      runtime: require.resolve('@julienne/svelte-runtime'),
      webpackConfig: createWebpackConfig({ dev }),
      ...options,
    });
  }
}

export { SvelteSite as Site };
