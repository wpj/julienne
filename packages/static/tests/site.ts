import { Readable } from 'stream';
import { suite } from 'uvu';
import * as assert from 'uvu/assert';
import { Stream, Generated } from '../src/types';
import { Site } from '../src/site';

let getNull = () => null;

let createPage = suite('createPage');

createPage('throws error with invalid path', () => {
  let site = new Site();

  assert.throws(() => {
    site.createPage('invalid', () => ({
      template: 'main',
      props: { name: 'world' },
    }));
  });
});

createPage('adds a page to the site', async () => {
  let site = new Site();

  let getPage = () => {
    return {
      template: 'main',
      props: { name: 'world' },
    } as const;
  };

  site.createPage('/a', getPage);

  let resource = site.get('/a');
  let cachedGetPage =
    resource?.type === 'page' && resource.action.type === 'create'
      ? resource.action.getData
      : getNull;

  assert.equal(await cachedGetPage(), getPage());
});

createPage.run();

let createFile = suite('createFile');

createFile('throws error with invalid path', () => {
  let site = new Site();

  assert.throws(() => site.createFile('invalid', () => 'Test content'));
});

createFile('adds files to the site', async () => {
  let site = new Site();

  let getGeneratedStringFile = () => {
    return JSON.stringify({ hello: 'world' });
  };

  site.createFile('/generated-string.json', getGeneratedStringFile);

  let buffer = Buffer.from(JSON.stringify({ hello: 'universe' }));
  let getGeneratedBufferFile = () => buffer;

  site.createFile('/generated-buffer.json', getGeneratedBufferFile);

  let stream = Readable.from('Hello, world');
  let getStreamFile = () => stream;

  site.createFile('/stream.txt', getStreamFile);

  let resources = {
    generatedString: site.get('/generated-string.json'),
    generatedBuffer: site.get('/generated-buffer.json'),
    stream: site.get('/stream.txt'),
  };

  let generatedStringFile = (await (resources.generatedString?.action.type ===
    'create'
    ? resources.generatedString.action.getData
    : getNull)()) as Generated;

  let generatedBufferFile = (await (resources.generatedBuffer?.action.type ===
    'create'
    ? resources.generatedBuffer.action.getData
    : getNull)()) as Generated;

  let streamFile = (await (resources.stream?.action.type === 'create'
    ? resources.stream.action.getData
    : getNull)()) as Stream;

  assert.is(generatedStringFile.type, 'generated');
  assert.is(generatedStringFile.data, getGeneratedStringFile());

  assert.is(generatedBufferFile.type, 'generated');
  assert.is(generatedBufferFile.data, buffer);

  assert.is(streamFile.type, 'stream');
  assert.is(streamFile.data, stream);
});

createFile.run();

let copyFile = suite('copyFile');

copyFile('throws error with invalid path', () => {
  let site = new Site();

  assert.throws(() => site.copyFile('invalid', './path/to/file'));
});

copyFile('adds copied files to the site', () => {
  let site = new Site();

  site.copyFile('/fake.txt', './fake.txt');

  let resource = site.get('/fake.txt');

  let getFile =
    resource?.action.type === 'create' ? resource.action.getData : getNull;

  assert.equal(getFile(), {
    type: 'copy',
    from: './fake.txt',
  });
});

copyFile.run();
