import { Readable } from 'stream';
import { Stream, Generated } from '../src/file';
import { Store } from '../src/store';

let getNull = () => null;

describe('Store', () => {
  describe('createPage', () => {
    test('throws error with invalid path', () => {
      let store = new Store();

      expect(() =>
        store.createPage('invalid', () => ({
          template: 'main',
          props: { name: 'world' },
        })),
      ).toThrow();
    });

    test('adds a page to the store', async () => {
      let store = new Store();

      let getPage = () => {
        return {
          template: 'main',
          props: { name: 'world' },
        } as const;
      };

      store.createPage('/a', getPage);

      let pageAction = store.pages.get('/a');
      let cachedGetPage =
        pageAction?.type === 'create' ? pageAction.getData : getNull;

      expect(await cachedGetPage()).toEqual(getPage());
    });
  });

  describe('createFile', () => {
    test('throws error with invalid path', () => {
      let store = new Store();

      expect(() => store.createFile('invalid', () => 'Test content')).toThrow();
    });

    test('adds files to the store', async () => {
      let store = new Store();

      let getGeneratedStringFile = () => {
        return JSON.stringify({ hello: 'world' });
      };

      store.createFile('/generated-string.json', getGeneratedStringFile);

      let buffer = Buffer.from(JSON.stringify({ hello: 'universe' }));
      let getGeneratedBufferFile = () => buffer;

      store.createFile('/generated-buffer.json', getGeneratedBufferFile);

      let stream = Readable.from('Hello, world');
      let getStreamFile = () => stream;

      store.createFile('/stream.txt', getStreamFile);

      let actions = {
        generatedString: store.files.get('/generated-string.json'),
        generatedBuffer: store.files.get('/generated-buffer.json'),
        stream: store.files.get('/stream.txt'),
      };

      let generatedStringFile = (await (actions.generatedString?.type ===
        'create'
        ? actions.generatedString.getData
        : getNull)()) as Generated;

      let generatedBufferFile = (await (actions.generatedBuffer?.type ===
        'create'
        ? actions.generatedBuffer.getData
        : getNull)()) as Generated;

      let streamFile = (await (actions.stream?.type === 'create'
        ? actions.stream.getData
        : getNull)()) as Stream;

      expect(generatedStringFile.type).toBe('generated');
      expect(generatedStringFile.data).toBe(getGeneratedStringFile());

      expect(generatedBufferFile.type).toBe('generated');
      expect(generatedBufferFile.data).toBe(buffer);

      expect(streamFile.type).toBe('stream');
      expect(streamFile.data).toBe(stream);
    });
  });

  describe('copyFile', () => {
    test('throws error with invalid path', () => {
      let store = new Store();

      expect(() => store.copyFile('invalid', './path/to/file')).toThrow();
    });

    test('adds copied files to the store', () => {
      let store = new Store();

      store.copyFile('/fake.txt', './fake.txt');

      let fileAction = store.files.get('/fake.txt');

      let getFile =
        fileAction?.type === 'create' ? fileAction.getData : getNull;

      expect(getFile()).toEqual({
        type: 'copy',
        from: './fake.txt',
      });
    });
  });
});
