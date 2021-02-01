import { join as pathJoin } from 'path';
import { Renderer } from '../src/renderer';
import type { Props, RenderToString as RenderToStringType } from '../src/types';
import {
  clientScripts,
  clientStylesheets,
  createTestCompilation,
  templates,
} from './__fixtures__/compilation';

type Templates = typeof templates;

type RenderToStringFunc = RenderToStringType<
  (props: { [key: string]: unknown }) => string
>;

type Component = (props: Props) => string;

describe('Renderer', () => {
  describe('renderToString', () => {
    test('calls the configured render function with the correct data and returns its output', async () => {
      let props = { name: 'World' };

      let compilation = createTestCompilation();

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

      let generator = new Renderer<Component, Templates>({
        compilation,
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
          scripts: clientScripts.map((script) => ({
            src: pathJoin('/', script),
          })),
          stylesheets: clientStylesheets.map((stylesheet) =>
            pathJoin('/', stylesheet),
          ),
          templateName: 'main',
        }),
      );
    });
  });
});
