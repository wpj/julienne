/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SvelteComponent } from 'svelte';
import { create_ssr_component, validate_component } from 'svelte/internal';

import Wrapper from './wrapper.svelte';

export function wrap(
  Component: SvelteComponent,
  id: string,
): ReturnType<typeof create_ssr_component> {
  return create_ssr_component(($$result: any, $$props: any) => {
    return validate_component(Wrapper, 'Wrapper').$$render(
      $$result,
      { ...$$props, this: Component, id },
      {},
      {},
    );
  });
}
