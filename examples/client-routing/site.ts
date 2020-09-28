import { Site } from '@julienne/svelte';
import type { Props } from 'julienne';
import sade from 'sade';
import { createJsonSlug } from './src/helpers';

let runtime = require.resolve('./src/runtime.ts');

let templates = {
  alt: require.resolve('./src/templates/alt.svelte'),
  main: require.resolve('./src/templates/main.svelte'),
};

type Templates = typeof templates;

function addPagesAndFiles(site: Site<Templates>) {
  function createPageAndPageJson(
    slug: string,
    { template, props }: { template: keyof typeof templates; props: Props },
  ) {
    site.createPage(slug, () => ({ template, props }));
    site.createFile(createJsonSlug(slug), () =>
      JSON.stringify({ template, props }),
    );
  }

  createPageAndPageJson('/', { template: 'main', props: { name: 'Main' } });

  createPageAndPageJson('/alt', { template: 'alt', props: { name: 'Alt' } });
}

let prog = sade('julienne-site');

prog.command('build').action(async () => {
  let site = new Site({ runtime, templates });

  addPagesAndFiles(site);

  await site.build();
});

prog.command('dev').action(async () => {
  let site = new Site({
    dev: true,
    runtime,
    templates,
  });

  addPagesAndFiles(site);

  let port = 3000;
  await site.dev({ port });
  console.log(`Started on http://localhost:${port}`);
});

prog.parse(process.argv);
