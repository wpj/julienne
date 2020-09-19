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

## Resource creation

Since resource creation is also lazy like page creation, this enables us to skip
writing them to disk in dev mode. Instead, when a request is received, we check
to see if it's in the resources map. If it is, we invoke the resource getter and
respond with the appropriate result.

## Strongly typed template props

Currently, props are of type any, but is there a way to limit the type of props
to the input of each template?
