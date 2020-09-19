import { TemplateConfig } from '../types';

export interface Renderer<Templates extends TemplateConfig> {
  render: ({
    props,
    template,
  }: {
    props: any;
    template: keyof Templates;
  }) => string | Promise<string>;
}
