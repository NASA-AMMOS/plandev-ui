<svelte:options immutable={true} />

<script lang="ts">
  import { expansionSets, sequences } from '../../stores/expansion';
  import { simulation } from '../../stores/simulation';
  import effects from '../../utilities/effects';
  import { showSequenceModal } from '../../utilities/modal';
  import { tooltip } from '../../utilities/tooltip';
  import GridMenu from '../menus/GridMenu.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import Table from '../ui/Table.svelte';

  export let gridId: number;

  let createButtonEnabled: boolean = false;
  let creatingSequence: boolean = false;
  let expandButtonEnabled: boolean = false;
  let expandingPlan: boolean = false;
  let selectedExpansionSetId: number | null = null;
  let seqIdInput: string = '';
  let simulation_dataset_id: number | null = null;

  $: simulation_dataset_id = $simulation.datasets.length ? $simulation.datasets[0].id : null;
  $: createButtonEnabled = seqIdInput !== '';
  $: expandButtonEnabled = selectedExpansionSetId !== null;

  async function createSequence() {
    creatingSequence = true;
    await effects.createSequence(seqIdInput);
    creatingSequence = false;
  }

  async function expandPlan() {
    expandingPlan = true;
    await effects.expand(selectedExpansionSetId);
    expandingPlan = false;
  }
</script>

<Panel>
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="Expansion" />
    <div class="right">
      <button
        class="st-button secondary ellipsis"
        disabled={!expandButtonEnabled}
        on:click|stopPropagation={expandPlan}
      >
        {expandingPlan ? 'Expanding... ' : 'Expand'}
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

        <div class="mt-2">
          {#if simulation_dataset_id === null}
            <div class="pb-3">First run a simulation before creating a sequence</div>
          {:else}
            <CssGrid columns="3fr 1fr" gap="10px">
              <input bind:value={seqIdInput} class="st-input" />
              <button
                class="st-button secondary"
                disabled={!createButtonEnabled}
                on:click|stopPropagation={createSequence}
              >
                {creatingSequence ? 'Creating... ' : 'Create'}
              </button>
            </CssGrid>

            <div class="mt-2">
              {#if $sequences.length}
                <Table
                  let:currentRow
                  columnDefs={[
                    { field: 'seq_id', name: 'Sequence ID', sortable: true },
                    { field: 'simulation_dataset_id', name: 'Simulation Dataset ID', sortable: true },
                  ]}
                  rowActions
                  rowData={$sequences}
                  on:rowClick={({ detail: sequence }) => showSequenceModal(sequence)}
                >
                  <button
                    class="st-button icon"
                    slot="actions-cell"
                    on:click|stopPropagation={() => effects.deleteSequence(currentRow)}
                    use:tooltip={{ content: 'Delete Sequence', placement: 'bottom' }}
                  >
                    <i class="bi bi-trash" />
                  </button>
                </Table>
              {:else}
                No Sequences Found
              {/if}
            </div>
          {/if}
        </div>
      </details>
    </fieldset>
  </svelte:fragment>
</Panel>
