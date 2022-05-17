<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import Input from '../form/Input.svelte';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import type Modal from '../modals/Modal.svelte';
  import Chip from '../ui/Chip.svelte';
  import Panel from '../ui/Panel.svelte';
  import Table from '../ui/Table.svelte';
  import { expansionActions, expansionRules } from '../../stores/expansion';
  import { compare } from '../../utilities/generic';
  import { tooltip } from '../../utilities/tooltip';

  let confirmDeleteRuleModal: Modal;
  let filteredRules: ExpansionRule[] = [];
  let filterText: string = '';
  let sortedRules: ExpansionRule[] = [];

  $: filteredRules = $expansionRules.filter(rule => {
    const filterTextLowerCase = filterText.toLowerCase();
    const includesActivityType = rule.activity_type.toLocaleLowerCase().includes(filterTextLowerCase);
    const includesId = `${rule.id}`.includes(filterTextLowerCase);
    return includesActivityType || includesId;
  });
  $: sortedRules = filteredRules.sort((a, b) => compare(a.id, b.id));

  async function deleteRule(event: CustomEvent<ExpansionRule>) {
    const { detail: rule } = event;
    const { id } = rule;
    await expansionActions.deleteExpansionRule(id);
  }
</script>

<Panel>
  <svelte:fragment slot="header">
    <Chip>Expansion Rules</Chip>

    <Input>
      <i class="bi bi-search" slot="left" />
      <input bind:value={filterText} class="st-input" placeholder="Filter rules" style="width: 300px" />
    </Input>

    <div class="right">
      <button class="st-button secondary ellipsis" on:click={() => goto('/expansion/rules/new')}>
        <i class="bi bi-plus-square" style="font-size: 0.8rem" />
        New
      </button>
    </div>
  </svelte:fragment>

  <svelte:fragment slot="body">
    {#if sortedRules.length}
      <Table
        let:currentRow
        columnDefs={[
          { field: 'id', name: 'Rule ID', sortable: true },
          { field: 'activity_type', name: 'Activity Type', sortable: true },
          { field: 'authoring_command_dict_id', name: 'Command Dictionary ID', sortable: true },
          { field: 'authoring_mission_model_id', name: 'Model ID', sortable: true },
        ]}
        rowActions
        rowData={sortedRules}
        on:rowClick={({ detail }) => goto(`/expansion/rules/edit/${detail.id}`)}
      >
        <button
          class="st-button icon"
          slot="actions-cell"
          on:click|stopPropagation={() => confirmDeleteRuleModal.show(currentRow)}
          use:tooltip={{ content: 'Delete Rule', placement: 'bottom' }}
        >
          <i class="bi bi-trash" />
        </button>
      </Table>
    {:else}
      No Rules Found
    {/if}
  </svelte:fragment>
</Panel>

<ConfirmModal
  bind:modal={confirmDeleteRuleModal}
  confirmText="Delete"
  message="Are you sure you want to delete this rule?"
  title="Delete Rule"
  on:confirm={deleteRule}
/>
