<script lang="ts">
  type T = $$Generic;
  // Simple mock that renders all items without virtualization
  export let items: T[] = [];
  export let disabled: boolean = false;
  export let estimatedItemHeight: number = 32;
  export let selectedIndex: number | undefined = undefined;
  export let maxHeight: string = 'unset';
  export let minWidth: string = 'unset';
  export let overscan: number = 5;

  // Suppress unused variable warnings
  void disabled;
  void estimatedItemHeight;
  void selectedIndex;
  void overscan;
</script>

<div class="scroll-container" style:max-height={maxHeight} style:min-width={minWidth}>
  {#each items as item, index}
    <slot {index} {item} />
  {/each}
</div>
