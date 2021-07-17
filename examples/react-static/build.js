// @ts-check
import { promises as fs } from 'fs';
import { build, createRenderer } from 'julienne';
import { join as joinPath } from 'path';
import { sharedOptions } from './config.js';

let cwd = process.cwd();

/**
 * @typedef {keyof typeof sharedOptions.templates} Template
 * @typedef {import('julienne').Props} Props
 * @typedef {{ template: Template, props: Props }} PageConfig
 * @typedef {Record<string, PageConfig>} Pages
 */

/**
 * @param {string} pagePath
 */
function normalizePagePath(pagePath) {
  if (pagePath.endsWith('.html')) {
    return pagePath;
  }

  return joinPath(pagePath, 'index.html');
}

/** @type Pages */
let pages = {
  '/': {
    template: 'main',
    props: {},
  },
};

async function main() {
  await build(sharedOptions);

  let renderer = await createRenderer(sharedOptions);

  for (let [path, { template, props }] of Object.entries(pages)) {
    let outputPath = joinPath(cwd, 'public', normalizePagePath(path));
    let rendered = await renderer.render(template, props);

    await fs.writeFile(outputPath, rendered, 'utf-8');
  }
}

main();
