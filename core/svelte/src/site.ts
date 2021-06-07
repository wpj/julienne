import { Site, SiteOptions, TemplateConfig } from 'julienne';
import type { SvelteComponent } from 'svelte';
import { renderToString as defaultRenderToString } from './render';
import svelte, { PreprocessorGroup } from '@sveltejs/vite-plugin-svelte';
import svelteAutoPreprocess from 'svelte-preprocess';

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<T>;

class SvelteSite<Templates extends TemplateConfig> extends Site<
  SvelteComponent,
  Templates
> {
  constructor({
    renderToString = defaultRenderToString,
    runtime = '@julienne/svelte-runtime',
    ...options
  }: Optional<
    SiteOptions<SvelteComponent, Templates>,
    'renderToString' | 'runtime'
  >) {
    super({
      renderToString,
      runtime,
      viteConfig: {
        plugins: [
          svelte({
            preprocess: svelteAutoPreprocess() as PreprocessorGroup,
          }),
        ],
      },
      ...options,
    });
  }
}

export { SvelteSite as Site };
