import { Site, SiteOptions, TemplateConfig } from 'julienne';
import type { ComponentType } from 'react';
import { renderToString as defaultRenderToString } from './render';
import { createWebpackConfig } from './webpack';

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<T>;

class ReactSite<Templates extends TemplateConfig> extends Site<
  ComponentType,
  Templates
> {
  constructor({
    dev = false,
    renderToString = defaultRenderToString,
    runtime = require.resolve('@julienne/react-runtime'),
    ...options
  }: Optional<
    SiteOptions<ComponentType, Templates>,
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

export { ReactSite as Site };
