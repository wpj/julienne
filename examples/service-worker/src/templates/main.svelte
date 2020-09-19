<script lang="ts">
  import Button from '../components/button.svelte';

  export let name: string;

  export let searchIndexPath: string;

  function fetchSearchIndex(path: string) {
    return fetch(path).then(resp => resp.json());
  }

  let fetchPromise: Promise<any>;

  function loadSearchIndex() {
    fetchPromise = fetchSearchIndex(searchIndexPath);
  }
</script>

<svelte:head>
  <title>Home</title>
</svelte:head>

<p>
  Hello {name}.
</p>

<Button>Bar</Button>
<button on:click={loadSearchIndex}>Load search index</button>

{#if fetchPromise}
  {#await fetchPromise then searchIndex}
    <pre>
      {JSON.stringify(searchIndex, null, '  ')}
    </pre>
  {/await}
{/if}
