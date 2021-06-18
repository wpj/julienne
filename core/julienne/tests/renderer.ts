import { join as pathJoin } from 'path';
import { Renderer } from '../src/renderer';
import type { Props, RenderToString as RenderToStringType } from '../src/types';
import {
  clientScripts,
  clientStylesheets,
  createTestBuild,
  templates,
} from './__fixtures__/build';

type Templates = typeof templates;

type RenderToStringFunc = RenderToStringType<
  (props: { [key: string]: unknown }) => string
>;

type Component = (props: Props) => string;

describe('Renderer', () => {
  describe('renderToString', () => {
    test('calls the configured render function with the correct data and returns its output', async () => {
      let props = { name: 'World' };

      let build = createTestBuild();

      let renderToString: RenderToStringFunc = ({
        links,
        props,
        scripts: clientScripts,
        template,
      }) => {
        let component = template.component as (p: typeof props) => string;

        return JSON.stringify({
          props,
          rendered: component(props),
          scripts: clientScripts,
          links,
          templateName: template.name,
        });
      };

      let generator = new Renderer<Component, Templates>({
        build,
        renderToString,
      });

      let rendered = await generator.renderToString({
        props,
        template: 'main',
      });

      expect(JSON.parse(rendered)).toStrictEqual({
        props,
        rendered: 'Hello, World',
        links: clientStylesheets.map((stylesheet) => {
          return {
            href: pathJoin('/', stylesheet),
            rel: 'stylesheet',
            type: 'text/css',
          };
        }),
        scripts: clientScripts.map((script) => ({
          src: pathJoin('/', script),
          type: 'module',
        })),
        templateName: 'main',
      });
    });
  });
});
