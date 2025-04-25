<svelte:options immutable={true} />

<script lang="ts">
  import { ContextMenu } from '@nasa-jpl/stellar-svelte';
  import CaretDownFillIcon from 'bootstrap-icons/icons/caret-down-fill.svg?component';
  import CaretUpFillIcon from 'bootstrap-icons/icons/caret-up-fill.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { DefinitionType } from '../../enums/association';
  import type { Association, BaseDefinition } from '../../types/metadata';
  import type { Argument, FormParameter } from '../../types/parameter';
  import type { ValueSchema } from '../../types/schema';
  import { getTarget } from '../../utilities/generic';
  import { getCleansedStructArguments } from '../../utilities/parameters';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { tooltip } from '../../utilities/tooltip';
  import Collapse from '../Collapse.svelte';
  import ContextMenuInternal from '../context-menu/ContextMenu.svelte';
  import Parameters from '../parameters/Parameters.svelte';

  export let hasEditPermission: boolean = false;
  export let isSelected: boolean = false;
  export let invocationArguments: Argument = null;
  export let id: string = '';
  export let metadataId: number = -1;
  export let metadataName: string = '';
  export let metadataType: Association = 'constraint';
  export let priority: number | undefined = undefined;
  export let priorityLabel: string = 'priority';
  export let selectedRevision: number | null = null;
  export let shouldShowUpButton: boolean | undefined = false;
  export let shouldShowDownButton: boolean | undefined = false;
  export let versions: BaseDefinition[] = [];

  const dispatch = createEventDispatcher<{
    deleteInvocation: {
      id: string;
    };
    duplicateInvocation: {
      id: string;
    };
    selectDefinition: {
      definitionType: DefinitionType;
      id: string;
      metadataId: number;
      revision: number | null;
    } | null;
    updateArguments: {
      arguments: Argument;
      id: string;
    };
    updatePriority: {
      id: string;
      priority: number;
    };
    updateRevision: {
      arguments: Argument;
      id: string;
      revision: number | null;
    };
  }>();

  let contextMenu: ContextMenuInternal;
  let formParameters: FormParameter[] = [];
  let parameterSchema: ValueSchema | undefined;
  let permissionError: string = '';
  let priorityInput: HTMLInputElement;
  let selectedDefinitionType: DefinitionType = DefinitionType.CODE;

  $: {
    const selectedVersion = getSpecVersion(versions, selectedRevision);
    parameterSchema = selectedVersion?.parameter_schema;
    selectedDefinitionType = selectedVersion?.definition === null ? DefinitionType.FILE : DefinitionType.CODE;
  }
  $: permissionError = `You do not have permission to edit model ${metadataType}s`;
  $: if (id && isSelected) {
    focusPriorityInput();
  }
  $: if (parameterSchema && parameterSchema.type === 'struct') {
    formParameters = Object.entries(parameterSchema.items).map(([name, subschema], i) => ({
      errors: null,
      name,
      order: i,
      required: true,
      schema: subschema,
      value: invocationArguments && invocationArguments[name] != null ? invocationArguments[name] : '',
      valueSource: 'none',
    }));
  } else {
    formParameters = [];
  }

  function getSpecVersion(
    definitionVersions: BaseDefinition[],
    revision: number | string | null,
  ): BaseDefinition | undefined {
    if (revision != null && revision !== '') {
      const revisionNumber = parseInt(`${revision}`);
      return definitionVersions.find(v => v.revision === revisionNumber);
    } else {
      return definitionVersions[0];
    }
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

    const version = getSpecVersion(versions, revision as string | number | null);
    const schema = version?.parameter_schema;
    const cleansedArguments: Argument = getCleansedStructArguments(invocationArguments, schema);

    dispatch('updateRevision', {
      arguments: cleansedArguments,
      id,
      revision,
    });
    select(revision);
  }

  function onDuplicateInvocation() {
    dispatch('duplicateInvocation', {
      id,
    });
  }

  function onDeleteInvocation() {
    dispatch('deleteInvocation', {
      id,
    });
  }

  function onChangeFormParameters(event: CustomEvent<FormParameter>) {
    const {
      detail: { name, value },
    } = event;
    dispatch('updateArguments', {
      arguments: {
        [name]: value,
      },
      id,
    });
  }

  function updatePriority(updatedPriority: number) {
    dispatch('updatePriority', {
      id,
      priority: updatedPriority,
    });
    select(selectedRevision);
  }

  function select(revision: number | null) {
    dispatch('selectDefinition', {
      definitionType: selectedDefinitionType,
      id,
      metadataId,
      revision,
    });
  }
</script>

<div
  class="specification-list-item"
  class:selected={isSelected}
  on:mousedown={onSelect}
  on:contextmenu|preventDefault={contextMenu?.show}
  role="button"
  tabindex={1}
>
  {#if formParameters.length}
    <Collapse title={metadataName} tooltipContent={metadataName} defaultExpanded={false}>
      <svelte:fragment slot="right">
        <div class="inputs-container" role="none" on:click|stopPropagation>
          {#if hasEditPermission && metadataType !== 'condition'}
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
              <div class="priority-buttons">
                <button
                  use:tooltip={{ content: `Increase ${priorityLabel}`, placement: 'top' }}
                  class="st-button tertiary up-button"
                  class:hidden={!shouldShowUpButton}
                  tabindex={shouldShowUpButton ? -1 : 0}
                  on:click={onIncreasePriority}
                >
                  <CaretUpFillIcon />
                </button>
                <button
                  use:tooltip={{ content: `Decrease ${priorityLabel}`, placement: 'top' }}
                  class="st-button tertiary down-button"
                  class:hidden={!shouldShowDownButton}
                  tabindex={shouldShowDownButton ? -1 : 0}
                  on:click={onDecreasePriority}
                >
                  <CaretDownFillIcon />
                </button>
              </div>
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
            {#each versions as version, index}
              <option value={version.revision}>{version.revision}{index === 0 ? ' (Latest)' : ''}</option>
            {/each}
          </select>
        </div>
      </svelte:fragment>

      <Collapse title="Parameters" defaultExpanded={true}>
        <Parameters disabled={false} expanded={true} {formParameters} on:change={onChangeFormParameters} />
      </Collapse>
    </Collapse>
  {:else}
    <div class="metadata-name">{metadataName}</div>
    <div class="inputs-container" role="none" on:click|stopPropagation>
      {#if metadataType !== 'condition'}
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
                use:tooltip={{ content: `Increase ${priorityLabel}`, placement: 'top' }}
                class="st-button tertiary up-button"
                class:hidden={!shouldShowUpButton}
                tabindex={shouldShowUpButton ? -1 : 0}
                on:click={onIncreasePriority}
              >
                <CaretUpFillIcon />
              </button>
              <button
                use:tooltip={{ content: `Decrease ${priorityLabel}`, placement: 'top' }}
                class="st-button tertiary down-button"
                class:hidden={!shouldShowDownButton}
                tabindex={shouldShowDownButton ? -1 : 0}
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
        {#each versions as version, index}
          <option value={version.revision}>{version.revision}{index === 0 ? ' (Latest)' : ''}</option>
        {/each}
      </select>
    </div>
  {/if}
  {#if metadataType !== 'condition'}
    <ContextMenuInternal bind:this={contextMenu}>
      <div
        use:permissionHandler={{
          hasPermission: hasEditPermission,
          permissionError,
        }}
      >
        <ContextMenu.Item size="sm" on:click={onDuplicateInvocation}>Duplicate Invocation</ContextMenu.Item>
      </div>
      <div
        use:permissionHandler={{
          hasPermission: hasEditPermission,
          permissionError,
        }}
      >
        <ContextMenu.Item size="sm" on:click={onDeleteInvocation}>Delete Invocation</ContextMenu.Item>
      </div>
    </ContextMenuInternal>
  {/if}
</div>

<style>
  .specification-list-item {
    align-items: center;
    display: flex;
    justify-content: space-between;
    padding: 0.25rem 1rem;
  }

  .specification-list-item:hover {
    background-color: var(--st-gray-10);
  }

  .specification-list-item.selected {
    background-color: var(--st-gray-20);
  }

  .metadata-name {
    color: var(--st-typography-medium-color);
    font-weight: 500;
    line-height: 2rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .inputs-container {
    align-items: center;
    display: flex;
    gap: 8px;
    justify-content: flex-end;
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
