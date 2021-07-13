import { join as pathJoin, parse as parsePath, sep as pathSep } from 'path';
import type { Plugin as VitePlugin } from 'vite';
import { clientEntryPointTemplate } from '../code-gen';
import type {
  Attributes,
  ClientManifest,
  Output,
  OutputConfig,
} from '../types';

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

export function getAssets(templateAssets: string[]): {
  links: Attributes[];
  scripts: Attributes[];
} {
  let scripts = templateAssets
    .filter((asset: string) => asset.endsWith('.js'))
    .map((src) => {
      return { type: 'module', src };
    });

  let links = templateAssets
    .filter((asset: string) => asset.endsWith('.css'))
    .map((href) => {
      return { href, type: 'text/css', rel: 'stylesheet' };
    });

  return { links, scripts };
}

export type VirtualManifest = {
  [key: string]: {
    code: string;
    path: string;
  };
};

export function getTemplateFilename(name: string): string {
  return `___julienne_${name}___.js`;
}

export function getTemplateManifest<Templates>({
  cwd,
  templates,
  render,
}: {
  cwd: string;
  render: string;
  templates: Templates;
}): VirtualManifest {
  return Object.fromEntries(
    Object.entries(templates).map(([templateName, templatePath]) => {
      let filename = getTemplateFilename(templateName);
      let entryPath = pathJoin(cwd, filename);

      return [
        templateName,
        {
          code: clientEntryPointTemplate({
            component: templatePath,
            render,
          }),
          path: entryPath,
        },
      ];
    }),
  );
}

export function getVirtualEntriesFromManifest(manifest: VirtualManifest): {
  [path: string]: string;
} {
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
    load(id) {
      if (id in virtualEntries) {
        return virtualEntries[id];
      }
    },
  };
}

/**
 * Prepends the public path onto the path of each asset in the entry.
 */
export function makeClientAssets(
  clientManifest: ClientManifest,
  publicPath: string,
): ClientManifest {
  return Object.fromEntries(
    Object.entries(clientManifest).map(([name, assets]) => [
      name,
      assets.map((asset) => pathJoin(publicPath, asset)),
    ]),
  );
}

export function getOutputWithDefaults({
  cwd,
  internal: internalOutputPath = pathJoin(cwd, '.julienne'),
  public: publicOutputPath = pathJoin(cwd, 'public'),
}: OutputConfig & { cwd: string }): Output {
  return {
    client: pathJoin(internalOutputPath, 'client'),
    server: pathJoin(internalOutputPath, 'server'),
    public: publicOutputPath,
  };
}
