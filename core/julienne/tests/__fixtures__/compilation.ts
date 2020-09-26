import { join as pathJoin } from 'path';
import {
  ClientCompilation,
  Compilation,
  ServerCompilation,
} from '../../src/compilation';
import type { Output } from '../../src/types';

export let templates = {
  main: './this/does/not/exist.js',
};

export let clientScripts = [
  'static/chunks/runtime.js',
  'static/chunks/vendor.js',
  'static/chunks/main.js',
];

export let clientStylesheets = ['static/css/main.css'];

export let defaultPublicPath = '/';

let defaultOutput: Output = {
  client: pathJoin(__dirname, '.julienne/public'),
  server: __dirname,
  publicPath: defaultPublicPath,
};

export function createTestCompilation({
  includeServerCompilation,
}: {
  includeServerCompilation: boolean;
}): Compilation {
  let client = new ClientCompilation({
    chunkAssets: {
      runtime: [clientScripts[0]],
      vendor: [clientScripts[1]],
      main: [clientScripts[2], clientStylesheets[0]],
    },
    publicPath: defaultPublicPath,
    templates,
    warnings: null,
  });

  let server = includeServerCompilation
    ? new ServerCompilation({
        chunkAssets: { server: ['server.js'] },
        outputPath: defaultOutput.server,
        warnings: null,
      })
    : null;

  return new Compilation({ client, server });
}
