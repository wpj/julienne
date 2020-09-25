import {
  RenderToString,
  Site as JulienneSite,
  SiteOptions,
  TemplateConfig,
} from 'julienne';
import type { ComponentType } from 'react';
import { renderToString } from './render';
import { createWebpackConfig } from './webpack';

type Options<Templates extends TemplateConfig> = Omit<
  SiteOptions<ComponentType, Templates>,
  'renderToString' | 'runtime'
> & {
  dev?: boolean;
  renderToString?: RenderToString<ComponentType>;
  runtime?: string;
};

class ReactSite<Templates extends TemplateConfig> extends JulienneSite<
  ComponentType,
  Templates
> {
  constructor({ dev = false, ...options }: Options<Templates>) {
    super({
      renderToString,
      runtime: require.resolve('@julienne/react-runtime'),
      webpackConfig: createWebpackConfig({ dev }),
      ...options,
    });
  }
}

export { ReactSite as Site };
