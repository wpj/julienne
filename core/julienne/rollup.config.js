import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';

import { builtinModules } from 'module';

import pkg from './package.json';

let extensions = ['.js', '.ts', '.mjs'];

let external = [
  ...builtinModules,
  ...Object.keys(pkg.dependencies || []),
  ...Object.keys(pkg.peerDependencies || []),
].map((pkgName) => new RegExp(`^${pkgName}`));

/**
 * @type {import('rollup').RollupOptions}
 */
const config = {
  input: 'src/index.ts',
  external,
  output: [
    { file: pkg.module, format: 'es', sourcemap: true },
    { file: pkg.main, format: 'cjs', sourcemap: true },
  ],
  plugins: [
    resolve({ extensions }),
    commonjs(),
    babel({ extensions, babelHelpers: 'bundled' }),
    json(),
  ],
};

export default config;
