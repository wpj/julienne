import type { Props, MaybePromise } from './types';

export type RenderToString<Component> = (options: {
  props: Props;
  scripts: string[];
  stylesheets: string[];
  template: {
    name: string;
    component: Component | null;
  };
}) => MaybePromise<string>;
