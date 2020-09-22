# julienne

## Usage

```typescript
import { Site } from 'julienne';

let site = new Site({
  templates: {
    main: require.resolve('./path/to/template'),
  },
});

// Build the site
await site.build();

// Start a local development server
site.dev();
```

## API

### Site(options)

Construct a Site instance.

#### cwd (optional)

Set the cwd when compiling and building the site. It's only necessary to set
this when you're build script is not in the directory you're building your site
from.

If no value is passed, `process.cwd()` is used by default.

#### output (optional)

Type:

```typescript
{
  path: string;
  publicPath: string;
}
```

Directories to write the output to. If no output is provided, the following
directory structure will be created:

```
__julienne__
├── public
└── server
```

#### render

Function to use when rendering components on the server. The function must
conform to the following signature:

```typescript
type Render = (options: {
  props: { [key: string]: unknown };
  scripts: string[];
  stylesheets: string[];
  template: {
    name: string;
    component: null | unknown;
  };
}) => string | Promise<string>;
```

#### runtime

Type: `string`

Path to a module to use as the runtime in the browser. The module must export a
function as the default export with the following signature:

```typescript
function({ dev, template }: { dev: boolean, template: typeof SvelteComponent }): void | Promise<void>;
```

The runtime function should handle mounting the `template` component to the
`#julienne-root` element.

If creating a custom runtime, see [@julienne/runtime](../runtime) documentation.

#### templates

Type: `{ [name: string]: string }`

An object that maps template names to file paths.

## Polyfills

If you're targeting browsers that require polyfills of JavaScript features (i.e.
async function), you need to add `core-js` and `regenerator-runtime` as
dependencies, define a custom runtime, and import those modules in it.

As an example:

```typescript
import 'core-js';
import 'regenerator-runtime';

// Define custom runtime here.
```
