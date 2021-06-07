import { Store } from 'julienne';
import { Site } from '@julienne/svelte';
import type { Props } from 'julienne';
import sade from 'sade';
import { createJsonSlug } from './src/helpers';

let runtime = './src/runtime.ts';

let templates = {
  alt: './src/templates/alt.svelte',
  main: './src/templates/main.svelte',
};

type Templates = typeof templates;

function getStore(): Store<Templates> {
  let store = new Store();

  function createPageAndPageJson(
    slug: string,
    { template, props }: { template: keyof typeof templates; props: Props },
  ) {
    store.createPage(slug, () => ({ template, props }));
    store.createFile(createJsonSlug(slug), () =>
      JSON.stringify({ template, props }),
    );
  }

  createPageAndPageJson('/', { template: 'main', props: { name: 'Main' } });

  createPageAndPageJson('/alt', { template: 'alt', props: { name: 'Alt' } });

  return store;
}

let prog = sade('julienne-site');

prog.command('build').action(async () => {
  let site = new Site({ runtime, templates });

  let store = getStore();

  await site.build({ store });
});

prog.command('dev').action(async () => {
  let site = new Site({
    runtime,
    templates,
  });

  let store = getStore();

  let port = 3000;
  await site.dev({ port, store });
  console.log(`Started on http://localhost:${port}`);
});

prog.parse(process.argv);
