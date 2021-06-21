<script>
  import { onMount } from 'svelte';

  let count = 0;

  $: isEven = count % 2 === 0;

  onMount(() => {
    let interval = setInterval(() => {
      count += 1;
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  });
</script>

<div class:even={isEven} class:odd={!isEven}>
  {count}
</div>

<style>
  div {
    font-family: 'Open Sans';
  }

  .even {
    color: goldenrod;
  }

  .odd {
    color: dimgray;
  }
</style>
