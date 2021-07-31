type ClientEntryPointTemplateOptions =
  | {
      partialHydration: false;
      component: string;
      render: string;
    }
  | {
      partialHydration: true;
      components: { id: string; path: string }[];
      render: string;
      templatePath: string;
    };

/**
 * Generates a module that uses `render` to client-side render `component`.
 *
 * When `partialHydration` is enabled, generates a module that uses `render` to
 * client-side render `components` when provided. Additionally includes a bare
 * import of `templatePath` so that Vite processes the template's imports that
 * have side effects, like CSS and font imports.
 *
 * If `partialHydration` is enabled and no components are passed, the generated
 * module will only contain the template bare import.
 */
export function clientEntryPointTemplate(
  options: ClientEntryPointTemplateOptions,
): string {
  let render = JSON.stringify(options.render);

  if (options.partialHydration) {
    let templateImport = `import ${JSON.stringify(options.templatePath)}`;

    if (options.components.length === 0) {
      return templateImport;
    }

    let componentImports = options.components
      .map(({ id, path }) => {
        return `import ${id} from ${JSON.stringify(path)};`;
      })
      .join('\n');

    let componentIdentifiers = `{ ${options.components
      .map(({ id }) => id)
      .join(', ')} }`;

    return `
${templateImport}
import render from ${render};
${componentImports}

let components = ${componentIdentifiers};

let julienneComponents = window.julienneComponents || [];
let dataElements = document.querySelectorAll('script[data-julienne]');

julienneComponents.forEach(({ component: id, props }, index) => {
  let target = dataElements[index].nextElementSibling;

  render({
    component: components[id],
    props,
    target,
  });
});
`;
  }

  let component = JSON.stringify(options.component);
  return `
import component from ${component};
import render from ${render};

let root = document.querySelector('#julienne-root');
let page = window.__JULIENNE__.page;

render({ component, props: page.props, target: root });
`;
}
