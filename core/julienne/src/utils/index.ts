import * as path from 'path';
import type * as webpack from 'webpack';
import type { EntryAssets } from '../types';

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

export function getAssets(
  templateAssets: string[],
): { scripts: string[]; stylesheets: string[] } {
  let scripts = templateAssets.filter((asset: string) => asset.endsWith('.js'));

  let stylesheets = templateAssets.filter((asset: string) =>
    asset.endsWith('.css'),
  );

  return { scripts, stylesheets };
}

// julienne generates its own entry, so we need to remove entries from the user
// configuration.
export function cleanWebpackConfig({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  entry: _throwawayEntry,
  ...config
}: webpack.Configuration): webpack.Configuration {
  return config;
}

/**
 * Converts named chunk groups to a simple map of chunk names to asset paths.
 */
export function getEntryAssets(
  namedChunkGroups: Record<string, webpack.Stats.ChunkGroup>,
): EntryAssets {
  return Object.fromEntries(
    Object.entries(namedChunkGroups).map(([name, chunkGroup]) => [
      name,
      chunkGroup.assets,
    ]),
  );
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
      assets.map((asset) => path.join(publicPath, asset)),
    ]),
  );
}
