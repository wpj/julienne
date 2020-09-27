import { join as pathJoin } from 'path';

import { Site } from '@julienne/react';
import sade from 'sade';

async function createSite({ dev }) {
  let site = new Site({
    dev,
    templates: {
      main: require.resolve('./src/templates/main.tsx'),
    },
  });

  return site;
}

let prog = sade('julienne-site');

prog.command('build').action(async () => {
  let cachePath = pathJoin(process.cwd(), 'build.cache.json');

  let site = await createSite({ dev: false });

  let generator = await site.compile({ fromCache: cachePath });
  await generator.compilation.write(cachePath);

  await generator.generate();
});

prog.command('dev').action(async () => {
  let site = await createSite({ dev: true });

  let port = 3000;
  await site.dev({ port });
  console.log(`Started on http://localhost:${port}`);
});

prog.parse(process.argv);
