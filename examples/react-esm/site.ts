import { Site } from '@julienne/react';
import { Store } from 'julienne';
import sade from 'sade';

let templates = {
  main: './src/templates/main.tsx',
} as const;

type Templates = typeof templates;

function createOnLookup(store: Store<Templates>) {
  return function onLookup(path: string) {
    switch (path) {
      case '/': {
        store.createPage('/', async () => {
          return {
            template: 'main',
            props: {},
          };
        });

        break;
      }
    }
  };
}

let prog = sade('julienne-site');

prog.command('build').action(async () => {
  let site = new Site({ templates });

  let store = new Store();

  let onLookup = createOnLookup(store);

  let paths = ['/'];
  await Promise.all(paths.map(onLookup));

  await site.build({ store });
});

prog.command('dev').action(async () => {
  let site = new Site({ templates });

  let store = new Store();

  let onLookup = createOnLookup(store);

  let port = 3000;
  await site.dev({ onLookup, port, store });

  console.log(`Started on http://localhost:${port}`);
});

prog.parse(process.argv);
