<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { SearchParameters } from '../../../enums/searchParameters';
  import { actionDefinitions, actionDefinitionsByWorkspace, actionRuns, actionsColumns } from '../../../stores/actions';
  import { workspaces } from '../../../stores/sequencing';
  import type { ActionDefinition, ActionRun } from '../../../types/actions';
  import type { User } from '../../../types/app';
  import type { Workspace } from '../../../types/sequencing';
  import effects from '../../../utilities/effects';
  import { getSearchParameterNumber } from '../../../utilities/generic';
  import { showActionCreationModal } from '../../../utilities/modal';
  import { permissionHandler } from '../../../utilities/permissionHandler';
  import Input from '../../form/Input.svelte';
  import CssGrid from '../../ui/CssGrid.svelte';
  import CssGridGutter from '../../ui/CssGridGutter.svelte';
  import Panel from '../../ui/Panel.svelte';
  import SectionTitle from '../../ui/SectionTitle.svelte';
  import Tab from '../../ui/Tabs/Tab.svelte';
  import TabPanel from '../../ui/Tabs/TabPanel.svelte';
  import Tabs from '../../ui/Tabs/Tabs.svelte';
  import ActionRunCard from './ActionRunCard.svelte';

  export let user: User | null;

  let actionsFilterText: string = '';
  let actionRunsFilterText: string = '';
  let selectedActionDefinition: ActionDefinition | null = null;
  let workspace: Workspace | undefined;
  let workspaceId: number | null = null;

  $: workspace = $workspaces.find(workspace => workspace.id === workspaceId);
  $: selectedActionRuns = ($actionRuns || []).filter(actionRun => {
    return actionRun.action_definition_id === selectedActionDefinition?.id;
  });
  $: filteredActionRuns = (selectedActionDefinition ? selectedActionRuns : $actionRuns || []).filter(actionRun => {
    const definition = getActionDefinitionForRun(actionRun, $actionDefinitionsByWorkspace, workspaceId);
    if (definition && definition.name.indexOf(actionRunsFilterText) > -1) {
      return true;
    }
    if (actionRun.created_by && actionRun.created_by.indexOf(actionRunsFilterText) > -1) {
      return true;
    }
    return false;
  });

  onMount(() => {
    workspaceId = getSearchParameterNumber(SearchParameters.WORKSPACE_ID);
  });

  async function onNewActionClick() {
    if (typeof workspaceId !== 'number') {
      return;
    }

    showActionCreationModal(user, workspaceId);
  }

  function onActionRunClick(id: number) {
    const workspaceId = getSearchParameterNumber(SearchParameters.WORKSPACE_ID);
    goto(
      `${base}/sequencing/actions/runs/${id}${workspaceId ? `?${SearchParameters.WORKSPACE_ID}=${workspaceId}` : ''}`,
    );
  }

  async function runAction(action: ActionDefinition) {
    const actionRunId = await effects.runAction(action, user);
    console.log('actionRunId :>> ', actionRunId);
    if (typeof actionRunId === 'number') {
      goto(
        `${base}/sequencing/actions/runs/${actionRunId}${workspaceId ? `?${SearchParameters.WORKSPACE_ID}=${workspaceId}` : ''}`,
      );
    }
  }

  function getActionDefinitionForRun(
    actionRun: ActionRun,
    actionDefinitionsByWorkspace: Record<number, Record<number, ActionDefinition>>,
    workspaceId: number | null,
  ): ActionDefinition | null {
    if (typeof workspaceId === 'number') {
      const workspaceDefinitions = actionDefinitionsByWorkspace[workspaceId];
      if (workspaceDefinitions) {
        return workspaceDefinitions[actionRun.action_definition_id] ?? null;
      }
    }
    return null;
  }

  function onEditActionClick(actionDefinition: ActionDefinition) {
    goto(
      `${base}/sequencing/actions/${actionDefinition.id}${workspaceId ? `?${SearchParameters.WORKSPACE_ID}=${workspaceId}` : ''}`,
    );
  }
</script>

<CssGrid bind:columns={$actionsColumns} class="grid">
  <Panel>
    <svelte:fragment slot="header">
      <SectionTitle>Actions</SectionTitle>

      <Input>
        <input bind:value={actionsFilterText} class="st-input" placeholder="Filter actions" style="width: 100%;" />
      </Input>

      <div>
        <button
          class="st-button secondary ellipsis"
          use:permissionHandler={{
            hasPermission: true /* featurePermissions.sequences.canCreate(user) */,
            permissionError: 'You do not have permission to create a new action',
          }}
          disabled={workspace === undefined}
          on:click|stopPropagation={onNewActionClick}
        >
          New Action
        </button>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="body">
      <div class="actions">
        {#each $actionDefinitions || [] as actionDefinition}
          <button
            class="action st-button tertiary"
            on:click={() => {
              if (selectedActionDefinition?.id === actionDefinition.id) {
                selectedActionDefinition = null;
              } else {
                selectedActionDefinition = actionDefinition;
              }
            }}
            class:selected={selectedActionDefinition?.id === actionDefinition.id}
          >
            <div class="st-typography-medium" style:flex={1}>{actionDefinition.name}</div>
            <button class="st-button secondary" on:click|stopPropagation={() => runAction(actionDefinition)}>
              Run
            </button>
          </button>
        {/each}
      </div>
    </svelte:fragment>
  </Panel>

  <CssGridGutter track={1} type="column" />

  <Panel>
    <svelte:fragment slot="header">
      <SectionTitle>Action Runs</SectionTitle>

      <Input>
        <input
          bind:value={actionRunsFilterText}
          class="st-input"
          placeholder="Filter action runs"
          style="width: 100%;"
        />
      </Input>
    </svelte:fragment>

    <b>Action Runs</b>

    <svelte:fragment slot="body">
      {#if ($actionRuns || []).length < 1}
        <div>No action runs</div>
      {/if}
      {#if selectedActionDefinition}
        <div>
          <div class="action-definition-runs">
            <div class="action-definition-runs-info">
              <div class="st-typography-bold">{selectedActionDefinition.name}</div>
              <div class="st-typography-body">{selectedActionDefinition.description}</div>
            </div>
            <div>
              <button class="st-button secondary" on:click|stopPropagation={() => runAction(selectedActionDefinition)}>
                Edit
              </button>
              <button class="st-button secondary" on:click|stopPropagation={() => runAction(selectedActionDefinition)}>
                Run
              </button>
              <button class="st-button secondary" on:click={() => (selectedActionDefinition = null)}> Close </button>
            </div>
          </div>
          <div>
            <Tabs class="action-definition-runs-tabs">
              <svelte:fragment slot="tab-list">
                <Tab class="action-definition-runs-tab">Runs ({(filteredActionRuns || []).length})</Tab>
                <Tab class="action-definition-runs-tab">Code</Tab>
              </svelte:fragment>
              <TabPanel>
                <div class="action-runs" style="padding-top: 8px">
                  {#each filteredActionRuns || [] as actionRun}
                    <ActionRunCard
                      {actionRun}
                      actionDefinition={getActionDefinitionForRun(
                        actionRun,
                        $actionDefinitionsByWorkspace,
                        workspaceId,
                      )}
                      {user}
                      on:click={() => onActionRunClick(actionRun.id)}
                    />
                  {/each}
                </div>
              </TabPanel>
              <TabPanel>Coming Soon</TabPanel>
            </Tabs>
          </div>
        </div>
      {:else}
        <div class="action-runs">
          {#each filteredActionRuns || [] as actionRun}
            <ActionRunCard
              {actionRun}
              actionDefinition={getActionDefinitionForRun(actionRun, $actionDefinitionsByWorkspace, workspaceId)}
              {user}
              on:click={() => onActionRunClick(actionRun.id)}
            />
          {/each}
        </div>
      {/if}
    </svelte:fragment>
  </Panel>
</CssGrid>

<style>
  .actions,
  .action-runs {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .action {
    border-radius: 4px;
    display: flex;
    height: 40px;
    padding: 8px;
    text-align: left;
  }

  .action .st-button {
    opacity: 0;
  }

  .action.selected {
    background: var(--st-gray-10);
  }

  .action.selected .st-button,
  .action:hover .st-button,
  .action:focus-within .st-button {
    opacity: 1;
  }

  .action-definition-runs {
    display: flex;
    gap: 4px;
    justify-content: space-between;
    padding: 8px 8px 16px;
  }

  .action-definition-runs-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  :global(.action-definition-runs-tabs .tab-list) {
    background-color: white;
  }

  :global(button.action-definition-runs-tab) {
    background-color: white;
  }

  :global(button.action-definition-runs-tab:hover) {
    background-color: white;
    color: black;
  }

  :global(button.action-definition-runs-tab.selected) {
    background-color: white;
    border-bottom: 1px solid black;
  }

  .code {
    border: 1px solid var(--st-gray-30);
    border-radius: 4px;
    height: 400px;
    overflow: hidden;
  }
</style>
