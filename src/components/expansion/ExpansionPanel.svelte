<svelte:options immutable={true} />

<script lang="ts">
  import {
    creatingExpansionSequence,
    expandingPlan,
    expansionSets,
    filteredExpansionSequences,
  } from '../../stores/expansion';
  import { simulationDatasetId } from '../../stores/simulation';
  import effects from '../../utilities/effects';
  import { showExpansionSequenceModal } from '../../utilities/modal';
  import { tooltip } from '../../utilities/tooltip';
  import GridMenu from '../menus/GridMenu.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import Table from '../ui/Table.svelte';

  export let gridId: number;

  let createButtonEnabled: boolean = false;
  let expandButtonEnabled: boolean = false;
  let selectedExpansionSetId: number | null = null;
  let seqIdInput: string = '';

  $: createButtonEnabled = seqIdInput !== '';
  $: expandButtonEnabled = selectedExpansionSetId !== null;
</script>

<Panel>
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="Expansion" />
    <div class="right">
      <button
        class="st-button secondary ellipsis"
        disabled={!expandButtonEnabled}
        on:click|stopPropagation={() => effects.expand(selectedExpansionSetId, $simulationDatasetId)}
      >
        {$expandingPlan ? 'Expanding... ' : 'Expand'}
      </button>
    </div>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <fieldset>
      <label for="expansionSet">Expansion Set</label>
      <select
        bind:value={selectedExpansionSetId}
        class="st-select w-100"
        disabled={!$expansionSets.length}
        name="expansionSet"
      >
        {#if !$expansionSets.length}
          <option value={null}>No Expansion Sets Found</option>
        {:else}
          <option value={null} />
          {#each $expansionSets as set}
            <option value={set.id}>
              Expansion Set {set.id}
            </option>
          {/each}
        {/if}
      </select>
    </fieldset>

    <fieldset>
      <details open style:cursor="pointer">
        <summary>Sequences</summary>

        <div class="pt-2 pb-3">
          <label for="simulationDatasetId">Simulation Dataset ID</label>
          <input class="st-input w-100" disabled name="simulationDatasetId" value={$simulationDatasetId ?? 'None'} />
        </div>

        <div class="pb-3">
          {#if $simulationDatasetId === null}
            <div class="pb-3">First run a simulation before creating a sequence</div>
          {:else}
            <CssGrid columns="3fr 1fr" gap="10px">
              <input bind:value={seqIdInput} class="st-input" />
              <button
                class="st-button secondary"
                disabled={!createButtonEnabled}
                on:click|stopPropagation={() => effects.createExpansionSequence(seqIdInput, $simulationDatasetId)}
              >
                {$creatingExpansionSequence ? 'Creating... ' : 'Create'}
              </button>
            </CssGrid>

            <div class="mt-2">
              {#if $filteredExpansionSequences.length}
                <Table
                  let:currentRow
                  columnDefs={[
                    { field: 'seq_id', name: 'Sequence ID', sortable: true },
                    { field: 'simulation_dataset_id', name: 'Simulation Dataset ID', sortable: true },
                  ]}
                  rowActions
                  rowData={$filteredExpansionSequences}
                  on:rowClick={({ detail: sequence }) => showExpansionSequenceModal(sequence)}
                >
                  <button
                    class="st-button icon"
                    slot="actions-cell"
                    on:click|stopPropagation={() => effects.deleteExpansionSequence(currentRow)}
                    use:tooltip={{ content: 'Delete Sequence', placement: 'bottom' }}
                  >
                    <i class="bi bi-trash" />
                  </button>
                </Table>
              {:else}
                No Sequences for Simulation Dataset {$simulationDatasetId ?? ''}
              {/if}
            </div>
          {/if}
        </div>
      </details>
    </fieldset>
  </svelte:fragment>
</Panel>
