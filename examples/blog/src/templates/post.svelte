<script lang="ts">
  export let title: string;
  export let content: string;
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

<div>
  {@html content}
</div>
