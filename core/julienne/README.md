# julienne

## Usage

```typescript
import { createRenderer, createDevRenderer } from 'julienne';

function render(component, props, context) {
  // render component as a string;
  let renderedResult = '...';

  return renderedResult;
}

let renderer = await createRenderer({
  render,
  runtime: '/path/to/runtime.js',
  templates: {
    main: require.resolve('./path/to/component.js'),
  },
});

renderer.render('main', propsForMain, context);
```

## API

### createRenderer(options) / createDevRenderer(options)

Create a renderer instance.

#### options.base (optional)

The base public path to serve bundled assets from. See the Vite
[documentation](https://vitejs.dev/config/#base) for more information.

#### options.cwd (optional)

Set the cwd when compiling and generating the site. It's only necessary to set
this when your build script is not in the directory you're generating your site
from.

If no value is passed, `process.cwd()` is used by default.

#### options.output (optional)

Type:

```typescript
{
  internal: string;
  public: string;
}
```

Directories to write the output to. If no output is provided, the following
directory structure will be created:

```
.
├── .julienne
│   ├── client
│   └── server
└── public
```

`public` is the directory that the site's bundled application bundle and files
will be written to. `internal` contains files internal to julienne used during
rendering.

#### options.render

Function to use when rendering components on the server. The function must
implement the following signature:

```typescript
type Render<Component> = (
  component: Component,
  props: Record<string, unknown>,
  context?: ServerContext,
) => string | Promise<string>;
```

#### options.renderDocument (optional)

Function to use to render the document HTML. The function must implement the
following signature:

```typescript
type RenderDocument = (props: {
  body?: string;
  head?: string;
  links?: Attributes[];
  pageData?: unknown;
  scripts?: Attributes[];
}) => string;
```

#### options.runtime

Type: `string`

Path to a module to use as the runtime in the browser. The module must export a
function as the default export with the following signature:

```typescript
function({ dev, template }: { dev: boolean, template: typeof SvelteComponent }): void | Promise<void>;
```

The runtime function should handle mounting the `template` component to the
`#julienne-root` element.

If creating a custom runtime, see [@julienne/runtime](../runtime) documentation.

#### options.templates

Type: `{ [name: string]: string }`

An object that maps template names to file paths.

#### options.viteConfig (optional)

Type: `vite.UserConfig`

Custom vite configuration.

### build(options)

Compiles and writes the application's bundle, to the public output directory.

Example usage:

```typescript
import { build } from 'julienne';
await builder.build(options);
```

#### options.base (optional)

The base public path to serve bundled assets from. See the Vite
[documentation](https://vitejs.dev/config/#base) for more information.

#### options.cwd (optional)

Set the cwd when compiling and generating the site. It's only necessary to set
this when your build script is not in the directory you're generating your site
from.

If no value is passed, `process.cwd()` is used by default.

#### options.output (optional)

Type:

```typescript
{
  internal: string;
  public: string;
}
```

Directories to write the output to. If no output is provided, the following
directory structure will be created:

```
.
├── .julienne
│   ├── client
│   └── server
└── public
```

`public` is the directory that the site's bundled application bundle and files
will be written to. `internal` contains files internal to julienne used during
rendering.

#### options.runtime

Type: `string`

Path to a module to use as the runtime in the browser. The module must export a
function as the default export with the following signature:

```typescript
function({ dev, template }: { dev: boolean, template: typeof SvelteComponent }): void | Promise<void>;
```

The runtime function should handle mounting the `template` component to the
`#julienne-root` element.

If creating a custom runtime, see [@julienne/runtime](../runtime) documentation.

#### options.templates

Type: `{ [name: string]: string }`

An object that maps template names to file paths.

#### options.viteConfig (optional)

Type: `vite.UserConfig`

Custom vite configuration.

## License

MIT
