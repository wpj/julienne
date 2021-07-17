import { templates } from './config.js';

type Template = keyof typeof templates;

export type Pages = Record<
  string,
  { template: Template; props: Record<string, unknown> }
>;
