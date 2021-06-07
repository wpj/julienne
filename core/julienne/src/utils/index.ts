import { join as pathJoin, parse as parsePath, sep as pathSep } from 'path';
import { clientEntryPointTemplate } from '../code-gen';
import type { EntryAssets } from '../types';
import type { Plugin as VitePlugin } from 'vite';

export const internalDirName = `${process.cwd()}/__build__`;

/**
 * Converts a file path to a name suitable as an entry.
 */
export function pathToName({
  path: rawPath,
  cwd,
}: {
  path: string;
  cwd: string;
}): string {
  const parsed = parsePath(rawPath);

  return pathJoin(parsed.dir, parsed.name)
    .replace(cwd, '')
    .replace(new RegExp(pathSep, 'g'), '__')
    .replace(/-/g, '_');
}

export function identity<T>(val: T): T {
  return val;
}

export function getAssets(
  templateAssets: string[],
): {
  scripts: string[];
  stylesheets: string[];
} {
  let scripts = templateAssets.filter((asset: string) => asset.endsWith('.js'));

  let stylesheets = templateAssets.filter((asset: string) =>
    asset.endsWith('.css'),
  );

  return { scripts, stylesheets };
}

export type Manifest = {
  [key: string]: {
    code: string;
    filename: string;
    path: string;
  };
};

export function getTemplateManifest<Templates>({
  cwd,
  dev,
  hydrate,
  templates,
  runtime,
}: {
  cwd: string;
  dev: boolean;
  hydrate: boolean;
  runtime: string;
  templates: Templates;
}): Manifest {
  return Object.fromEntries(
    Object.entries(templates).map(([templateName, templatePath]) => {
      let filename = `___julienne_${templateName}___.js`;
      let path = pathJoin(cwd, filename);
      return [
        templateName,
        {
          code: clientEntryPointTemplate({
            dev,
            hydrate,
            runtime,
            template: templatePath,
          }),
          filename,
          path,
        },
      ];
    }),
  );
}

export function getVirtualEntriesFromManifest(
  manifest: Manifest,
): { [path: string]: string } {
  return Object.fromEntries(
    Object.values(manifest).map(({ code, path }) => {
      return [path, code];
    }),
  );
}

export function virtualPlugin(virtualEntries: {
  [id: string]: string;
}): VitePlugin {
  return {
    name: 'julienne-virtual',
    resolveId(id) {
      if (id in virtualEntries) {
        return id;
      }
    },
    async load(id) {
      if (id in virtualEntries) {
        const mod = virtualEntries[id];

        return mod;
      }
    },
  };
}

/**
 * Prepends the public path onto the path of each asset in the entry.
 */
export function makePublicEntryAssets(
  entryAssets: EntryAssets,
  publicPath: string,
): EntryAssets {
  return Object.fromEntries(
    Object.entries(entryAssets).map(([name, assets]) => [
      name,
      assets.map((asset) => pathJoin(publicPath, asset)),
    ]),
  );
}
