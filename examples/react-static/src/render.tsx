import React, { ComponentType } from 'react';
import { hydrate } from 'react-dom';

export default function render({
  component: Component,
  props,
  target,
}: {
  component: ComponentType;
  props: Record<string, unknown>;
  target: HTMLElement;
}): void {
  hydrate(<Component {...props} />, target);
}
