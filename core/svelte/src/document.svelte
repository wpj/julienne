<script lang="ts">
  // Svelte will render this as a normal script element if it's imported as
  // `Script`.
  import Skript from './script.svelte';

  type Attributes = Record<string, string | undefined | null>;

  export let body: string | undefined;
  export let head: string | undefined;
  export let links: Attributes[] = [];
  export let pageData: any;
  export let scripts: Attributes[] = [];
</script>

<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    {#if head}
      {@html head}
    {/if}

    {#each links as link}
      <link {...link} />
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
