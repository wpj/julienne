import { Site } from '@julienne/svelte';
import { Props, Store } from 'julienne';
import sade from 'sade';
import { generateSW, ManifestTransform } from 'workbox-build';
import { createJsonSlug } from './src/helpers';

let runtime = require.resolve('./src/runtime.ts');

let templates = {
  alt: require.resolve('./src/templates/alt.svelte'),
  main: require.resolve('./src/templates/main.svelte'),
  shell: require.resolve('./src/templates/shell.svelte'),
};

type Templates = typeof templates;

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

function getStore(): Store<Templates> {
  let store = new Store();
  function createPageAndPageJson(
    slug: string,
    {
      template,
      props,
    }: { template: keyof Omit<typeof templates, 'shell'>; props: Props },
  ) {
    store.createPage(slug, () => ({ template, props }));
    store.createFile(createJsonSlug(slug), () =>
      JSON.stringify({ template, props }),
    );
  }

  createPageAndPageJson('/', { template: 'main', props: { name: 'Main' } });

  createPageAndPageJson('/alt', { template: 'alt', props: { name: 'Alt' } });

  store.createPage('/__shell.html', () => ({ template: 'shell', props: {} }));

  return store;
}

let prog = sade('julienne-site');

prog.command('build').action(async () => {
  let site = new Site({ runtime, templates });

  let store = getStore();

  await site.build({ store });

  // workbox-build resolves paths against the current working directory.
  await generateSW({
    globDirectory: 'public',
    globPatterns: ['**/*'],
    globIgnores: ['**/*.map', '**/!(__shell)/*.html'],
    manifestTransforms: [removeNonShellHtml],
    navigateFallback: '/__shell.html',
    swDest: 'public/sw.js',
  });
});

prog.command('dev').action(async () => {
  let site = new Site({
    dev: true,
    runtime,
    templates,
  });

  let store = getStore();

  let port = 3000;
  await site.dev({ port, store });
  console.log(`Started on http://localhost:${port}`);
});

prog.parse(process.argv);
