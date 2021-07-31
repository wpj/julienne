import type { SvelteComponent } from 'svelte';
import { create_ssr_component, validate_component } from 'svelte/internal';
import Wrapper from './wrapper.js';

export default function wrap(
  Component: SvelteComponent,
  hash: string,
): ReturnType<typeof create_ssr_component> {
  return create_ssr_component(
    ($$result: unknown, $$props: Record<string | number | symbol, unknown>) => {
      return validate_component(Wrapper, 'Wrapper').$$render(
        $$result,
        { ...$$props, this: Component, hash },
        {},
        {},
      );
    },
  );
}
