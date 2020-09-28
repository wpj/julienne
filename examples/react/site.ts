import { Site } from '@julienne/react';
import type { Store } from 'julienne';
import sade from 'sade';

let templates = {
  main: require.resolve('./src/templates/main.tsx'),
} as const;

type Templates = typeof templates;

async function addPagesAndFiles(store: Store<Templates>) {
  store.createPage('/', async () => {
    return {
      template: 'main',
      props: {},
    };
  });
}

let prog = sade('julienne-site');

prog.command('build').action(async () => {
  let site = new Site({ templates });

  addPagesAndFiles(site);

  await site.build();
});

prog.command('dev').action(async () => {
  let site = new Site({ dev: true, templates });

  addPagesAndFiles(site);

  let port = 3000;
  await site.dev({ port });

  console.log(`Started on http://localhost:${port}`);
});

prog.parse(process.argv);
