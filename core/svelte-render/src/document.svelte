<script lang="ts">
  export let body: string | undefined;
  export let head: string | undefined;
  export let pageData: any;
  export let scripts: string[];
  export let stylesheets: string[];

  // This is necessary so svelte-preprocess doesn't try to preprocess the data
  // script element.
  let script = 'script';

  // The julienne-data script tag must be created as a string and rendered as
  // raw html because it appears that svelte doesn't let you template the content
  // of a script element.
</script>


<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">

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

  {@html `<${script} type="application/json" id="julienne-data">${JSON.stringify(pageData)}</${script}>`}

  {#each scripts as src}
    <script type="text/javascript" {src}></script>
  {/each}
</body>
</html>
