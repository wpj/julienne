import type * as webpack from 'webpack';
import { SingleEntryPlugin } from 'webpack';
import VirtualModules from 'webpack-virtual-modules';

import { Store } from './store';
import { internalDirName, moduleMapTemplate, pathToName } from '../utils';
import type { Flag } from './shared';

const PLUGIN_ID = 'FlaggedModulePlugin';

function runtimeTemplate(importIdentifiers: string[]) {
  return `
  function mount(componentMap, placeholders) {
    placeholders.forEach((placeholder) => {
      let dataString = placeholder.getAttribute('data-julienne');
      let { id, props } = JSON.parse(dataString);
      let Component = componentMap[id];

      let App = new Component({
        target: placeholder,
        props,
        hydrate: true,
      });
    });
  }

  const componentMap = { ${importIdentifiers.join(', ')} };

  const placeholderElements = document.querySelectorAll('[data-julienne]');

  mount(componentMap, placeholderElements);
`;
}

async function normalizeEntryNames(
  entry: string | string[] | webpack.Entry | webpack.EntryFunc | undefined,
): Promise<string[]> {
  if (
    typeof entry === 'string' ||
    Array.isArray(entry) ||
    entry === undefined
  ) {
    return ['main'];
  } else if (typeof entry === 'function') {
    return normalizeEntryNames(await entry());
  } else {
    return Object.keys(entry);
  }
}

interface Options {
  cwd?: string;
  childConfig?: webpack.Configuration;
  flag: Flag;
}

export class FlaggedModulePlugin {
  cwd: string;
  childConfig: webpack.Configuration;
  flag: Flag;

  constructor(options: Options) {
    let { cwd = process.cwd(), childConfig = {}, flag } = options;
    this.cwd = cwd;
    this.childConfig = childConfig;
    this.flag = flag;
  }

  apply(compiler: webpack.Compiler) {
    let store = new Store();

    compiler.hooks.make.tap(PLUGIN_ID, (compilation) => {
      compilation.hooks.optimizeChunkAssets.tapPromise(
        PLUGIN_ID,
        async (chunks) => {
          let { cwd, childConfig } = this;

          let parentEntry = compiler.options.entry;

          let entryNames = await normalizeEntryNames(parentEntry);

          let moduleMap = getModuleMapFromChunks(chunks, entryNames, store);

          // @ts-ignore
          let childCompiler: webpack.Compiler = compilation.createChildCompiler(
            PLUGIN_ID,
            childConfig.output,
            childConfig.plugins || [],
          );

          childCompiler.options.module = childCompiler.options.module || {
            rules: [],
          };

          if (childConfig.module?.rules) {
            childCompiler.options.module.rules = childConfig.module.rules;
          }

          let virtualModules = new VirtualModules();

          virtualModules.apply(childCompiler);

          // Create virtual entries and add them to the child compilation.
          Object.keys(moduleMap).forEach((entryName) => {
            let modules = moduleMap[entryName];
            let imports = Object.fromEntries(
              modules.map((mod) => {
                return [pathToName({ path: mod, cwd }), mod];
              }),
            );

            let entrySource = [
              moduleMapTemplate(imports, false),
              runtimeTemplate(Object.keys(imports)),
            ].join('\n');

            let entryPath = `${internalDirName}/${entryName}.js`;

            virtualModules.writeModule(entryPath, entrySource);

            new SingleEntryPlugin(compiler.context, entryPath, entryName).apply(
              childCompiler,
            );
          });

          childCompiler.hooks.make.tap(
            PLUGIN_ID,
            (childCompilation: webpack.compilation.Compilation) => {
              childCompilation.hooks.afterHash.tap(PLUGIN_ID, () => {
                childCompilation.hash = compilation.hash;
              });
            },
          );

          try {
            let childCompilation: webpack.compilation.Compilation = await new Promise(
              (resolve, reject) => {
                // @ts-ignore
                childCompiler.runAsChild(
                  (
                    err: Error,
                    _entries: webpack.Entry,
                    childCompilation: webpack.compilation.Compilation,
                  ) => {
                    if (err) {
                      reject(err);
                    } else if (childCompilation.errors.length > 0) {
                      reject(childCompilation.errors);
                    } else {
                      resolve(childCompilation);
                    }
                  },
                );
              },
            );

            // Replace the parent compilation's assets with those of the child
            // compilation.
            compilation.hooks.afterOptimizeAssets.tap(PLUGIN_ID, () => {
              compilation.assets = childCompilation.assets;

              compilation.namedChunkGroups = childCompilation.namedChunkGroups;

              const childChunkFileMap = childCompilation.chunks.reduce(
                (chunkMap, chunk) => {
                  chunkMap[chunk.name] = chunk.files;
                  return chunkMap;
                },
                {},
              );

              compilation.chunks.forEach((chunk) => {
                const childChunkFiles = childChunkFileMap[chunk.name];

                if (childChunkFiles) {
                  chunk.files = childChunkFiles;
                }
              });
            });
          } catch (e) {
            throw e;
          }
        },
      );
    });

    compiler.options.module = compiler.options.module || { rules: [] };
    compiler.options.module.rules.push({
      loader: require.resolve('./store-loader'),
      options: {
        cwd: this.cwd,
        flag: this.flag,
        store,
      },
    });
  }
}

interface ModuleMap {
  [entryName: string]: string[];
}

function getModuleMapFromChunks(
  chunks: webpack.compilation.Chunk[],
  entryNames: string[],
  store: Store,
): ModuleMap {
  return Object.fromEntries(
    chunks
      .filter((chunk) => entryNames.includes(chunk.name))
      .map((chunk) => {
        let flaggedDependencies = chunk
          .getModules()
          .map((mod) =>
            Array.from<string>(mod.buildInfo?.fileDependencies || []),
          )
          .flat()
          .filter((dependency) => store.data.has(dependency));

        return [chunk.name, flaggedDependencies];
      }),
  );
}
