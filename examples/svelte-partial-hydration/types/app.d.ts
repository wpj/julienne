import type { Renderer as _Renderer } from 'julienne';
import type { SvelteComponent } from 'svelte';

import { sharedOptions } from '../config.js';

export type Template = keyof typeof sharedOptions.templates;

export type Renderer = _Renderer<SvelteComponent, Template>;
