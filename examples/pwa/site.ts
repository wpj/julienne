import { render, createWebpackConfig } from '@julienne/svelte';
import { Props, Site } from 'julienne';
import sade from 'sade';
import { generateSW, ManifestTransform } from 'workbox-build';

import { createJsonSlug } from './src/helpers';

/*
 * Remove all HTML file entries except for the shell. There may be a way to do
 * this purely with globs, but I can't figure it out.
 */
const removeNonShellHtml: ManifestTransform = async (manifestEntries) => {
  let manifest = manifestEntries.filter((manifestEntry) => {
    let isHtml = manifestEntry.url.endsWith('.html');
    if (isHtml) {
      return manifestEntry.url === '__shell.html';
    } else {
      return true;
    }
  });

  return { manifest, warnings: [] };
};

async function createSite({ dev }: { dev: boolean }) {
  let templates = {
    alt: require.resolve('./src/templates/alt.svelte'),
    main: require.resolve('./src/templates/main.svelte'),
    shell: require.resolve('./src/templates/shell.svelte'),
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
    {
      template,
      props,
    }: { template: keyof Omit<typeof templates, 'shell'>; props: Props },
  ) {
    site.createPage(slug, () => ({ template, props }));
    site.createResource(createJsonSlug(slug), () =>
      JSON.stringify({ template, props }),
    );
  }

  createPageAndPageJson('/', { template: 'main', props: { name: 'Main' } });

  createPageAndPageJson('/alt', { template: 'alt', props: { name: 'Alt' } });

  site.createPage('/__shell.html', () => ({ template: 'shell', props: {} }));

  return site;
}

let prog = sade('julienne-site');

prog.command('build').action(async () => {
  let site = await createSite({ dev: false });
  await site.build();

  // workbox-build resolves paths against the current working directory.
  await generateSW({
    globDirectory: '__julienne__/public',
    globPatterns: ['**/*'],
    globIgnores: ['**/*.map', '**/!(__shell)/*.html'],
    manifestTransforms: [removeNonShellHtml],
    navigateFallback: '/__shell.html',
    swDest: '__julienne__/public/sw.js',
  });
});

prog.command('dev').action(async () => {
  let site = await createSite({ dev: true });
  site.dev();
});

prog.parse(process.argv);
