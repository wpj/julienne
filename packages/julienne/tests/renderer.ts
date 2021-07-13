import * as td from 'testdouble';
import { suite } from 'uvu';
import * as assert from 'uvu/assert';
import { Renderer } from '../src/renderer';
import type { RenderDocument, ServerContext } from '../src/types';

type Props = Record<string, unknown>;
type Component = (props: Record<string, unknown>) => string;

function render(component: Component, props: Props) {
  return component(props);
}

type GetComponent = (path: string) => Promise<Component>;

type GetResourcesForTemplate = (template: string) => {
  scripts: Record<string, string | boolean | undefined | null>[];
  links: Record<string, string | boolean | undefined | null>[];
};

let test = suite<{
  getComponent: GetComponent;
  getResourcesForTemplate: GetResourcesForTemplate;
}>('Renderer');

test.before((context) => {
  context.getComponent = td.func<(path: string) => Promise<Component>>();

  context.getResourcesForTemplate = td.func<GetResourcesForTemplate>();
});

test.after.each(() => {
  td.reset();
});

test('renders a template', async ({
  getComponent,
  getResourcesForTemplate,
}) => {
  td.when(getComponent('main')).thenResolve(({ name }: { name: string }) => {
    return `<div>Hello, <span>${name}</span></div>`;
  });

  td.when(getResourcesForTemplate('main')).thenReturn({
    scripts: [{ src: '/main.js', type: 'module' }],
    links: [{ href: '/main.css', rel: 'stylesheet', type: 'text/css' }],
  });

  let renderer = new Renderer<Component, { main: string }>({
    getComponent,
    getResourcesForTemplate,
    render: render,
  });

  let rendered = await renderer.render('main', { name: 'Test' });

  assert.type(rendered, 'string');
});

let testResources = {
  scripts: [{ src: '/main.js', type: 'module' }],
  links: [{ href: '/main.css', rel: 'stylesheet', type: 'text/css' }],
};

test('renders a custom document', async ({
  getComponent,
  getResourcesForTemplate,
}) => {
  let renderedTemplate = 'rendered';

  td.when(getComponent('main')).thenResolve(() => renderedTemplate);
  td.when(getResourcesForTemplate('main')).thenReturn(testResources);

  let renderDocument = td.func<RenderDocument>();

  let renderer = new Renderer<Component, { main: string }>({
    getComponent,
    getResourcesForTemplate,
    render: render,
    renderDocument,
  });

  td.when(
    renderDocument({
      ...testResources,
      body: renderedTemplate,
      head: undefined,
      pageData: { template: 'main', props: { name: 'Test' } },
    }),
  ).thenReturn('rendered document');

  assert.is(
    await renderer.render('main', { name: 'Test' }),
    'rendered document',
  );
});

test('post-processes rendered HTML', async ({
  getComponent,
  getResourcesForTemplate,
}) => {
  td.when(getComponent('main')).thenResolve(() => 'rendered');
  td.when(getResourcesForTemplate('main')).thenReturn(testResources);

  let postProcessHtml =
    td.func<(html: string, context?: ServerContext) => Promise<string>>();

  let renderer = new Renderer<Component, { main: string }>({
    getComponent,
    getResourcesForTemplate,
    render: render,
    renderDocument: () => 'rendered',
    postProcessHtml,
  });

  let context = {};

  await renderer.render('main', { name: 'Test' }, context);

  td.verify(postProcessHtml('rendered', context));
});

test('passes exceptions to `handleError`', async ({
  getComponent,
  getResourcesForTemplate,
}) => {
  let renderError = new Error('Render error');
  let component = () => {
    throw renderError;
  };

  td.when(getComponent('main')).thenResolve(component);
  td.when(getResourcesForTemplate('main')).thenReturn(testResources);

  const handleError = td.func<(e: Error) => void>();

  function render(component: Component, props: Props): Promise<string> {
    return Promise.resolve(component(props));
  }

  let renderer = new Renderer<Component, { main: string }>({
    getComponent,
    getResourcesForTemplate,
    handleError,
    render,
  });

  try {
    await renderer.render('main', { name: 'Test' });
    assert.unreachable();
  } catch (e) {
    assert.is(e, renderError);
  }

  td.verify(handleError(renderError));
});

test.run();
