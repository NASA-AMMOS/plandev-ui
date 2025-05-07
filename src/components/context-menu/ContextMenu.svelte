<svelte:options accessors={true} immutable={true} />

<script lang="ts" context="module">
  type HideFns = Set<() => void>;
  const hideFns: HideFns = new Set<() => void>();

  export function hideAllMenus() {
    hideFns.forEach(hideFn => {
      hideFn();
    });
  }
</script>

<script lang="ts">
  import { ContextMenu } from '@nasa-jpl/stellar-svelte';

  import { createEventDispatcher, onDestroy, onMount } from 'svelte';

  const dispatch = createEventDispatcher<{
    hide: void;
  }>();

  let buttonRef: HTMLButtonElement;

  export function hide(notify = false): void {
    shown = false;
    x = 0;
    y = 0;
    if (notify) {
      dispatch('hide');
    }
  }

  export function isShown() {
    return shown;
  }

  export function show(e: MouseEvent): void {
    hideAllMenus();
    e.preventDefault();
    x = e.clientX;
    y = e.clientY;
    shown = true;
    const newEvent = new MouseEvent(e.type, e);
    buttonRef.dispatchEvent(newEvent);
  }

  let shown: boolean = false;
  let x: number;
  let y: number;

  onMount(() => {
    hideFns.add(hide);
  });

  onDestroy(() => {
    hideFns.delete(hide);
  });
</script>

<ContextMenu.Root
  onOpenChange={open => {
    if (!open) {
      hide(true);
    }
  }}
  bind:open={shown}
>
  <ContextMenu.Trigger class="h-0 w-0" asChild let:builder>
    <button
      {...builder}
      use:builder.action
      style="left: {x}px !important; opacity: 0; pointer-events: none; position: absolute;top: {y}px !important;"
      bind:this={buttonRef}
      aria-label="Context Menu"
    />
  </ContextMenu.Trigger>
  <ContextMenu.Content>
    <slot />
  </ContextMenu.Content>
</ContextMenu.Root>
