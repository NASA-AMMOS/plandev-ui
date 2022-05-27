<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import ExpansionLogicEditor from './ExpansionLogicEditor.svelte';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import type Modal from '../modals/Modal.svelte';
  import Chip from '../ui/Chip.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import Panel from '../ui/Panel.svelte';
  import Table from '../ui/Table.svelte';
  import { expansionSets, expansionSetsColumns } from '../../stores/expansion';
  import { compare } from '../../utilities/generic';
  import req from '../../utilities/requests';
  import { tooltip } from '../../utilities/tooltip';

  let confirmDeleteSetModal: Modal;
  let sortedSets: ExpansionSet[] = [];
  let selectedExpansionRule: ExpansionRule | null = null;
  let selectedExpansionSet: ExpansionSet | null = null;

  $: sortedSets = $expansionSets.sort((a, b) => compare(a.id, b.id));

  async function deleteSet(event: CustomEvent<ExpansionSet>) {
    const { detail: set } = event;
    const { id } = set;
    const success = await req.deleteExpansionSet(id);

    if (success) {
      sortedSets = sortedSets.filter(set => set.id !== id);

      if (id === selectedExpansionSet?.id) {
        selectedExpansionRule = null;
        selectedExpansionSet = null;
      }
    }
  }

  function toggleRule(event: CustomEvent<ExpansionRule>) {
    const { detail: clickedRule } = event;

    if (selectedExpansionRule?.id === clickedRule.id) {
      selectedExpansionRule = null;
    } else {
      selectedExpansionRule = clickedRule;
    }
  }

  function toggleSet(event: CustomEvent<ExpansionSet>) {
    const { detail: clickedSet } = event;

    selectedExpansionRule = null;

    if (selectedExpansionSet?.id === clickedSet.id) {
      selectedExpansionSet = null;
    } else {
      selectedExpansionSet = clickedSet;
    }
  }
</script>

<CssGrid bind:columns={$expansionSetsColumns}>
  <CssGrid rows="1fr 1px 1fr">
    <Panel>
      <svelte:fragment slot="header">
        <Chip>Expansion Sets</Chip>

        <div class="right">
          <button class="st-button secondary ellipsis" on:click={() => goto('/expansion/sets/new')}> New </button>
        </div>
      </svelte:fragment>

      <svelte:fragment slot="body">
        {#if sortedSets.length}
          <Table
            let:currentRow
            columnDefs={[
              { field: 'id', name: 'Set ID', sortable: true },
              { field: 'command_dict_id', name: 'Command Dictionary ID', sortable: true },
              { field: 'mission_model_id', name: 'Model ID', sortable: true },
            ]}
            rowActions
            rowData={sortedSets}
            rowSelectionMode="single"
            selectedRowId={selectedExpansionSet?.id}
            on:rowClick={toggleSet}
          >
            <div slot="actions-cell">
              <button
                class="st-button icon"
                on:click|stopPropagation={() => confirmDeleteSetModal.show(currentRow)}
                use:tooltip={{ content: 'Delete Expansion Set', placement: 'bottom' }}
              >
                <i class="bi bi-trash" />
              </button>
            </div>
          </Table>
        {:else}
          No Expansion Sets Found
        {/if}
      </svelte:fragment>
    </Panel>

    <CssGridGutter track={1} type="row" />

    <Panel>
      <svelte:fragment slot="header">
        <Chip>Expansion Rules</Chip>
      </svelte:fragment>

      <svelte:fragment slot="body">
        {#if selectedExpansionSet}
          <Table
            let:currentRow
            columnDefs={[
              { field: 'id', name: 'Rule ID', sortable: true },
              { field: 'activity_type', name: 'Activity Type', sortable: true },
            ]}
            rowData={selectedExpansionSet?.expansion_rules}
            rowSelectionMode="single"
            selectedRowId={selectedExpansionRule?.id}
            on:rowClick={toggleRule}
          />
        {:else}
          No Expansion Set Selected
        {/if}
      </svelte:fragment>
    </Panel>
  </CssGrid>

  <CssGridGutter track={1} type="column" />

  <ExpansionLogicEditor
    readOnly={true}
    ruleActivityType={selectedExpansionRule?.activity_type}
    ruleDictionaryId={selectedExpansionRule?.authoring_command_dict_id}
    ruleLogic={selectedExpansionRule?.expansion_logic ?? 'No Expansion Rule Selected'}
    ruleModelId={selectedExpansionRule?.authoring_mission_model_id}
    title="Expansion Rule - Logic Editor (Read-only)"
  />
</CssGrid>

<ConfirmModal
  bind:modal={confirmDeleteSetModal}
  confirmText="Delete"
  message="Are you sure you want to delete this expansion set?"
  title="Delete Expansion Set"
  on:confirm={deleteSet}
/>
