import type { MaybePromise, Props, TemplateConfig } from '../types';

export interface Renderer<Templates extends TemplateConfig> {
  render: ({
    props,
    template,
  }: {
    props: Props;
    template: keyof Templates;
  }) => MaybePromise<string>;
}
