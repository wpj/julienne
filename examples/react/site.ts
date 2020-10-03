import { Site } from '@julienne/react';
import { Store } from 'julienne';
import sade from 'sade';

let templates = {
  main: require.resolve('./src/templates/main.tsx'),
} as const;

type Templates = typeof templates;

function getStore(): Store<Templates> {
  let store = new Store();

  store.createPage('/', async () => {
    return {
      template: 'main',
      props: {},
    };
  });

  return store;
}

let prog = sade('julienne-site');

prog.command('build').action(async () => {
  let site = new Site({ templates });

  let store = getStore();

  await site.build({ store });
});

prog.command('dev').action(async () => {
  let site = new Site({ dev: true, templates });

  let store = getStore();

  let port = 3000;
  await site.dev({ port, store });

  console.log(`Started on http://localhost:${port}`);
});

prog.parse(process.argv);
