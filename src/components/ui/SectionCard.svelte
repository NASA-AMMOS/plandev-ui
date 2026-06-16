<svelte:options immutable={true} />

<script lang="ts">
  // When true, the body is full-bleed (no padding/gap) so a divide-y list or
  // table can align to the card's edges instead of sitting in a nested box.
  export let flush: boolean = false;
  export let title: string;
</script>

<section class="overflow-hidden rounded border border-border">
  <header class="flex min-h-9 items-center justify-between gap-2 border-b border-border px-4 py-2">
    <h3 class="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
    {#if $$slots.actions}
      <div class="flex shrink-0 items-center gap-2">
        <slot name="actions" />
      </div>
    {/if}
  </header>
  <div class={flush ? '' : 'flex flex-col gap-3 p-4'}>
    <slot />
  </div>
</section>
