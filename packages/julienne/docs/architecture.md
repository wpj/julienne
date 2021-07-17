# Architecture

## On-demand loading/hot reloading

When running julienne in dev mode, rendering should be performed as a result of
a pull (a request for a certain page), rather than a push (creating a page with
the `createPage` API).

To facilitate that, `createPage` will be altered to support callers providing an
updater function. The role of the updater is to create a stateful mechanism for
checking for content updates, and if one is found, signaling that an update has
occurred. Additionally, the updater must return a teardown function.

```typescript
async function main() {
  let site = new Site({
    templates: {
      main: 'foo.ts',
    },
  });

  site.createPage('/', async () => {
    let template = 'main';
    let props = await getProps();
    return {
      props,
      template,
      update: (setPage) => {
        let interval = setInterval(() => {
          // call some function for updating props if they've been updated.
          let nextProps = await getProps();

          // perform some check to see if the content has been updated;
          if (contentUpdated) {
            setPage({ template, props });
          }
        }, 5000);

        return () => {
          clearInterval(interval);
        };
      },
    };
  });

  site.createPage('/', async () => {
    let props = await getProps();
    return {
      props,
      template: 'main',
    };
  });
}

main();
```

When a page supplies an updater, several things should happen in dev mode:

1. When a page is requested in dev mode, we should render the page and open a
   connection for receiving server sent events. When the updater triggers an
   update, we should send a server sent event to the client.
2. When the server sent event connection closes, we should clean up the updater.

## File creation

Since file creation is also lazy like page creation, this enables us to skip
writing them to disk in dev mode. Instead, when a request is received, we check
to see if it's in the files map. If it is, we invoke the file getter and respond
with the appropriate result.

## Strongly typed template props

Currently, props are of type any, but is there a way to limit the type of props
to the input of each template?

## Incremental builds in a git-based markdown site

At the end of each succesful build, the SHA of HEAD should be written to a file
that is cached between builds.

### Finding changed content files

To find paths of content files that have changed since the last build:

```sh
git diff --name-only $LAST_BUILD_COMMIT..HEAD path/to/content
```

### Handling deleted content

Because the incremental build model outlined in this document relies on caching
build artifacts across builds, deleting pages and files is not handled.

Should methods for removing pages and files be added to handle this situation?
(`removePage` and `removeFile`).

When the generator encounters the output of these methods, it should delete the
files specified. For example

```typescript
generator.removePage('/');
generator.removeFile('/index.json');
```

This instructs the generator to remove `/index.html` and `/index.json` during
the generation phase.

### Caching compilations

A simple way to key the build cache would be to use the SHA of the last commit
that modified the source files:

```sh
git log -n 1 --format=format:%H path/to/src
```

### Removing artifacts from previous builds

When performing a full rebuild, it would be good practice to remove artifacts
from the previous build (ideally by completely removing the output directory
before recreating it) so that the set of files in the build directory doesn't
grow indefinitely.

There is a mechanism for removing pages and resources, but no good way to remove
assets generated by webpack, especially if you rely on the webpack hash when
determining whether or not to remove prior build artifacts, since that
information is only available after the webpack assets have been compiled and
written to the output directory.

One way to handle this could be to write the webpack compilation to an
intermediate directory (i.e. `.julienne/client`) in the `compile` phase, and
then in the `generate` phase, copy the assets from `.julienne/client` to
`.julienne/public`. This would allow for removal of the entire
`.julienne/public` directory at any point before calling `generate`.

If a site is using mixed mode rendering, they would need to ensure that
`generate` is called before serving requests for content rendering on the fly
with `render`, since the assets pages returned by `render` would reference
assets that don't exist in the public directory yet.

### Service worker updates

In order to update a service worker, its contents _must_ be changed. This is why
workbox creates a revision ID based on the hash of the cached files contents for
each precached resource and includes that revision ID in the service worker
script.

There are three scenarios that can occur during an incremental build:

#### Content has changed

When an incremental build is triggered based on changes to content,
workbox-build will pick the changes up (along with the previously generated
pages), generate revisions, and precache them.

#### Application has changed

It is up to the individual developer to determine the correct trigger for
invalidating the build cache, but assuming that the build cache has been
invalidated and the app is compiled again, there are two approaches that can be
taken for handling content that has already been rendered:

1. Overwrite the previous compilation and pages by clearing the build directory
   prior to compilation and rebuilding all pages
2. Leave prior compilations and pages in place and render only newly created
   pages. This will result in inconsistencies between pages.

#### Application and content have changed

The considerations to make in this scenario match those for when only the
application has changed.

## Core Buiding blocks

### Store

Accumulator for pages and files.

### Compiler

Accepts entry and webpack information and produces a compilation.

### Generator

Accepts a compilation, files, and pages and writes files and pages to the
filesystem.

### DevServer

Accepts webpack config, files, and pages and serves skeleton development pages a
file requests.