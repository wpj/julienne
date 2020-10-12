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

export let clientAssets = [...clientScripts, ...clientStylesheets];

export let defaultPublicPath = '/';

export function createTestCompilation({
  includeServerCompilation,
}: {
  includeServerCompilation: boolean;
}): Compilation {
  let client = new ClientCompilation({
    entryAssets: { main: clientAssets },
    hash: 'fake-hash',
    publicPath: defaultPublicPath,
    warnings: null,
  });

  let server = includeServerCompilation
    ? new ServerCompilation({
        entryAssets: { server: ['server.js'] },
        hash: 'fake-hash',
        outputPath: pathJoin(__dirname),
        warnings: null,
      })
    : null;

  return new Compilation({ client, server });
}
