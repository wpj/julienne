import kleur from 'kleur';
import MagicString from 'magic-string';
import type { Plugin as VitePlugin } from 'vite';
import type { HydratedModuleStore } from '../types';

const debugFlag = process.env.DEBUG ?? '';
const isDebug =
  debugFlag.includes('julienne:*') ||
  debugFlag.includes('julienne:module-rewrite');

function log(message: string) {
  console.log(
    kleur.dim(new Date().toLocaleString()) +
      kleur.bold().blue(' [julienne-module-rewrite] ') +
      message,
  );
}

export function moduleRewritePlugin(
  store: HydratedModuleStore,
  wrap: string,
): VitePlugin {
  return {
    name: 'julienne-module-rewrite',
    transform(code, id) {
      let moduleInfo = store.byId.get(id);
      if (!moduleInfo) {
        return;
      }

      if (isDebug) {
        log(`wrapping module ${moduleInfo.path}`);
      }

      let { id: moduleHash } = moduleInfo;

      let defaultExport = 'export default';
      if (!code.includes(defaultExport)) {
        throw new Error('Missing default export in hydrated module ${id}');
      }

      let source = new MagicString(code);

      let defaultExportLocation = code.indexOf(defaultExport);
      const start = defaultExportLocation;
      const end = defaultExportLocation + defaultExport.length;
      source.overwrite(start, end, 'const __default__export__ =');

      source.prepend(`import __wrap__ from "${wrap}";\n`);

      source.append(
        `export default __wrap__(__default__export__, ${JSON.stringify(
          moduleHash,
        )});`,
      );

      return {
        code: source.toString(),
        map: source.generateMap(),
      };
    },
  };
}
