import { Site, SiteOptions, TemplateConfig } from 'julienne';
import type { ComponentType } from 'react';
import { renderToString as defaultRenderToString } from './render';
import { createWebpackConfig } from './webpack';
import { createSnowpackConfig } from './snowpack';

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<T>;

class ReactSite<Templates extends TemplateConfig> extends Site<
  ComponentType,
  Templates
> {
  constructor({
    renderToString = defaultRenderToString,
    runtime = '@julienne/react-runtime',
    ...options
  }: Optional<
    SiteOptions<ComponentType, Templates>,
    'renderToString' | 'runtime'
  >) {
    super({
      renderToString,
      runtime,
      snowpackConfig: createSnowpackConfig(),
      webpackConfig: createWebpackConfig(),
      ...options,
    });
  }
}

export { ReactSite as Site };
