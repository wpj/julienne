import { render, createWebpackConfig } from '@julienne/svelte';
import { Props, Site } from 'julienne';
import sade from 'sade';

import { createJsonSlug } from './src/helpers';

async function createSite({ dev }: { dev: boolean }) {
  let templates = {
    alt: require.resolve('./src/templates/alt.svelte'),
    main: require.resolve('./src/templates/main.svelte'),
  };

  // It's necessary to set cwd here so that template and runtimeModule paths are
  // resolved relative to this file rather than the root of the example
  // directory.
  let site = new Site({
    render,
    runtime: require.resolve('./src/runtime.ts'),
    templates,
    webpackConfig: createWebpackConfig({ dev }),
  });

  function createPageAndPageJson(
    slug: string,
    { template, props }: { template: keyof typeof templates; props: Props },
  ) {
    site.createPage(slug, () => ({ template, props }));
    site.createResource(createJsonSlug(slug), () =>
      JSON.stringify({ template, props }),
    );
  }

  createPageAndPageJson('/', { template: 'main', props: { name: 'Main' } });

  createPageAndPageJson('/alt', { template: 'alt', props: { name: 'Alt' } });

  return site;
}

let prog = sade('julienne-site');

prog.command('build').action(async () => {
  let site = await createSite({ dev: false });
  await site.build();
});

prog.command('dev').action(async () => {
  let site = await createSite({ dev: true });
  site.dev();
});

prog.parse(process.argv);
