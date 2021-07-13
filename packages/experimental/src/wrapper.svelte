<script>
  let component;
  export { component as this };

  export let id;
</script>

<div data-julienne={JSON.stringify({ include: true, id, props: $$restProps })}>
  <svelte:component this={component} {...$$restProps} />
</div>
