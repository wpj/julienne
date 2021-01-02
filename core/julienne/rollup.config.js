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

export default {
  input: 'src/index.ts',
  external,
  output: [
    { file: pkg.module, format: 'es' },
    { file: pkg.main, format: 'cjs' },
  ],
  plugins: [
    resolve({ extensions }),
    commonjs(),
    babel({ extensions, babelHelpers: 'bundled' }),
    json(),
  ],
};
