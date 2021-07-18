# @julienne/static

Static site renderer for julienne.

## Usage

```typescript
import { createRenderer, createDevRenderer } from 'julienne';
import { Site, write } from '@julienne/static';

let renderer = await createRenderer({
  /* ...myConfig */
});
let site = new Site();

site.createPage('/path/to/page', () => ({
  template: 'my-template',
  props: {
    /* ...myProps */
  },
}));

await write({ output: '/path/to/output', renderer, site });
```

## API

### Site

Create a new site instance.

Example usage:

```typescript
let site = new Site();
```

### Site.createPage(path, getPage)

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
  props: Record<string, unknown>;
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

### write(options)

Writes a site's rendered pages and files to the filesystem.

Example usage:

```typescript
await write({ renderer, site });
```

#### options.renderer

The Renderer instance to use for rendering templates.

#### options.site

The site instance to render pages and files from.

#### options.output (optional)

Path to a directory to write the generated files to.

## License

MIT
