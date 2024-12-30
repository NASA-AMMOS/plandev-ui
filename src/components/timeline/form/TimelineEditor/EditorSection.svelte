<svelte:options immutable={true} />

<script lang="ts">
  import PlusIcon from '@nasa-jpl/stellar/icons/plus.svg?component';
  import RemoveAllIcon from '@nasa-jpl/stellar/icons/remove_all.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { classNames } from '../../../../utilities/generic';
  import { tooltip } from '../../../../utilities/tooltip';

  export let isDragContainer: boolean = false;
  export let creatable: boolean = false;
  export let item: string = '';
  export let itemPlural: string = '';
  export let itemCount: number | undefined = undefined;

  let pluralizedItem = itemPlural || `${item}s`;

  const dispatch = createEventDispatcher<{
    create: void;
    removeAll: void;
  }>();
</script>

<fieldset
  aria-label="{item}-editor"
  class={classNames('editor-section', { 'editor-section-draggable': isDragContainer })}
>
  <div class="editor-section-header">
    <div class="st-typography-medium">{pluralizedItem}</div>
    {#if creatable}
      <div>
        {#if typeof itemCount === 'number' && itemCount > 0}
          <button
            on:click|stopPropagation={() => dispatch('removeAll')}
            use:tooltip={{ content: `Delete All ${pluralizedItem}`, placement: 'top' }}
            class="st-button icon"
          >
            <RemoveAllIcon />
          </button>
        {/if}
        <button
          aria-label={`New ${item}`}
          on:click|stopPropagation={() => dispatch('create')}
          use:tooltip={{ content: `New ${item}`, placement: 'top' }}
          class="st-button icon"
        >
          <PlusIcon />
        </button>
      </div>
    {/if}
  </div>

  <slot />
</fieldset>

<style>
  .editor-section {
    border-bottom: 1px solid var(--st-gray-20);
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }

  .editor-section-header {
    align-items: center;
    display: flex;
    justify-content: space-between;
    user-select: none;
  }

  .editor-section-header .st-button.icon {
    color: var(--st-gray-50);
  }

  .editor-section-header-with-button {
    align-items: center;
    display: flex;
    justify-content: space-between;
  }

  .editor-section-draggable {
    padding: 0;
  }

  .editor-section-draggable .editor-section-header {
    padding: 16px 16px 0;
  }
</style>
