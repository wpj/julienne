import { render } from '@julienne/svelte-render';
import { Site } from 'julienne';
import revHash from 'rev-hash';
import sade from 'sade';
import { generateSW } from 'workbox-build';

async function createSite() {
  let site = new Site({
    render,
    runtime: require.resolve('./src/runtime.ts'),
    templates: {
      alt: require.resolve('./src/templates/alt.svelte'),
      main: require.resolve('./src/templates/main.svelte'),
    },
  });

  let searchIndex = {
    pages: [
      {
        props: { name: 'Wyatt' },
      },
    ],
  };

  let searchIndexRevision = revHash(JSON.stringify(searchIndex));
  let searchIndexPath = `/search-index/${searchIndexRevision}.json`;

  site.createPage('/', async () => {
    return {
      template: 'main',
      props: {
        name: 'World',
        searchIndexPath,
      },
    };
  });

  site.createPage('/alt', () => ({
    template: 'alt',
    props: {
      name: 'Alt',
    },
  }));

  site.createResource(searchIndexPath, () => JSON.stringify(searchIndex));

  return site;
}

let prog = sade('julienne-site');

prog.command('build').action(async () => {
  let site = await createSite();
  await site.build();

  // workbox-build resolves paths against the current working directory.
  await generateSW({
    globDirectory: '__julienne__/public',
    globPatterns: ['**/*'],
    globIgnores: ['**/*.map'],
    swDest: '__julienne__/public/sw.js',
  });
});

prog.command('dev').action(async () => {
  let site = await createSite();
  site.dev();
});

prog.parse(process.argv);
