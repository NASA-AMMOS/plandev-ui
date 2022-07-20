<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { expansionRules, expansionRulesColumns } from '../../stores/expansion';
  import effects from '../../utilities/effects';
  import { compare } from '../../utilities/generic';
  import { tooltip } from '../../utilities/tooltip';
  import Input from '../form/Input.svelte';
  import Chip from '../ui/Chip.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import Panel from '../ui/Panel.svelte';
  import Table from '../ui/Table.svelte';
  import ExpansionLogicEditor from './ExpansionLogicEditor.svelte';

  let filteredRules: ExpansionRule[] = [];
  let filterText: string = '';
  let selectedExpansionRule: ExpansionRule | null = null;
  let sortedRules: ExpansionRule[] = [];

  $: filteredRules = $expansionRules.filter(rule => {
    const filterTextLowerCase = filterText.toLowerCase();
    const includesActivityType = rule.activity_type.toLocaleLowerCase().includes(filterTextLowerCase);
    const includesId = `${rule.id}`.includes(filterTextLowerCase);
    return includesActivityType || includesId;
  });
  $: sortedRules = filteredRules.sort((a, b) => compare(a.id, b.id));

  async function deleteRule(id: number) {
    const success = await effects.deleteExpansionRule(id);

    if (success) {
      sortedRules = sortedRules.filter(rule => rule.id !== id);

      if (id === selectedExpansionRule?.id) {
        selectedExpansionRule = null;
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
</script>

<CssGrid bind:columns={$expansionRulesColumns}>
  <Panel>
    <svelte:fragment slot="header">
      <Chip>Expansion Rules</Chip>

      <Input>
        <input bind:value={filterText} class="st-input" placeholder="Filter rules" style="width: 300px" />
      </Input>

      <div class="right">
        <button class="st-button secondary ellipsis" on:click={() => goto(`${base}/expansion/rules/new`)}> New </button>
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
            { field: 'created_at', name: 'Created At', sortable: true },
            { field: 'updated_at', name: 'Updated At', sortable: true },
          ]}
          rowActions
          rowData={sortedRules}
          rowSelectionMode="single"
          selectedRowId={selectedExpansionRule?.id}
          on:rowClick={toggleRule}
        >
          <div slot="actions-cell">
            <button
              class="st-button icon"
              on:click|stopPropagation={() => goto(`${base}/expansion/rules/edit/${currentRow.id}`)}
              use:tooltip={{ content: 'Edit Rule', placement: 'bottom' }}
            >
              <i class="bi bi-pencil" />
            </button>
            <button
              class="st-button icon"
              on:click|stopPropagation={() => deleteRule(currentRow.id)}
              use:tooltip={{ content: 'Delete Rule', placement: 'bottom' }}
            >
              <i class="bi bi-trash" />
            </button>
          </div>
        </Table>
      {:else}
        No Rules Found
      {/if}
    </svelte:fragment>
  </Panel>

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
