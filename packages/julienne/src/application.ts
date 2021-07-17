import { promises as fs } from 'fs';
import fse from 'fs-extra';
import { join as pathJoin } from 'path';
import vite, { Manifest as ViteManifest } from 'vite';
import { configDefaults, defaultViteLogLevel } from './constants';
import type {
  ClientManifest,
  Config,
  Manifest,
  Output,
  ServerManifest,
  TemplateConfig,
  UserBuildConfig,
} from './types';
import {
  getOutputWithDefaults,
  getTemplateFilename,
  getTemplateManifest,
  getVirtualEntriesFromManifest,
  virtualPlugin,
} from './utils/index';

type SharedBuildConfig = Pick<
  Config<unknown>,
  'base' | 'cwd' | 'templates' | 'viteConfig'
> & { outDir: string };

type Format = 'esm' | 'cjs';

const FORMAT: Format = 'esm';

function getJsExtensionForFormat(format: Format): 'mjs' | 'cjs' {
  return format === 'esm' ? 'mjs' : 'cjs';
}

export async function getClientManifest({
  base,
  outDir,
  templates,
}: {
  base: string;
  outDir: string;
  templates: TemplateConfig;
}): Promise<ClientManifest> {
  let manifest: ViteManifest = await fs
    .readFile(pathJoin(outDir, 'manifest.json'), 'utf-8')
    .then(JSON.parse);

  return Object.fromEntries(
    Object.keys(templates).map((entryName) => {
      let assets = [];

      let entryFileName = getTemplateFilename(entryName);
      let manifestEntry = manifest[entryFileName];
      let publicEntryPath = pathJoin(base, manifestEntry.file);
      assets.push(publicEntryPath);

      if (manifestEntry.css) {
        manifestEntry.css.forEach((css) => {
          let publicCssPath = pathJoin(base, css);
          assets.push(publicCssPath);
        });
      }

      return [entryName, assets];
    }),
  );
}

async function getServerManifest({
  format,
  outDir,
  templates,
}: {
  format: Format;
  outDir: string;
  templates: TemplateConfig;
}): Promise<ServerManifest> {
  const jsExtension = getJsExtensionForFormat(format);

  return Object.fromEntries(
    Object.keys(templates).map((template) => {
      return [template, pathJoin(outDir, `${template}.${jsExtension}`)];
    }),
  );
}

export async function getManifest({
  base,
  output,
  templates,
}: {
  base: string;
  output: Output;
  templates: TemplateConfig;
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
  outDir,
  render,
  templates,
  viteConfig: viteUserConfig = {},
}: SharedBuildConfig & { render: string }): Promise<void> {
  // Creates virtual entries in cwd so that relative imports of template modules
  // work correctly.
  let entryManifest = getTemplateManifest({
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
  templates,
  viteConfig: viteUserConfig = {},
}: SharedBuildConfig & { format: Format }): Promise<void> {
  const jsExtension = getJsExtensionForFormat(format);

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
    plugins: [...(viteUserConfig.plugins ?? [])],
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

export async function build({
  base = configDefaults.base,
  cwd = configDefaults.cwd,
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

  await buildServer({
    ...sharedBuildConfig,
    format: FORMAT,
    outDir: output.server,
  });

  await buildClient({
    ...sharedBuildConfig,
    outDir: output.client,
    render: render.client,
  });

  let manifestPath = pathJoin(output.client, 'manifest.json');
  await fse.copy(output.client, output.public, {
    filter: (path) => {
      return path !== manifestPath;
    },
  });
}
