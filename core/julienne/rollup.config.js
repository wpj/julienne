import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import svelte from 'rollup-plugin-svelte';
import svelteAutoPreprocess from 'svelte-preprocess';

import pkg from './package.json';

let extensions = ['.js', '.ts', '.svelte', '.mjs'];

function createPlugins() {
  return [
    resolve({ extensions }),
    commonjs(),
    svelte({
      generate: 'ssr',
      preprocess: svelteAutoPreprocess(),
    }),
    babel({ extensions, babelHelpers: 'bundled' }),
    json(),
  ];
}

let external = [
  'path',
  'fs',
  'stream',
  'svelte',
  ...Object.keys(pkg.dependencies || []),
  ...Object.keys(pkg.peerDependencies || []),
].map((pkgName) => new RegExp(`^${pkgName}`));

export default [
  {
    input: 'src/index.ts',
    external,
    output: [
      { file: pkg.module, format: 'es' },
      { file: pkg.main, format: 'cjs' },
    ],
    plugins: createPlugins(),
  },
  {
    input: 'src/store-loader.ts',
    external,
    output: [
      { file: 'dist/store-loader.mjs', format: 'es' },
      { file: 'dist/store-loader.js', format: 'cjs', exports: 'default' },
    ],
    plugins: createPlugins(),
  },
  {
    input: 'src/replace-loader.ts',
    external,
    output: [
      { file: 'dist/replace-loader.mjs', format: 'es' },
      { file: 'dist/replace-loader.js', format: 'cjs', exports: 'default' },
    ],
    plugins: createPlugins(),
  },
  {
    input: 'src/wrapper.svelte',
    external,
    output: [
      { file: 'dist/wrapper.mjs', format: 'es' },
      { file: 'dist/wrapper.js', format: 'cjs', exports: 'default' },
    ],
    plugins: createPlugins(),
  },
];
