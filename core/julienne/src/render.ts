import type { Props, MaybePromise } from './types';

// TODO: Fix this type.
export type ScriptAttributes = Partial<
  Pick<
    HTMLScriptElement,
    | 'async'
    | 'crossOrigin'
    | 'defer'
    | 'integrity'
    | 'noModule'
    | 'referrerPolicy'
    | 'src'
    | 'type'
  > & { content: string }
>;

export type RenderToString<Component> = (options: {
  props: Props;
  scripts: ScriptAttributes[];
  stylesheets: string[];
  template: {
    name: string;
    component: Component | null;
  };
}) => MaybePromise<string>;
