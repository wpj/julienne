import * as path from 'path';

export const internalDirName = `${process.cwd()}/__build__`;

/**
 * Converts a file path to a name suitable as a webpack entry.
 */
export function pathToName({
  path: rawPath,
  cwd,
}: {
  path: string;
  cwd: string;
}): string {
  const parsed = path.parse(rawPath);

  return path
    .join(parsed.dir, parsed.name)
    .replace(cwd, '')
    .replace(new RegExp(path.sep, 'g'), '__')
    .replace(/-/g, '_');
}

export function moduleMapTemplate(
  entryMap: { [exportName: string]: string },
  writeExports: boolean,
): string {
  return Object.entries(entryMap)
    .map(([identifier, modulePath]) =>
      writeExports
        ? `export { default as ${identifier} } from "${modulePath}";`
        : `import ${identifier} from "${modulePath}"`,
    )
    .join('\n');
}

export function identity<T>(val: T): T {
  return val;
}
