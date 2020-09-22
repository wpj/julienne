import React from 'react';
import { render, hydrate as reactHydrate } from 'react-dom';

import { getPage, getRoot } from '@julienne/runtime';

export default function runtime({
  hydrate,
  template: Template,
}: {
  hydrate: boolean;
  template: React.ComponentType;
}): void {
  let page = getPage();

  if (hydrate) {
    reactHydrate(<Template {...page.props} />, getRoot());
  } else {
    render(<Template {...page.props} />, getRoot());
  }
}
