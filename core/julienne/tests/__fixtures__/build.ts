import { join as pathJoin } from 'path';
import { Build, ClientBuild, ServerBuild } from '../../src/build';

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

export function createTestBuild(): Build {
  let client = new ClientBuild({
    entryAssets: { main: clientAssets },
    base: defaultPublicPath,
  });

  let server = new ServerBuild({
    entryAssets: { main: [pathJoin(__dirname, 'main.js')] },
  });

  return new Build({ client, server });
}
