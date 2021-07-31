<script>
  import devalue from 'devalue';

  let component;
  export { component as this };
  export let hash;

  let s = 'script';
  let serializedProps = devalue({ component: hash, props: $$restProps });
  let hydrationData = `julienneComponents = window.julienneComponents || []; julienneComponents.push(${serializedProps})`;
  let hydrationDataScript = `<${s} data-julienne type="application/javascript">${hydrationData}</${s}>`;
</script>

{@html hydrationDataScript}

<svelte:component this={component} {...$$restProps}>
  <slot />
</svelte:component>
