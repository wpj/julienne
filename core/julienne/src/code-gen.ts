/**
 * Generates a module that uses `runtime` to client-side render `template`. A
 * virtual entrypoint is created for each template when bundling a or running
 * the dev server for a site.
 *
 * See the `Runtime` type in core/runtime/src/index.ts for more information on
 * runtimes.
 */
export function clientEntryPointTemplate(options: {
  dev: boolean;
  hydrate: boolean;
  runtime: string;
  template: string;
}): string {
  let dev = JSON.stringify(options.dev);
  let hydrate = JSON.stringify(options.hydrate);
  let runtime = JSON.stringify(options.runtime);
  let template = JSON.stringify(options.template);
  return `
import template from ${template};
import runtime from ${runtime};

runtime({ dev: ${dev}, hydrate: ${hydrate}, template });
`;
}

/**
 * Generates a barrel module for the given map of export names and module paths.
 */
export function moduleMapTemplate(
  entryMap: { [exportName: string]: string },
  writeExports: boolean,
): string {
  return Object.entries(entryMap)
    .map((pair) => {
      let identifier = pair[0];
      let modulePath = JSON.stringify(pair[1]);
      return writeExports
        ? `export { default as ${identifier} } from ${modulePath};`
        : `import ${identifier} from ${modulePath}`;
    })
    .join('\n');
}
