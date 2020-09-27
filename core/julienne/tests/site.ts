import { Readable } from 'stream';
import { StreamResource, GeneratedResource } from '../src/resource';
import { GetResource } from '../src/types';
import { Site } from '../src/site';

describe('Site', () => {
  describe('createPage', () => {
    test('adds a page to the site', async () => {
      let site = new Site({
        templates: { main: './fake.js' },
        renderToString: () => 'html',
        runtime: '@julienne/react-runtime',
      });

      let getPage = () => {
        return {
          template: 'main',
          props: { name: 'world' },
        } as const;
      };

      site.createPage('/a', getPage);

      let cachedGetPage = site.pages.get('/a') as () =>
        | unknown
        | Promise<unknown>;

      expect(await cachedGetPage()).toEqual(getPage());
    });
  });

  describe('createResource', () => {
    test('adds resources to the site', async () => {
      let site = new Site({
        templates: { main: './fake.js' },
        renderToString: () => 'html',
        runtime: '@julienne/react-runtime',
      });

      let getGeneratedStringResource = () => {
        return JSON.stringify({ hello: 'world' });
      };

      site.createResource('/generated-string.json', getGeneratedStringResource);

      let buffer = Buffer.from(JSON.stringify({ hello: 'universe' }));
      let getGeneratedBufferResource = () => buffer;

      site.createResource('/generated-buffer.json', getGeneratedBufferResource);

      let stream = Readable.from('Hello, world');
      let getStreamResource = () => stream;

      site.createResource('/stream.txt', getStreamResource);

      let generatedStringResource = (await (site.resources.get(
        '/generated-string.json',
      ) as GetResource)()) as GeneratedResource;

      let generatedBufferResource = (await (site.resources.get(
        '/generated-buffer.json',
      ) as GetResource)()) as GeneratedResource;

      let streamResource = (await (site.resources.get(
        '/stream.txt',
      ) as GetResource)()) as StreamResource;

      expect(generatedStringResource.type).toBe('generated');
      expect(generatedStringResource.data).toBe(getGeneratedStringResource());

      expect(generatedBufferResource.type).toBe('generated');
      expect(generatedBufferResource.data).toBe(buffer);

      expect(streamResource.type).toBe('stream');
      expect(streamResource.data).toBe(stream);
    });
  });

  describe('copyResource', () => {
    test('adds copied resources to the site', () => {
      let site = new Site({
        templates: { main: './fake.js' },
        renderToString: () => 'html',
        runtime: '@julienne/react-runtime',
      });

      site.copyResource('/fake.txt', './fake.txt');

      expect((site.resources.get('/fake.txt') as GetResource)()).toEqual({
        type: 'file',
        from: './fake.txt',
      });
    });
  });
});
