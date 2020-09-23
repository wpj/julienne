import { join as pathJoin } from 'path';

import { render, createWebpackConfig } from '@julienne/react';
import { Site } from 'julienne';
import sade from 'sade';

async function createSite({ dev }) {
  let site = new Site({
    render,
    runtime: '@julienne/react-runtime',
    templates: {
      main: require.resolve('./src/templates/main.tsx'),
    },
    webpackConfig: createWebpackConfig({ dev }),
  });

  return site;
}

let prog = sade('julienne-site');

prog.command('build').action(async () => {
  let cachePath = pathJoin(process.cwd(), 'build.cache.json');

  let site = await createSite({ dev: false });

  let compilation = await site.compile({ fromCache: cachePath });
  await compilation.write(cachePath);

  await site.generate();
});

prog.command('dev').action(async () => {
  let site = await createSite({ dev: true });
  site.dev();
});

prog.parse(process.argv);
