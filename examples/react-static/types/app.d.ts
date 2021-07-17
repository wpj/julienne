import type { Renderer as _Renderer } from 'julienne';
import type { ComponentType } from 'react';

import { sharedOptions } from '../config.js';

export type Template = keyof typeof sharedOptions.templates;

export type Renderer = _Renderer<ComponentType, Template>;
