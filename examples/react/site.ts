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

  site.createPage('/', async () => {
    return {
      template: 'main',
      props: {},
    };
  });

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
