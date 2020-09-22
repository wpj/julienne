import type { Props, MaybePromise } from './types';

export type Render = (options: {
  props: Props;
  scripts: string[];
  stylesheets: string[];
  template: {
    name: string;
    component: null | unknown;
  };
}) => MaybePromise<string>;
