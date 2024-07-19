<svelte:options immutable={true} />

<script lang="ts">
  import CaretDownFillIcon from 'bootstrap-icons/icons/caret-down-fill.svg?component';
  import CaretUpFillIcon from 'bootstrap-icons/icons/caret-up-fill.svg?component';
  import { createEventDispatcher } from 'svelte';
  import type { Association } from '../../types/metadata';
  import { getTarget } from '../../utilities/generic';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { tooltip } from '../../utilities/tooltip';

  export let hasEditPermission: boolean = false;
  export let isSelected: boolean = false;
  export let metadataName: string = '';
  export let metadataId: number = -1;
  export let metadataType: Association = 'constraint';
  export let selectedRevision: number | null = null;
  export let revisions: number[] = [];
  export let priority: number | undefined = undefined;

  const dispatch = createEventDispatcher<{
    selectSpecification: {
      id: number;
      revision: number | null;
    } | null;
    updatePriority: {
      id: number;
      priority: number;
    };
    updateRevision: {
      id: number;
      revision: number | null;
    };
  }>();

  let permissionError: string = '';
  let priorityInput: HTMLInputElement;
  let upButtonHidden: boolean = false;

  $: permissionError = `You do not have permission to edit model ${metadataType}s`;
  $: upButtonHidden = priority !== undefined && priority <= 0;
  $: if (metadataId && isSelected) {
    focusPriorityInput();
  }

  function focusPriorityInput() {
    if (document.activeElement !== priorityInput) {
      priorityInput?.focus();
    }

    return true;
  }

  function onSelect() {
    select(selectedRevision);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (priority !== undefined && ['ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'ArrowUp') {
        if (priority > 0) {
          updatePriority(priority - 1);
        }
      } else {
        updatePriority(priority + 1);
      }
    }
  }

  function onDecreasePriority() {
    if (priority !== undefined) {
      focusPriorityInput();
      updatePriority(priority + 1);
    }
  }

  function onIncreasePriority() {
    if (priority !== undefined) {
      focusPriorityInput();
      updatePriority(priority - 1);
    }
  }

  function onUpdatePriority() {
    if (priority !== undefined) {
      updatePriority(priority);
    }
  }

  function onUpdateRevision(event: Event) {
    const { value } = getTarget(event);
    const revision = value == null || value === '' ? null : parseInt(`${value}`);
    dispatch('updateRevision', {
      id: metadataId,
      revision,
    });
    select(revision);
  }

  function updatePriority(updatedPriority: number) {
    dispatch('updatePriority', {
      id: metadataId,
      priority: updatedPriority,
    });
    select(selectedRevision);
  }

  function select(revision: number | null) {
    dispatch('selectSpecification', {
      id: metadataId,
      revision,
    });
  }
</script>

<div class="specification-list-item" class:selected={isSelected} on:mousedown={onSelect} role="button" tabindex={1}>
  <div class="metadata-name">{metadataName}</div>
  <div class="inputs-container">
    {#if priority !== undefined}
      <div class="priority-container">
        <input
          bind:this={priorityInput}
          bind:value={priority}
          class="st-input"
          min="0"
          style:width="68px"
          type="number"
          on:change={onUpdatePriority}
          on:keydown={onKeyDown}
          use:permissionHandler={{
            hasPermission: hasEditPermission,
            permissionError,
          }}
        />
        {#if hasEditPermission}
          <div class="priority-buttons">
            <button
              use:tooltip={{ content: 'Increase Priority', placement: 'top' }}
              class="st-button tertiary up-button"
              class:hidden={upButtonHidden}
              tabindex={upButtonHidden ? -1 : 0}
              on:click={onIncreasePriority}
            >
              <CaretUpFillIcon />
            </button>
            <button
              use:tooltip={{ content: 'Decrease Priority', placement: 'top' }}
              class="st-button tertiary down-button"
              on:click={onDecreasePriority}
            >
              <CaretDownFillIcon />
            </button>
          </div>
        {/if}
      </div>
    {/if}
    <select
      class="st-select"
      value={selectedRevision}
      on:change={onUpdateRevision}
      on:click|stopPropagation
      use:permissionHandler={{
        hasPermission: hasEditPermission,
        permissionError,
      }}
    >
      <option value={null}>Always use latest</option>
      {#each revisions as revision, index}
        <option value={revision}>{revision}{index === 0 ? ' (Latest)' : ''}</option>
      {/each}
    </select>
  </div>
</div>

<style>
  .specification-list-item {
    align-items: center;
    display: grid;
    grid-template-columns: auto auto;
    justify-content: space-between;
    padding: 0.25rem 1rem;
    row-gap: 1rem;
  }

  .specification-list-item:hover {
    background-color: var(--st-gray-10);
  }

  .specification-list-item.selected {
    background-color: var(--st-gray-20);
  }

  .inputs-container {
    column-gap: 8px;
    display: grid;
    grid-template-columns: auto min-content;
  }

  .priority-container {
    display: flex;
  }

  /* Hide number input "spinners" (up and down arrows) in WebKit browsers ... */
  .priority-container input::-webkit-outer-spin-button,
  .priority-container input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  /* ... and Firefox */
  .priority-container input[type='number'] {
    -moz-appearance: textfield;
    appearance: textfield;
    padding-right: 32px;
  }

  .priority-buttons {
    align-items: center;
    display: flex;
    margin-left: -36px;
  }

  .priority-buttons :global(button) {
    align-items: center;
    color: var(--st-gray-40);
    cursor: pointer;
    display: flex;
    min-width: 0;
    padding: 0;
    pointer-events: painted;
  }

  .priority-buttons :global(button):hover {
    background-color: transparent !important;
    color: var(--st-gray-60);
  }

  .down-button {
    margin-left: -3px;
    margin-right: 2px;
  }

  .hidden {
    opacity: 0;
    pointer-events: none;
  }
</style>
