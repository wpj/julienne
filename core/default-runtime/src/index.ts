import { getPage, getRoot, Runtime } from '@julienne/runtime';

const runtime: Runtime = ({ dev, template: Template }) => {
  let page = getPage();

  new Template({
    hydrate: !dev,
    props: page.props,
    target: getRoot(),
  });
};

export default runtime;
