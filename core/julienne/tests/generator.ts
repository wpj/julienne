import { join as pathJoin } from 'path';
import { Readable } from 'stream';
import { Generator } from '../src/generator';
import { Store } from '../src/store';
import type { Props } from '../src/types';
import type { RenderToString as RenderToStringType } from '../src/render';
import { writeFile } from '../src/utils/file';
import {
  clientScripts,
  clientStylesheets,
  createTestCompilation,
  templates,
} from './__fixtures__/compilation';

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
  test('throws an error when created without a server compilation', () => {
    let compilation = createTestCompilation({
      includeServerCompilation: false,
    });

    expect(() => {
      new Generator<Component, Templates>({
        compilation,
        files: new Map(),
        output: defaultOutput,
        pages: new Map(),
        renderToString: () => 'html',
      });
    }).toThrow();
  });

  describe('renderToString', () => {
    test('calls the configured render function with the correct data and returns its output', async () => {
      let props = { name: 'World' };

      let compilation = createTestCompilation({
        includeServerCompilation: true,
      });

      let renderToString: RenderToStringFunc = ({
        props,
        scripts: clientScripts,
        stylesheets,
        template,
      }) => {
        let component = template.component as (p: typeof props) => string;

        return JSON.stringify({
          props,
          rendered: component(props),
          scripts: clientScripts,
          stylesheets,
          templateName: template.name,
        });
      };

      let generator = new Generator<Component, Templates>({
        compilation,
        files: new Map(),
        output: defaultOutput,
        pages: new Map(),
        renderToString,
      });

      let rendered = await generator.renderToString({
        props,
        template: 'main',
      });

      expect(rendered).toEqual(
        JSON.stringify({
          props,
          rendered: 'Hello, World',
          scripts: clientScripts.map((script) => pathJoin('/', script)),
          stylesheets: clientStylesheets.map((stylesheet) =>
            pathJoin('/', stylesheet),
          ),
          templateName: 'main',
        }),
      );
    });
  });

  describe('generate', () => {
    let renderToString: RenderToStringFunc = ({ props, template }) => {
      let component = template.component as (p: typeof props) => string;
      return component(props);
    };

    let compilation = createTestCompilation({
      includeServerCompilation: true,
    });

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

      let generator = new Generator<Component, Templates>({
        compilation,
        output: defaultOutput,
        renderToString,
        ...store,
      });

      await generator.generate();

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

      let generator = new Generator<Component, Templates>({
        compilation,
        output: defaultOutput,
        renderToString,
        ...store,
      });

      await generator.generate();

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
