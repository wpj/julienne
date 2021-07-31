import kleur from 'kleur';
import type { Plugin as VitePlugin } from 'vite';
import { hash as createHash } from '../hash';
import type { HydratedModuleFlag, HydratedModuleStore } from '../types';

const debugFlag = process.env.DEBUG ?? '';
const isDebug =
  debugFlag.includes('julienne:*') ||
  debugFlag.includes('julienne:module-rewrite');

function log(message: string) {
  console.log(
    kleur.dim(new Date().toLocaleString()) +
      kleur.bold().blue(' [julienne-module-accumulator] ') +
      message,
  );
}

async function checkFlag(
  code: string,
  flag: HydratedModuleFlag,
): Promise<boolean> {
  if (typeof flag === 'string') {
    return code.includes(flag);
  } else if (flag instanceof RegExp) {
    return flag.test(code);
  } else {
    return await flag(code);
  }
}

async function checkFlags(code: string, flags: HydratedModuleFlag[]) {
  for (let flag of flags) {
    if (await checkFlag(code, flag)) {
      return true;
    }
  }

  return false;
}

export function moduleAccumulatorPlugin(
  store: HydratedModuleStore,
  flags: HydratedModuleFlag[],
): VitePlugin {
  let templates = Object.keys(store.byTemplate);

  return {
    name: 'julienne-module-accumulator',
    async transform(code, id) {
      let info = this.getModuleInfo(id);
      if (!info) {
        return;
      }

      let isFlagged = await checkFlags(code, flags);
      if (!isFlagged) {
        /**
         * In the generated entrypoint for each template, we need to do a bare
         * import of the template itself so that imports in its module graph
         * that have side-effects, like CSS or fonts, are processed by Vite.
         */
        // if (info.isEntry) {
        //   store.byTemplate[id].sideEffects.add(id);
        // }

        return;
      }

      let moduleIds = new Set(this.getModuleIds());

      for (let moduleId of moduleIds.values()) {
        if (store.byId.has(moduleId)) {
          if (isDebug) {
            log(
              `skipping ${id} since its ancestor, ${moduleId}, is already hydrated`,
            );
          }
          return;
        }
      }

      let hash = createHash(code);
      let moduleHash = `m${hash}`;
      const moduleInfo = { id: moduleHash, path: id };

      store.byId.set(id, moduleInfo);

      if (info.isEntry) {
        store.byTemplate[id].push(moduleInfo);
      } else {
        let dependentTemplates = templates.filter((template) =>
          moduleIds.has(template),
        );

        for (let template of dependentTemplates) {
          store.byTemplate[template].push(moduleInfo);
        }
      }

      return undefined;
    },
  };
}
