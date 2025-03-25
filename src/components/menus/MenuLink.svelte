<svelte:options accessors={true} immutable={true} />

<script lang="ts">
  import type { HTMLAnchorAttributes } from 'svelte/elements';
  import { twMerge } from 'tailwind-merge';
  import { useActions, type ActionArray } from '../../utilities/useActions';

  interface $$Props extends HTMLAnchorAttributes {
    className?: string;
    disabled?: boolean;
    href: string;
    use?: ActionArray;
  }

  export let className: $$Props['className'] = '';
  export let disabled: $$Props['disabled'] = false;
  export let href: $$Props['href'] = '';
  export let use: $$Props['use'] = [];
</script>

<a
  {...$$restProps}
  class={twMerge(
    'flex cursor-pointer items-center gap-2 rounded-sm px-3 py-3 text-[13px] text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50',
    className,
  )}
  class:disabled
  role="menuitem"
  use:useActions={use || []}
  {href}
>
  <slot />
</a>
