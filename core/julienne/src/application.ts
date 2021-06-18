import { promises as fs } from 'fs';
import { join as pathJoin } from 'path';
import type { OutputChunk } from 'rollup';
import vite, { Manifest, UserConfig as ViteUserConfig } from 'vite';
import { ClientBuild, ServerBuild } from './build';
import type { TemplateConfig } from './types';
import {
  getTemplateManifest,
  getVirtualEntriesFromManifest,
  virtualPlugin,
} from './utils';

export type Format = 'esm' | 'cjs';

export interface Options<Templates extends TemplateConfig> {
  base: string;
  cwd?: string;
  outDir: string;
  runtime: string;
  templates: Templates;
  viteConfig?: ViteUserConfig;
}

export async function buildClient<Templates extends TemplateConfig>({
  base,
  cwd = process.cwd(),
  outDir,
  runtime,
  templates,
  viteConfig: viteUserConfig = {},
}: Options<Templates>): Promise<ClientBuild> {
  // Creates virtual entries in cwd so that relative imports of template modules
  // work correctly.
  let entryManifest = getTemplateManifest({
    cwd,
    dev: false,
    hydrate: true,
    runtime,
    templates,
  });

  let virtualEntries = getVirtualEntriesFromManifest(entryManifest);

  let input = Object.fromEntries(
    Object.entries(entryManifest).map(([templateName, { path }]) => {
      return [templateName, path];
    }),
  );

  const viteConfig = {
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
    logLevel: viteUserConfig.logLevel ?? 'silent',
    plugins: [virtualPlugin(virtualEntries), ...(viteUserConfig.plugins ?? [])],
    resolve: {
      ...viteUserConfig.resolve,
    },
    root: cwd,
  };

  let bundle = await vite.build({
    ...viteConfig,
    configFile: false,
  });

  if (!('output' in bundle)) {
    throw new Error('Rollup build produced unexpected multiple output');
  }

  let manifest: Manifest = await fs
    .readFile(pathJoin(outDir, 'manifest.json'), 'utf-8')
    .then(JSON.parse);

  let entryAssets: { [key: string]: string[] } = {};

  Object.entries(entryManifest).forEach(
    ([entryName, { filename: entryFileName }]) => {
      if (!(entryName in entryAssets)) {
        entryAssets[entryName] = [];
      }

      let assets = entryAssets[entryName];

      let manifestEntry = manifest[entryFileName];

      assets.push(pathJoin(base, manifestEntry.file));

      if (manifestEntry.css) {
        manifestEntry.css.forEach((css) => {
          assets.push(css);
        });
      }
    },
  );

  return new ClientBuild({
    base,
    entryAssets,
  });
}

export async function buildServer<Templates extends TemplateConfig>({
  base,
  cwd = process.cwd(),
  format,
  outDir,
  templates,
  viteConfig: viteUserConfig = {},
}: Omit<Options<Templates>, 'runtime'> & {
  format: Format;
}): Promise<ServerBuild> {
  const jsExtension = format === 'esm' ? 'mjs' : 'cjs';

  const viteConfig = {
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
    logLevel: viteUserConfig.logLevel ?? 'silent',
    plugins: [...(viteUserConfig.plugins ?? [])],
    resolve: {
      ...viteUserConfig.resolve,
    },
    root: cwd,
  };

  let bundle = await vite.build({
    ...viteConfig,
    configFile: false,
  });

  if (!('output' in bundle)) {
    throw new Error('Rollup build produced unexpected multiple output');
  }

  let chunks = bundle.output.filter(
    (chunkOrAsset): chunkOrAsset is OutputChunk => {
      return chunkOrAsset.type === 'chunk';
    },
  );

  let entryAssets: { [key: string]: string[] } = {};

  for (let chunk of chunks) {
    if (chunk.isEntry) {
      if (!(chunk.name in entryAssets)) {
        entryAssets[chunk.name] = [];
      }

      let assets = entryAssets[chunk.name];

      assets.push(pathJoin(outDir, chunk.fileName));
    }
  }

  return new ServerBuild({
    entryAssets,
  });
}
