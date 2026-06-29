<svelte:options immutable={true} />

<script lang="ts">
  export let padBody: boolean = true;
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
  <div class={padBody ? 'flex flex-col gap-3 p-4' : ''}>
    <slot />
  </div>
</section>
