import {
  createServer as createViteServer,
  UserConfig as ViteUserConfig,
  ViteDevServer,
} from 'vite';
import { getManifest } from './application';
import { requestContextKey } from './constants';
import { renderDocument as defaultRenderDocument } from './document';
import type {
  Attributes,
  ClientManifest,
  GetComponent,
  GetResourcesForComponent,
  HandleError,
  UserConfig,
  PostProcessHtml,
  Props,
  ServerRender,
  RenderDocument,
  Renderer as RendererInterface,
  ServerContext,
  ServerManifest,
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
import { configDefaults, defaultViteLogLevel } from './constants';

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

export async function createRenderer<
  Component,
  Templates extends TemplateConfig,
>({
  base = configDefaults.base,
  cwd = configDefaults.cwd,
  output: outputConfig,
  render,
  templates,
}: UserConfig<Component, Templates>): Promise<Renderer<Component, Templates>> {
  let output = getOutputWithDefaults({ cwd, ...outputConfig });

  let manifest = await getManifest({ base, output, templates });

  let getComponent = createGetProdComponent<Component, Templates>(
    manifest.server,
  );

  let getResourcesForTemplate = createGetResourcesForProdComponent<Templates>(
    manifest.client,
  );

  return new Renderer<Component, Templates>({
    getResourcesForTemplate,
    getComponent,
    render: render.server,
    renderDocument: render.document,
  });
}

export async function createDevRenderer<
  Component,
  Templates extends TemplateConfig,
>({
  base = configDefaults.base,
  cwd = configDefaults.cwd,
  render,
  templates,
  viteConfig: viteUserConfig = configDefaults.viteConfig,
}: UserConfig<Component, Templates>): Promise<
  [Renderer<Component, Templates>, ViteDevServer]
> {
  let entryManifest = getTemplateManifest({
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
    createGetResourcesForDevComponent<Templates>(entryManifest);

  let getComponent = createGetDevComponent<Component, Templates>(
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

  let renderer = new Renderer<Component, Templates>({
    getResourcesForTemplate,
    getComponent,
    handleError,
    postProcessHtml,
    render: render.server,
    renderDocument: render.document,
  });

  return [renderer, vite];
}

function createGetProdComponent<Component, Templates extends TemplateConfig>(
  manifest: ServerManifest,
) {
  return async function getComponent(
    template: keyof Templates,
  ): Promise<Component> {
    let templatePath = manifest[template as string];
    let component = await import(templatePath).then((mod) => mod.default);

    return component;
  };
}

function createGetResourcesForProdComponent<Templates extends TemplateConfig>(
  manifest: ClientManifest,
) {
  return function getResourcesForTemplate(template: keyof Templates) {
    let templateAssets = manifest[template as string];

    return getAssets(templateAssets);
  };
}

function createGetDevComponent<Component, Templates extends TemplateConfig>(
  vite: ViteDevServer,
  templates: Templates,
) {
  return async function getComponent(
    template: keyof Templates,
  ): Promise<Component> {
    let component = await vite
      .ssrLoadModule(templates[template as string])
      .then((mod) => mod.default);
    return component;
  };
}

function createGetResourcesForDevComponent<Templates extends TemplateConfig>(
  entryManifest: VirtualManifest,
) {
  return function getResourcesForDevTemplate(template: keyof Templates) {
    let src = entryManifest[template as string].path;

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

export class Renderer<Component, Templates extends TemplateConfig>
  implements RendererInterface<Templates>
{
  #getResourcesForTemplate: GetResourcesForComponent<Templates>;
  #getComponent: GetComponent<Component, Templates>;
  #handleError: HandleError;
  #postProcessHtml?: PostProcessHtml;
  #render: NormalizedRender<Component>;
  #renderDocument: RenderDocument;

  constructor({
    getResourcesForTemplate,
    getComponent,
    handleError = defaultHandleError,
    postProcessHtml,
    render,
    renderDocument = defaultRenderDocument,
  }: {
    getResourcesForTemplate: GetResourcesForComponent<Templates>;
    getComponent: GetComponent<Component, Templates>;
    handleError?: HandleError;
    postProcessHtml?: PostProcessHtml;
    render: ServerRender<Component>;
    renderDocument?: RenderDocument;
  }) {
    this.#getResourcesForTemplate = getResourcesForTemplate;
    this.#getComponent = getComponent;
    this.#handleError = handleError;
    this.#postProcessHtml = postProcessHtml;
    this.#render = createNormalizedRender(render);
    this.#renderDocument = renderDocument;
  }

  async render(
    template: keyof Templates,
    props: Props,
    context?: ServerContext,
  ): Promise<string> {
    let getResourcesForTemplate = this.#getResourcesForTemplate;
    let getComponent = this.#getComponent;
    let handleError = this.#handleError;
    let postProcessHtml = this.#postProcessHtml;
    let render = this.#render;
    let renderDocument = this.#renderDocument;

    try {
      let component = await getComponent(template);

      let { head, html } = await render(component, props, context);

      let pageData = { props, template: template };
      let { scripts, links } = getResourcesForTemplate(template as string);

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
