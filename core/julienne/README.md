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
await site.dev();
```

## API

### Site(options)

Construct a Site instance.

#### options.cwd (optional)

Set the cwd when compiling and generating the site. It's only necessary to set
this when your build script is not in the directory you're generating your site
from.

If no value is passed, `process.cwd()` is used by default.

#### options.output (optional)

Type:

```typescript
{
  base: string;
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

`public` is the directory that the site's bundled application bundle, static
pages, and files will be written to. `internal` contains files internal to
julienne used during rendering.

#### options.renderToString

Function to use when rendering components on the server. The function must
implement the following signature:

```typescript
export type RenderToString<Component> = (options: {
  dev: boolean;
  links: Record<string, string | undefined | null>[];
  props: Props;
  scripts: Record<string, string | undefined | null>[];
  template: {
    name: string;
    component: Component | null;
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

#### options.viteConfig (optional)

Type: `vite.UserConfig`

Custom vite configuration.

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

The path/URL to create the page at. This path must start with a forward slash.

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

The path/URL to create the file at. This path must start with a forward slash.

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

The path/URL to copy the file to. This path must start with a forward slash.

#### from

Type: `string`

The path of the file to copy.

### compile()

Example usage:

```typescript
let builder = await site.compile();
```

Builds the site's application bundle and returns a `Builder` object, which can
be used to inspect the result of the build and write the pages, files, and
client application bundle to the public output directory.

### build()

Example usage:

```typescript
await builder.build();
```

Compiles and writes the site's application bundle, pages, and files to the
public output directory.

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

### Builder

#### build

The site's build manifest.

#### write()

Writes the site's pages, files, and application bundle to the public output
directory.

### Build

A build manifest returned by `Site.compile`.

## License

MIT
