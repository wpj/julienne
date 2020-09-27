import React from 'react';
import { render, hydrate as reactHydrate } from 'react-dom';

import { getPage, getRoot, Runtime } from '@julienne/runtime';

const runtime: Runtime<React.ComponentType> = ({
  hydrate,
  template: Template,
}) => {
  let page = getPage();

  if (hydrate) {
    reactHydrate(<Template {...page.props} />, getRoot());
  } else {
    render(<Template {...page.props} />, getRoot());
  }
};

export default runtime;
