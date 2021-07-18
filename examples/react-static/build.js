// @ts-check
import { Site, write } from '@julienne/static';
import { build, createRenderer } from 'julienne';
import { sharedOptions } from './config.js';

async function main() {
  await build(sharedOptions);

  let renderer = await createRenderer(sharedOptions);
  let site = new Site();

  site.createPage('/', () => ({ template: 'main', props: {} }));

  write({ renderer, site });
}

main();
