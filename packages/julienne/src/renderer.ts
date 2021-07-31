import {
  createServer as createViteServer,
  UserConfig as ViteUserConfig,
  ViteDevServer,
} from 'vite';
import { getManifest } from './application';
import {
  configDefaults,
  defaultViteLogLevel,
  requestContextKey,
} from './constants';
import { renderDocument as defaultRenderDocument } from './document';
import type {
  Attributes,
  ClientManifest,
  GetComponent,
  GetResourcesForComponent,
  HandleError,
  PostProcessHtml,
  Props,
  RenderDocument,
  Renderer as RendererInterface,
  ServerContext,
  ServerManifest,
  ServerRender,
  UserConfig,
  TemplateConfig,
} from './types';
import {
  getAssets,
  getOutputWithDefaults,
  getTemplateManifest,
  getVirtualEntriesFromManifest,
  VirtualManifest,
  virtualPlugin,
} from './utils/index';

type NormalizedRender<Component> = (
  component: Component,
  props: Props,
  context?: ServerContext,
) => Promise<{ html: string; head?: string }>;

function createNormalizedRender<Component>(
  render: ServerRender<Component>,
): NormalizedRender<Component> {
  return async function normalizedRenderToString(
    component: Component,
    props: Props,
    context?: ServerContext,
  ) {
    let renderResult = await render(component, props, context);

    if (typeof renderResult === 'string') {
      return { html: renderResult };
    }

    return { html: renderResult.html, head: renderResult.head };
  };
}

export async function createRenderer<Component, Template extends string>({
  base = configDefaults.base,
  cwd = configDefaults.cwd,
  output: outputConfig,
  experimental,
  render,
  templates,
}: UserConfig<Component, Template>): Promise<Renderer<Component, Template>> {
  let output = getOutputWithDefaults({ cwd, ...outputConfig });

  let manifest = await getManifest({ base, output, templates });

  let getComponent = createGetProdComponent<Component, Template>(
    manifest.server,
  );

  let getResourcesForTemplate = createGetResourcesForProdComponent<Template>(
    manifest.client,
  );

  return new Renderer<Component, Template>({
    getResourcesForTemplate,
    getComponent,
    partialHydration: Boolean(experimental?.partialHydration),
    render: render.server,
    renderDocument: render.document,
  });
}

export async function createDevRenderer<Component, Template extends string>({
  base = configDefaults.base,
  cwd = configDefaults.cwd,
  render,
  templates,
  viteConfig: viteUserConfig = configDefaults.viteConfig,
}: UserConfig<Component, Template>): Promise<
  [Renderer<Component, Template>, ViteDevServer]
> {
  let entryManifest = getTemplateManifest({
    partialHydration: false,
    cwd,
    render: render.client,
    templates,
  });

  let virtualEntries = getVirtualEntriesFromManifest(entryManifest);

  let viteConfig: ViteUserConfig = {
    logLevel: defaultViteLogLevel,
    ...viteUserConfig,
    base,
    plugins: [virtualPlugin(virtualEntries), ...(viteUserConfig.plugins ?? [])],
    resolve: {
      ...viteUserConfig.resolve,
    },
    root: cwd,
    server: {
      middlewareMode: 'ssr',
    },
  };

  let vite = await createViteServer({
    ...viteConfig,
    configFile: false,
  });

  let getResourcesForTemplate =
    createGetResourcesForDevComponent<Template>(entryManifest);

  let getComponent = createGetDevComponent<Component, Template>(
    vite,
    templates,
  );

  async function postProcessHtml(html: string, context: ServerContext = {}) {
    let request = context[requestContextKey];
    let url = request?.url ?? '';

    return await vite.transformIndexHtml(url, html);
  }

  function handleError(error: Error) {
    vite.ssrFixStacktrace(error);
    throw error;
  }

  let renderer = new Renderer<Component, Template>({
    getResourcesForTemplate,
    getComponent,
    handleError,
    partialHydration: false,
    postProcessHtml,
    render: render.server,
    renderDocument: render.document,
  });

  return [renderer, vite];
}

function createGetProdComponent<Component, Template extends string>(
  manifest: ServerManifest,
) {
  return async function getComponent(template: Template): Promise<Component> {
    let templatePath = manifest[template];
    let component = await import(templatePath).then((mod) => mod.default);

    return component;
  };
}

function createGetResourcesForProdComponent<Template extends string>(
  manifest: ClientManifest,
) {
  return function getResourcesForTemplate(template: Template) {
    let templateAssets = manifest[template];

    return getAssets(templateAssets);
  };
}

function createGetDevComponent<Component, Template extends string>(
  vite: ViteDevServer,
  templates: TemplateConfig<Template>,
) {
  return async function getComponent(template: Template): Promise<Component> {
    let component = await vite
      .ssrLoadModule(templates[template])
      .then((mod) => mod.default);
    return component;
  };
}

function createGetResourcesForDevComponent<Template extends string>(
  entryManifest: VirtualManifest,
) {
  return function getResourcesForDevTemplate(template: Template) {
    let src = entryManifest[template].path;

    let scripts = [
      {
        type: 'module',
        src,
      },
    ];

    const links: Attributes[] = [];

    return { scripts, links };
  };
}

function defaultHandleError(error: Error) {
  throw error;
}

export class Renderer<Component, Template extends string>
  implements RendererInterface<Template>
{
  #getResourcesForTemplate: GetResourcesForComponent<Template>;
  #getComponent: GetComponent<Component, Template>;
  #handleError: HandleError;
  #partialHydration: boolean;
  #postProcessHtml?: PostProcessHtml;
  #render: NormalizedRender<Component>;
  #renderDocument: RenderDocument;

  constructor({
    getResourcesForTemplate,
    getComponent,
    handleError = defaultHandleError,
    partialHydration = false,
    postProcessHtml,
    render,
    renderDocument = defaultRenderDocument,
  }: {
    getResourcesForTemplate: GetResourcesForComponent<Template>;
    getComponent: GetComponent<Component, Template>;
    handleError?: HandleError;
    partialHydration?: boolean;
    postProcessHtml?: PostProcessHtml;
    render: ServerRender<Component>;
    renderDocument?: RenderDocument;
  }) {
    this.#getResourcesForTemplate = getResourcesForTemplate;
    this.#getComponent = getComponent;
    this.#handleError = handleError;
    this.#partialHydration = partialHydration;
    this.#postProcessHtml = postProcessHtml;
    this.#render = createNormalizedRender(render);
    this.#renderDocument = renderDocument;
  }

  async render(
    template: Template,
    props: Props,
    context?: ServerContext,
  ): Promise<string> {
    let getResourcesForTemplate = this.#getResourcesForTemplate;
    let getComponent = this.#getComponent;
    let handleError = this.#handleError;
    let partialHydration = this.#partialHydration;
    let postProcessHtml = this.#postProcessHtml;
    let render = this.#render;
    let renderDocument = this.#renderDocument;

    try {
      let component = await getComponent(template);

      let { head, html } = await render(component, props, context);

      let pageData = partialHydration ? null : { props, template: template };
      let { scripts, links } = getResourcesForTemplate(template);

      let renderedPage = renderDocument({
        body: html,
        head,
        links,
        pageData,
        scripts,
      });

      let transformedPage = postProcessHtml
        ? await postProcessHtml(renderedPage, context)
        : renderedPage;

      return transformedPage;
    } catch (e) {
      handleError(e);
      throw e;
    }
  }
}
