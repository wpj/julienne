<script lang="ts">
  /* ssg-hydrate */
  let isBlue = false;

  function handleClick() {
    isBlue = !isBlue;
  }
</script>

<style>
  .blue {
    color: blue;
  }

  .red {
    color: red;
  }
</style>

<button class:blue={isBlue} class:red={!isBlue} on:click={handleClick}>
  <slot></slot>
</button>
