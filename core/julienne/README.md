# julienne

## Usage

```typescript
import { Site } from 'julienne';

let site = new Site({
  templates: {
    main: require.resolve('./path/to/template'),
  },
});

// Compile the site's assets
await site.compile();

// Build the site
await site.generate();

// Start a local development server
await site.dev();
```

## API

### Site(options)

Construct a Site instance.

#### options.cwd (optional)

Set the cwd when compiling and generating the site. It's only necessary to set
this when you're build script is not in the directory you're generating your
site from.

If no value is passed, `process.cwd()` is used by default.

#### options.output (optional)

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
.julienne
├── public
└── server
```

#### options.render

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

#### options.webpackConfig (optional)

Type: `{ client: webpack.Configuration, server: webpack.Configuration }`

Custom webpack configuration. julienne generates entries internally, so entries
should not be included in custom webpack configuration.

### createPage(path, getPage)

Example usage:

```typescript
site.createPage('/', () => ({
  template: 'main',
  props: {
    name: 'World',
  },
}));
```

#### path

Type: `string`

The path/URL to create the page at. This path should start with a forward slash.

#### getPage

Function that returns page configuration. This is where you specify what
template to use to generate the page and the props to pass to the template.
julienne will `await` values returned from `getPage`, so you can use
`async`/`await`.

Template configuration has the following type:

```typescript
{

  template: string;
  props: { [key: string]: unknown };
}
```

### createFile(path, getFile)

Example usage:

```typescript
site.createFile('/index.json', () => JSON.stringify({ key: 'value' }));
```

#### path

The path/URL to create the file at. This path should start with a forward slash.

#### getFile

Function that returns file data, which can be a string, a Buffer, or a stream.
julienne will `await` values returned from `getFile`, so you can use
`async`/`await`.

### copyFile(to, from)

Example usage:

```typescript
site.copyFile("/robots.txt", path.join(__dirname, "robots.txt"));`
```

#### to

Type: `string`

The path/URL to copy the file to. This path should start with a forward slash.

#### from

Type: `string`

The path of the file to copy.

### compile(options)

Example usage:

```typescript
let generator = await site.compile();
```

Compiles the sites assets and writes them to the output directory.

Returns a `Compilation` object, which can be used to inspect the result of a
compilation or write the compilation manifest to disk to enable cached
compilations.

##### options.fromCache (optional)

Path to read a cached compilation manifest from. If a cached compilation is
found, the compilation step will be skipped.

### generate()

Example usage:

```typescript
await generator.generate();
```

Write the site's pages and files to disk.

### dev(options)

Example usage:

```typescript
await site.dev();
```

Starts a server for local development. Returns a promise that resolves to an
object with a `close` method for stopping the server.

#### options.port

Type: `number`

The port to use to start the development server on; defaults to `3000`.

### Compilation

A compilation manifest returned by `Site.compile`.

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
