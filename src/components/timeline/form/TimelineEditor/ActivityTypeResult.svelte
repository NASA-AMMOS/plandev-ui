<svelte:options immutable={true} />

<script lang="ts">
  import CloseIcon from '@nasa-jpl/stellar/icons/close.svg?component';
  import { createEventDispatcher } from 'svelte';
  import DirectiveIcon from '../../../../assets/timeline-directive.svg?component';
  import { tooltip } from '../../../../utilities/tooltip';

  export let name: string;
  export let removable: boolean = true;

  const dispatch = createEventDispatcher<{
    addFilter: void;
    remove: void;
  }>();
</script>

<div class="activity-type-result" role="listitem" aria-label="activity-type-result-{name}">
  <div class="top-row">
    <div class="title st-typography-medium">
      <DirectiveIcon />
      <div class="title-text">{name}</div>
    </div>
    <slot name="right" />
    {#if removable}
      <button
        on:click|stopPropagation={() => dispatch('remove')}
        class="st-button icon"
        use:tooltip={{ content: 'Remove Type' }}
      >
        <CloseIcon />
      </button>
    {/if}
  </div>
  <slot name="bottom" />
</div>

<style>
  .activity-type-result {
    box-shadow: 0px 0px 0px 1px var(--st-gray-20);
    display: flex;
    flex-direction: column;
    margin: 1px;
    padding-right: 4px;
  }

  .top-row {
    align-items: center;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  .title {
    align-items: center;
    display: flex;
    flex-direction: row;
    gap: 8px;
    overflow: hidden;
    padding: 8px;
  }

  .title-text {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .title :global(svg) {
    flex-shrink: 0;
  }

  button.icon {
    color: var(--st-gray-70);
  }
</style>
