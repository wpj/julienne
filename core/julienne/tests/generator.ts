import { join as pathJoin } from 'path';
import { Readable } from 'stream';
import { Generator } from '../src/generator';
import { Renderer } from '../src/renderer';
import { Store } from '../src/store';
import type { Props, RenderToString as RenderToStringType } from '../src/types';
import { writeFile } from '../src/utils/file';
import { createTestCompilation, templates } from './__fixtures__/compilation';

// This doesn't need to be declared prior to importing modules that depend on
// this mocked module because jest hoists all mock declarations to the top under
// the hood.
jest.mock('../src/utils/file');

type Templates = typeof templates;

type RenderToStringFunc = RenderToStringType<
  (props: { [key: string]: unknown }) => string
>;

let defaultOutput = pathJoin(__dirname, '.julienne/public');

function getPublicPath(path: string) {
  return pathJoin(defaultOutput, path);
}

type Component = (props: Props) => string;

describe('Generator', () => {
  describe('generate', () => {
    let renderToString: RenderToStringFunc = ({ props, template }) => {
      let component = template.component as (p: typeof props) => string;
      return component(props);
    };

    let compilation = createTestCompilation();

    test('renders and writes pages to the filesystem', async () => {
      let store = new Store<Templates>();

      store.createPage('/a', () => ({
        template: 'main',
        props: { name: 'World' },
      }));

      store.createPage('/b.html', () => ({
        template: 'main',
        props: { name: 'Universe' },
      }));

      let renderer = new Renderer({ compilation, renderToString });

      let generator = new Generator<Component, Templates>({
        output: defaultOutput,
        renderer,
      });

      await generator.generate({ store });

      expect(writeFile).toHaveBeenCalledWith(getPublicPath('a/index.html'), {
        type: 'page',
        data: 'Hello, World',
      });

      expect(writeFile).toHaveBeenCalledWith(getPublicPath('b.html'), {
        type: 'page',
        data: 'Hello, Universe',
      });
    });

    test('writes files to the filesystem', async () => {
      let store = new Store<Templates>();

      store.createFile('/a.json', () => JSON.stringify({ hello: 'world' }));

      store.createFile('/b.txt', () => 'Hello, world');

      let stream = Readable.from('Hello, universe');
      store.createFile('/c.txt', () => stream);

      store.copyFile('/text/mock.txt', pathJoin(__dirname, 'mock.txt'));

      let renderer = new Renderer({ compilation, renderToString });

      let generator = new Generator<Component, Templates>({
        output: defaultOutput,
        renderer,
      });

      await generator.generate({ store });

      expect(writeFile).toHaveBeenCalledWith(getPublicPath('a.json'), {
        type: 'generated',
        data: JSON.stringify({ hello: 'world' }),
      });

      expect(writeFile).toHaveBeenCalledWith(getPublicPath('b.txt'), {
        type: 'generated',
        data: 'Hello, world',
      });

      expect(writeFile).toHaveBeenCalledWith(getPublicPath('c.txt'), {
        type: 'stream',
        data: stream,
      });

      expect(writeFile).toHaveBeenCalledWith(getPublicPath('text/mock.txt'), {
        type: 'copy',
        from: pathJoin(__dirname, 'mock.txt'),
      });

      expect(writeFile).toHaveBeenCalledTimes(4);
    });
  });
});
