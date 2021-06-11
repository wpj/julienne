import sade from 'sade';

import { build } from './build.mjs';

const define = {
  esm: {
    'import.meta.env.IS_ESM': JSON.stringify(true),
  },
  cjs: {
    'import.meta.env.IS_ESM': JSON.stringify(false),
  },
};

let prog = sade('julienne-build');

prog.command('build').action(async () => {
  await build((config) => {
    return {
      ...config,
      define: {
        ...config.define,
        ...define[config.format],
      },
    };
  });
});

prog.command('watch').action(async () => {
  await build((config) => {
    return {
      ...config,
      watch: true,
      define: {
        ...config.define,
        ...define[config.format],
      },
    };
  });
});

prog.parse(process.argv);
