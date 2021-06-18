import esbuild from 'esbuild';
import { join as pathJoin } from 'node:path';
import { readFile } from 'node:fs/promises';
import { builtinModules } from 'node:module';

export async function build(getConfig = (c) => c) {
  const pkg = JSON.parse(
    await readFile(pathJoin(process.cwd(), 'package.json')),
  );

  let external = [
    ...builtinModules,
    ...Object.keys(pkg.dependencies || []),
    ...Object.keys(pkg.peerDependencies || []),
  ].flatMap((pkgName) => [pkgName, `${pkgName}`]);

  let builds = [];

  if (pkg.exports) {
    if (pkg.exports.require) {
      builds.push({
        format: 'cjs',
        outfile: pkg.exports.require,
        // Targetting node12 (or 13) is required so that esbuild transpiles
        // dynamic imports to requires.
        target: 'node12',
      });
    }

    if (pkg.exports.import) {
      builds.push({
        format: 'esm',
        outfile: pkg.exports.import,
        target: 'node14',
      });
    }
  }

  await Promise.all(
    builds.map(({ define, format, outfile, target }) => {
      let config = getConfig({
        bundle: true,
        entryPoints: [pkg.source],
        define,
        external,
        format,
        outfile,
        platform: 'node',
        sourcemap: true,
        target,
      });

      return esbuild.build(config);
    }),
  );
}
