import { promises as fs } from 'fs';
import { join as joinPath } from 'path';
import { compile } from 'svelte/compiler';

let input = joinPath(process.cwd(), 'src', 'wrapper.svelte');
let output = joinPath(process.cwd(), 'src', 'wrapper.js');

async function buildWrapper() {
  console.log('build wrapper');
  let source = await fs.readFile(input, 'utf-8');

  let { js } = compile(source, { generate: 'ssr' });

  await fs.writeFile(output, js.code, 'utf-8');
}

buildWrapper().catch((e) => {
  console.error(e);
  process.exit(1);
});
