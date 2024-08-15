<svelte:options immutable={true} />

<script lang="ts">
  import CloseIcon from '@nasa-jpl/stellar/icons/close.svg?component';
  import ProgressRadial from './ProgressRadial.svelte';

  export { className as class };
  export let progress: number = 0;
  export let size: number = 16;

  let className: string = '';
</script>

<div class:cancel-progress={true} class={className}>
  <ProgressRadial {progress} {size} strokeWidth={1} />
  <div class="cancel"><CloseIcon /></div>
</div>

<style>
  .cancel-progress {
    --progress-radial-background: var(--st-gray-20);
    position: relative;
  }

  .cancel-progress .cancel {
    align-items: center;
    cursor: pointer;
    display: none;
    height: 100%;
    justify-content: center;
    left: 0;
    position: absolute;
    top: 0;
    width: 100%;
  }

  .cancel-progress .cancel :global(svg) {
    width: 65%;
  }

  .cancel-progress:hover .cancel {
    display: flex;
  }
</style>
