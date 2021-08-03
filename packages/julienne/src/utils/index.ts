import {
  isAbsolute,
  join as pathJoin,
  parse as parsePath,
  sep as pathSep,
} from 'path';
import type { Plugin as VitePlugin } from 'vite';
import { clientEntryPointTemplate } from '../code-gen';
import type {
  Attributes,
  HydratedModuleStore,
  Output,
  OutputConfig,
  TemplateResources,
} from '../types';

/**
 * Resolves a possibly relative `path` against `basePath`, unless `path` is
 * already absolute.
 */
export function normalizePath(basePath: string, path: string): string {
  return isAbsolute(path) ? path : pathJoin(basePath, path);
}

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

export function getAssets({
  modules,
  modulePreloads,
  css,
}: TemplateResources): {
  links: Attributes[];
  scripts: Attributes[];
} {
  let scripts = modules.map((src) => ({ type: 'module', src }));

  let links = [
    ...css.map((href) => ({ href, type: 'text/css', rel: 'stylesheet' })),
    ...modulePreloads.map((href) => ({ href, rel: 'modulepreload' })),
  ];

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

type GetTempateManifestOptions<Templates> =
  | {
      partialHydration: false;
      cwd: string;
      render: string;
      templates: Templates;
    }
  | {
      partialHydration: true;
      cwd: string;
      hydratedModuleStore: HydratedModuleStore;
      render: string;
      templates: Templates;
    };

export function getTemplateManifest<Templates>({
  cwd,
  render,
  templates,
  ...options
}: GetTempateManifestOptions<Templates>): VirtualManifest {
  return Object.fromEntries(
    Object.entries(templates).map(([templateName, templatePath]) => {
      let filename = getTemplateFilename(templateName);
      let entryPath = pathJoin(cwd, filename);

      let code;
      if (options.partialHydration) {
        let resolvedTemplatePath = normalizePath(cwd, templatePath);
        let components =
          options.hydratedModuleStore.byTemplate[resolvedTemplatePath];

        code = clientEntryPointTemplate({
          partialHydration: true,
          components,
          render,
          templatePath,
        });
      } else {
        code = clientEntryPointTemplate({
          partialHydration: false,
          component: templatePath,
          render,
        });
      }

      return [
        templateName,
        {
          code,
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
