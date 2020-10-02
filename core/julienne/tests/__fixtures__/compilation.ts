import { join as pathJoin } from 'path';
import {
  ClientCompilation,
  Compilation,
  ServerCompilation,
} from '../../src/compilation';

export let templates = {
  main: './this/does/not/exist.js',
};

export let clientScripts = [
  '_julienne/static/chunks/runtime.js',
  '_julienne/static/chunks/vendor.js',
  '_julienne/static/chunks/main.js',
];

export let clientStylesheets = ['static/css/main.css'];

export let defaultPublicPath = '/';

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
    hash: 'fake-hash',
    publicPath: defaultPublicPath,
    templates,
    warnings: null,
  });

  let server = includeServerCompilation
    ? new ServerCompilation({
        chunkAssets: { server: ['server.js'] },
        hash: 'fake-hash',
        outputPath: pathJoin(__dirname),
        warnings: null,
      })
    : null;

  return new Compilation({ client, server });
}
