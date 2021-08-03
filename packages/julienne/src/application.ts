import { promises as fs } from 'fs';
import fse from 'fs-extra';
import { join as pathJoin } from 'path';
import vite, { Manifest as ViteManifest, ManifestChunk } from 'vite';
import { configDefaults, defaultViteLogLevel } from './constants';
import { moduleAccumulatorPlugin } from './partial-hydration/module-accumulator-plugin';
import { moduleRewritePlugin } from './partial-hydration/module-rewrite-plugin';
import type {
  ClientManifest,
  Config,
  HydratedModuleStore,
  Manifest,
  Output,
  PartialHydrationConfig,
  ServerManifest,
  TemplateConfig,
  UserBuildConfig,
} from './types';
import {
  getOutputWithDefaults,
  getTemplateFilename,
  getTemplateManifest,
  getVirtualEntriesFromManifest,
  normalizePath,
  virtualPlugin,
} from './utils/index';

type SharedBuildConfig = Pick<
  Config<unknown, string>,
  'base' | 'cwd' | 'templates' | 'viteConfig' | 'experimental'
> & { outDir: string };

type Format = 'esm' | 'cjs';

const FORMAT: Format = 'esm';

function getJsExtensionForFormat(format: Format): 'mjs' | 'cjs' {
  return format === 'esm' ? 'mjs' : 'cjs';
}

/**
 * Recursively crawl the manifest, accumulating modules, preloads, and css for a
 * chunk.
 */
function processChunk(
  { isEntry, imports, css, file }: ManifestChunk,
  manifest: ViteManifest,
  resources: {
    modules: Set<string>;
    modulePreloads: Set<string>;
    css: Set<string>;
  },
) {
  if (isEntry) {
    resources.modules.add(file);
  } else {
    resources.modulePreloads.add(file);
  }

  if (css) {
    css.forEach((cssFile) => {
      resources.css.add(cssFile);
    });
  }

  if (imports) {
    imports.forEach((chunk) => {
      processChunk(manifest[chunk], manifest, resources);
    });
  }
}

export async function getClientManifest<Template extends string>({
  base,
  outDir,
  templates,
}: {
  base: string;
  outDir: string;
  templates: TemplateConfig<Template>;
}): Promise<ClientManifest> {
  let manifest: ViteManifest = await fs
    .readFile(pathJoin(outDir, 'manifest.json'), 'utf-8')
    .then(JSON.parse);

  function makePublic(path: string) {
    return pathJoin(base, path);
  }

  return Object.fromEntries(
    Object.keys(templates).map((entryName) => {
      let resources = {
        css: new Set<string>(),
        modules: new Set<string>(),
        modulePreloads: new Set<string>(),
      };

      let entryFileName = getTemplateFilename(entryName);
      let manifestEntry = manifest[entryFileName];

      processChunk(manifestEntry, manifest, resources);

      return [
        entryName,
        {
          css: Array.from(resources.css).map(makePublic),
          modules: Array.from(resources.modules).map(makePublic),
          modulePreloads: Array.from(resources.modulePreloads).map(makePublic),
        },
      ];
    }),
  );
}

async function getServerManifest<Template extends string>({
  format,
  outDir,
  templates,
}: {
  format: Format;
  outDir: string;
  templates: TemplateConfig<Template>;
}): Promise<ServerManifest> {
  const jsExtension = getJsExtensionForFormat(format);

  return Object.fromEntries(
    Object.keys(templates).map((template) => {
      return [template, pathJoin(outDir, `${template}.${jsExtension}`)];
    }),
  );
}

export async function getManifest<Template extends string>({
  base,
  output,
  templates,
}: {
  base: string;
  output: Output;
  templates: TemplateConfig<Template>;
}): Promise<Manifest> {
  let client = await getClientManifest({
    base,
    outDir: output.client,
    templates,
  });

  let server = await getServerManifest({
    format: FORMAT,
    outDir: output.server,
    templates,
  });

  return { client, server };
}

export async function buildClient({
  base,
  cwd,
  hydratedModuleStore,
  outDir,
  render,
  templates,
  viteConfig: viteUserConfig = {},
}: SharedBuildConfig & {
  render: string;
  hydratedModuleStore: HydratedModuleStore | null;
}): Promise<void> {
  // Creates virtual entries in cwd so that relative imports of template modules
  // work correctly.
  let entryManifest =
    hydratedModuleStore !== null
      ? getTemplateManifest({
          partialHydration: true,
          cwd,
          hydratedModuleStore,
          render,
          templates,
        })
      : getTemplateManifest({
          partialHydration: false,
          cwd,
          render,
          templates,
        });

  let virtualEntries = getVirtualEntriesFromManifest(entryManifest);

  let input = Object.fromEntries(
    Object.entries(entryManifest).map(([templateName, { path }]) => {
      return [templateName, path];
    }),
  );

  const viteConfig = {
    logLevel: defaultViteLogLevel,
    ...viteUserConfig,
    base,
    build: {
      ...viteUserConfig.build,
      cssCodeSplit: true,
      manifest: true,
      outDir,
      rollupOptions: {
        ...viteUserConfig.build?.rollupOptions,
        input,
        output: {
          entryFileNames: '_julienne/static/[name]-[hash].js',
          chunkFileNames: '_julienne/static/chunks/[name]-[hash].js',
          assetFileNames: '_julienne/static/assets/[name]-[hash][extname]',
        },
      },
    },
    plugins: [virtualPlugin(virtualEntries), ...(viteUserConfig.plugins ?? [])],
    resolve: {
      ...viteUserConfig.resolve,
    },
    root: cwd,
  };

  await vite.build({
    ...viteConfig,
    configFile: false,
  });
}

export async function buildServer({
  base,
  cwd,
  format,
  outDir,
  partialHydration,
  templates,
  viteConfig: viteUserConfig = {},
}: SharedBuildConfig & {
  format: Format;
  partialHydration?: PartialHydrationConfig;
}): Promise<HydratedModuleStore | null> {
  const jsExtension = getJsExtensionForFormat(format);

  let resolvedTemplates = Object.fromEntries(
    Object.entries(templates).map(([templateName, templatePath]) => [
      templateName,
      normalizePath(cwd, templatePath),
    ]),
  );

  let moduleStore: HydratedModuleStore = {
    byId: new Map(),
    byTemplate: Object.fromEntries(
      Object.values(resolvedTemplates).map((template) => [template, []]),
    ),
  };

  let plugins = [];

  if (partialHydration) {
    plugins.push(
      moduleAccumulatorPlugin(moduleStore, partialHydration.flags),
      moduleRewritePlugin(moduleStore, partialHydration.wrap),
    );
  }

  const viteConfig = {
    logLevel: defaultViteLogLevel,
    ...viteUserConfig,
    base,
    build: {
      ...viteUserConfig.build,
      outDir,
      rollupOptions: {
        ...viteUserConfig.build?.rollupOptions,
        input: templates,
        output: {
          ...viteUserConfig.build?.rollupOptions?.output,
          format,
          entryFileNames: `[name].${jsExtension}`,
          chunkFileNames: `chunks/[name]-[hash].${jsExtension}`,
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
      ssr: true,
    },
    plugins: [...plugins, ...(viteUserConfig.plugins ?? [])],
    resolve: {
      ...viteUserConfig.resolve,
    },
    root: cwd,
  };

  await vite.build({
    ...viteConfig,
    configFile: false,
  });

  return partialHydration ? moduleStore : null;
}

export async function build({
  base = configDefaults.base,
  cwd = configDefaults.cwd,
  experimental,
  output: outputConfig,
  render,
  templates,
  viteConfig = configDefaults.viteConfig,
}: UserBuildConfig): Promise<void> {
  let output = getOutputWithDefaults({ cwd, ...outputConfig });

  let sharedBuildConfig = {
    cwd,
    base,
    templates,
    viteConfig,
  };

  let hydratedModuleStore = await buildServer({
    ...sharedBuildConfig,
    format: FORMAT,
    outDir: output.server,
    partialHydration: experimental?.partialHydration,
  });

  await buildClient({
    ...sharedBuildConfig,
    outDir: output.client,
    render: render.client,
    hydratedModuleStore: experimental?.partialHydration
      ? hydratedModuleStore
      : null,
  });

  let manifestPath = pathJoin(output.client, 'manifest.json');
  await fse.copy(output.client, output.public, {
    filter: (path) => {
      return path !== manifestPath;
    },
  });
}
