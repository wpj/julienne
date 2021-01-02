<script lang="ts">
  export let posts: { slug: string; title: string }[];
</script>

<svelte:head>
  <title>Blog example</title>
</svelte:head>

<ul>
  {#each posts as post}
    <li><a href={post.slug}>{post.title}</a></li>
  {/each}
</ul>
