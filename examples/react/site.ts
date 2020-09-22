import { render } from '@julienne/react-render';
import { Site } from 'julienne';
import sade from 'sade';

async function createSite() {
  let site = new Site({
    render,
    runtime: '@julienne/react-runtime',
    templates: {
      main: require.resolve('./src/templates/main.tsx'),
    },
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
  let site = await createSite();
  await site.build();
});

prog.command('dev').action(async () => {
  let site = await createSite();
  site.dev();
});

prog.parse(process.argv);
