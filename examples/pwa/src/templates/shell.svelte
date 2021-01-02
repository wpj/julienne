<script context="module" lang="ts">
  import { createJsonSlug } from '../helpers';

  async function importTemplate(template: string) {
    return import(`./${template}.svelte`).then((mod) => mod.default);
  }

  async function fetchPage(pageUrl: string) {
    let jsonUrl = createJsonSlug(pageUrl);

    let { props, template } = await fetch(jsonUrl).then((resp) => resp.json());

    let Template = await importTemplate(template);

    return { Template, props, template };
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';

  let pageUrl: string;

  onMount(async () => {
    pageUrl = location.pathname;
  });
</script>

{#if pageUrl}
  {#await fetchPage(pageUrl) then { Template, props }}
    <svelte:component this={Template} {...props} />
  {/await}
{/if}
