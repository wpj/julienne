import { join as pathJoin } from 'path';
import { Readable } from 'stream';
import { SiteGenerator } from '../src/generator';
import type { RenderToString as RenderToStringType } from '../src/render';
import type { Output } from '../src/types';
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

type RenderToStringFunc = RenderToStringType<
  (props: { [key: string]: unknown }) => string
>;

let defaultOutput: Output = {
  client: pathJoin(__dirname, '.julienne/public'),
  server: pathJoin(__dirname, '__fixtures__'),
  publicPath: '/',
};

function getPublicPath(path: string) {
  return pathJoin(defaultOutput.client, path);
}

describe('Generator', () => {
  test('throws an error when created without a server compilation', () => {
    let compilation = createTestCompilation({
      includeServerCompilation: false,
    });

    expect(() => {
      new SiteGenerator({
        compilation,
        output: defaultOutput,
        pages: new Map(),
        resources: new Map(),
        renderToString: () => 'html',
        templates: {
          main: './src/main.js',
        },
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

      let generator = new SiteGenerator({
        compilation,
        output: defaultOutput,
        pages: new Map(),
        renderToString,
        resources: new Map(),
        templates,
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
      let pages = new Map();

      pages.set('/a', () => ({ template: 'main', props: { name: 'World' } }));
      pages.set('/b.html', () => ({
        template: 'main',
        props: { name: 'Universe' },
      }));

      let generator = new SiteGenerator({
        compilation,
        output: defaultOutput,
        pages,
        renderToString,
        resources: new Map(),
        templates,
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

    test('writes resources to the filesystem', async () => {
      let resources = new Map();

      resources.set('/a.json', () => ({
        type: 'generated',
        data: JSON.stringify({ hello: 'world' }),
      }));

      resources.set('/b.txt', () => ({
        type: 'generated',
        data: 'Hello, world',
      }));

      let stream = Readable.from('Hello, universe');
      resources.set('/c.txt', () => ({
        type: 'stream',
        data: stream,
      }));

      resources.set('/text/mock.txt', () => ({
        type: 'file',
        from: pathJoin(__dirname, 'mock.txt'),
      }));

      let generator = new SiteGenerator({
        compilation,
        output: defaultOutput,
        pages: new Map(),
        renderToString,
        resources,
        templates,
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
        type: 'file',
        from: pathJoin(__dirname, 'mock.txt'),
      });

      expect(writeFile).toHaveBeenCalledTimes(4);
    });
  });
});
