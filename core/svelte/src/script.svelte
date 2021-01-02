<script lang="ts">
  export let content: string | undefined = undefined;
  export let type: string = 'text/javascript';

  let attributes = content
    ? Object.entries({ ...$$restProps, type }).reduce((acc, [key, val]) => {
        let kv =
          typeof val === 'boolean' ? (val ? key : '') : `${key}="${val}"`;

        return acc.length > 0 ? `${acc} ${kv}` : kv;
      }, '')
    : null;

  // This is necessary so svelte-preprocess doesn't try to preprocess the
  // script element.
  let s = 'script';

  // Scripts with content must be created as a string and rendered as raw
  // html because it appears that svelte doesn't let you template the content of a
  // script element.
</script>

{#if content}
  {@html `<${s} ${attributes}>${content}</${s}>`}
{:else}
  <script {type} {...$$restProps}>
  </script>
{/if}
