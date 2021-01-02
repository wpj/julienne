<script lang="ts">
  // Svelte will render this as a normal script element if it's imported as
  // `Script`.
  import Skript from './script.svelte';

  export let body: string | undefined;
  export let head: string | undefined;
  export let pageData: any;
  // TODO: Fix this type.
  export let scripts: { [key: string]: string | number | boolean }[] = [];
  export let stylesheets: string[];
</script>

<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    {#if head}
      {@html head}
    {/if}

    {#each stylesheets as href}
      <link rel="stylesheet" {href} type="text/css" />
    {/each}
  </head>
  <body>
    <div id="julienne-root">
      {#if body}
        {@html body}
      {/if}
    </div>

    <Skript
      type="application/json"
      id="julienne-data"
      content={JSON.stringify(pageData)} />

    {#each scripts as s}
      <Skript {...s} />
    {/each}
  </body>
</html>
