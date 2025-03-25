<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { SearchParameters } from '../../../enums/searchParameters';
  import {
    actionDefinitions,
    actionDefinitionsByWorkspace,
    actionRuns,
    actionRunsByWorkspace,
    actionsColumns,
  } from '../../../stores/actions';
  import { workspaces } from '../../../stores/sequencing';
  import type { ActionDefinition, ActionRunSlim } from '../../../types/actions';
  import type { User } from '../../../types/app';
  import type { ArgumentsMap, FormParameter } from '../../../types/parameter';
  import type { Workspace } from '../../../types/sequencing';
  import { getActionDefinitionForRun, valueSchemaRecordToParametersMap } from '../../../utilities/actions';
  import effects from '../../../utilities/effects';
  import { getSearchParameterNumber } from '../../../utilities/generic';
  import { showActionCreationModal } from '../../../utilities/modal';
  import { getArguments, getFormParameters } from '../../../utilities/parameters';
  import { permissionHandler } from '../../../utilities/permissionHandler';
  import { featurePermissions } from '../../../utilities/permissions';
  import Input from '../../form/Input.svelte';
  import Loading from '../../Loading.svelte';
  import Parameters from '../../parameters/Parameters.svelte';
  import CssGrid from '../../ui/CssGrid.svelte';
  import CssGridGutter from '../../ui/CssGridGutter.svelte';
  import MonacoEditor from '../../ui/MonacoEditor.svelte';
  import Panel from '../../ui/Panel.svelte';
  import SectionTitle from '../../ui/SectionTitle.svelte';
  import Tab from '../../ui/Tabs/Tab.svelte';
  import TabPanel from '../../ui/Tabs/TabPanel.svelte';
  import Tabs from '../../ui/Tabs/Tabs.svelte';
  import ActionRunCard from './ActionRunCard.svelte';

  export let user: User | null;

  let actionDefinitionsFilterText: string = '';
  let actionRunsFilterText: string = '';
  let selectedActionDefinitionId: number | null = null;
  let selectedActionDefinition: ActionDefinition | null = null;
  let workspace: Workspace | undefined;
  let workspaceId: number | null = null;
  let workspaceActionDefinitions: ActionDefinition[] = [];
  let workspaceActionRuns: ActionRunSlim[] = [];
  let saveButtonDisabled: boolean = true;
  let description: string = '';
  let name: string = '';
  let code: string = '';
  let codeAbortController: AbortController;
  let argumentsMap: ArgumentsMap = {};
  let saving: boolean = false;

  $: workspace = $workspaces.find(workspace => workspace.id === workspaceId);
  $: if (typeof workspaceId === 'number') {
    workspaceActionDefinitions = Object.values($actionDefinitionsByWorkspace[workspaceId] || {});
    workspaceActionRuns = Object.values($actionRunsByWorkspace[workspaceId] || {});
  }

  $: selectedActionRuns = (workspaceActionRuns || []).filter(actionRun => {
    return actionRun.action_definition_id === selectedActionDefinition?.id;
  });

  $: filteredActionRuns = (selectedActionDefinition ? selectedActionRuns : workspaceActionRuns).filter(actionRun => {
    const definition = getActionDefinitionForRun(actionRun, $actionDefinitionsByWorkspace, workspaceId);
    if (definition && definition.name.indexOf(actionRunsFilterText) > -1) {
      return true;
    }
    if (actionRun.requested_by && actionRun.requested_by.indexOf(actionRunsFilterText) > -1) {
      return true;
    }
    return false;
  });

  $: filteredActionDefinitions = workspaceActionDefinitions.filter(actionDefinition => {
    return actionDefinition.name.indexOf(actionDefinitionsFilterText) > -1;
  });

  $: if (typeof selectedActionDefinitionId === 'number') {
    selectedActionDefinition =
      workspaceActionDefinitions.find(actionDefinition => actionDefinition.id === selectedActionDefinitionId) || null;
  } else {
    selectedActionDefinition = null;
  }

  $: if (selectedActionDefinition) {
    name = selectedActionDefinition.name;
    description = selectedActionDefinition.description;
    argumentsMap = selectedActionDefinition.settings;
    getCode(selectedActionDefinition.action_file_id, user);
  } else {
    name = '';
    description = '';
    argumentsMap = {};
  }

  $: saveButtonDisabled = !name;

  onMount(() => {
    workspaceId = getSearchParameterNumber(SearchParameters.WORKSPACE_ID);
  });

  async function getCode(fileId: number, user: User | null) {
    if (selectedActionDefinition) {
      if (codeAbortController) {
        codeAbortController.abort();
      }
      codeAbortController = new AbortController();
      code = '';
      const { aborted, file } = await effects.getFile(fileId, user, codeAbortController.signal);
      if (!aborted && typeof file === 'string') {
        code = file;
      }
    } else {
      code = '';
    }
  }

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
    if (typeof actionRunId === 'number') {
      goto(
        `${base}/sequencing/actions/runs/${actionRunId}${workspaceId ? `?${SearchParameters.WORKSPACE_ID}=${workspaceId}` : ''}`,
      );
    }
  }

  function onChangeFormParameters(event: CustomEvent<FormParameter>) {
    const { detail: formParameter } = event;
    argumentsMap = getArguments(argumentsMap, formParameter);
  }

  async function save(actionDefinition: ActionDefinition) {
    if (!saveButtonDisabled) {
      saving = true;
      const actionDefinitionUpdate = {
        description,
        name,
        settings: argumentsMap,
      };
      await effects.updateActionDefinition(actionDefinition.id, actionDefinitionUpdate, user);
      saving = false;
    }
  }
</script>

<CssGrid bind:columns={$actionsColumns} class="grid">
  <Panel>
    <svelte:fragment slot="header">
      <SectionTitle>Actions</SectionTitle>

      <Input>
        <input bind:value={actionDefinitionsFilterText} class="st-input w-100" placeholder="Filter actions" />
      </Input>

      <div>
        <button
          class="st-button secondary ellipsis"
          use:permissionHandler={{
            hasPermission: featurePermissions.actionDefinition.canCreate(user),
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
        {#if !$actionDefinitions}
          <div class="p-2">
            <Loading />
          </div>
        {:else if filteredActionDefinitions.length < 1}
          <div class="st-typography-label p-2">No actions</div>
        {:else}
          {#each filteredActionDefinitions as actionDefinition}
            <button
              class="action st-button tertiary"
              on:click={() => {
                if (selectedActionDefinitionId === actionDefinition.id) {
                  selectedActionDefinitionId = null;
                } else {
                  selectedActionDefinitionId = actionDefinition.id;
                }
              }}
              class:selected={selectedActionDefinitionId === actionDefinition.id}
            >
              <div class="st-typography-medium" style:flex={1}>{actionDefinition.name}</div>
              <button
                class="st-button secondary"
                on:click|stopPropagation={() => runAction(actionDefinition)}
                use:permissionHandler={{
                  hasPermission: featurePermissions.actionRun.canCreate(user),
                  permissionError: 'You do not have permission to run an action',
                }}
              >
                Run
              </button>
            </button>
          {/each}
        {/if}
      </div>
    </svelte:fragment>
  </Panel>

  <CssGridGutter track={1} type="column" />

  <Panel padBody={false}>
    <svelte:fragment slot="header">
      <SectionTitle>Action Runs</SectionTitle>

      <Input>
        <input bind:value={actionRunsFilterText} class="st-input action-runs-input" placeholder="Filter action runs" />
      </Input>
    </svelte:fragment>

    <b>Action Runs</b>

    <svelte:fragment slot="body">
      {#if !$actionRuns}
        <div class="p-2">
          <Loading />
        </div>
      {/if}
      {#if selectedActionDefinition}
        <div class="action-definition-runs-container">
          <div class="action-definition-runs">
            <div class="action-definition-runs-info">
              <div class="st-typography-bold">{selectedActionDefinition.name}</div>
              <div class="st-typography-body">{selectedActionDefinition.description}</div>
            </div>
            <div>
              <button
                class="st-button primary"
                use:permissionHandler={{
                  hasPermission: featurePermissions.actionRun.canCreate(user),
                  permissionError: 'You do not have permission to run an action',
                }}
                on:click|stopPropagation={() => {
                  if (selectedActionDefinition) {
                    runAction(selectedActionDefinition);
                  }
                }}
              >
                Run
              </button>
              <button class="st-button secondary" on:click={() => (selectedActionDefinition = null)}> Close </button>
            </div>
          </div>
          <div class="action-definition-runs-tabs-wrapper">
            <Tabs class="action-definition-runs-tabs">
              <svelte:fragment slot="tab-list">
                <Tab class="action-definition-runs-tab">Runs ({(filteredActionRuns || []).length})</Tab>
                <Tab class="action-definition-runs-tab">Configure</Tab>
                <Tab class="action-definition-runs-tab">Code</Tab>
              </svelte:fragment>
              <TabPanel>
                <div class="action-runs pt-2">
                  {#if filteredActionRuns.length < 1}
                    <div class="st-typography-label p-2">No action runs</div>
                  {:else}
                    {#each filteredActionRuns || [] as actionRun}
                      <ActionRunCard
                        {actionRun}
                        actionDefinition={getActionDefinitionForRun(
                          actionRun,
                          $actionDefinitionsByWorkspace,
                          workspaceId,
                        )}
                        on:click={() => onActionRunClick(actionRun.id)}
                      />
                    {/each}
                  {/if}
                </div>
              </TabPanel>
              <TabPanel>
                <div class="configure">
                  <div class="st-typography-bold">Action Metadata</div>
                  <div class="configure-metadata">
                    <Input layout="inline">
                      <label for="name">Name</label>
                      <input
                        bind:value={name}
                        autocomplete="off"
                        class="st-input w-100"
                        id="name"
                        required
                        type="text"
                        placeholder="Enter a name"
                        use:permissionHandler={{
                          hasPermission: featurePermissions.actionDefinition.canUpdate(user, selectedActionDefinition),
                          permissionError: 'You do not have permission to update an action',
                        }}
                      />
                    </Input>

                    <Input layout="inline">
                      <label for="description">Description</label>
                      <textarea
                        bind:value={description}
                        autocomplete="off"
                        class="st-input w-100"
                        id="description"
                        required
                        placeholder="Enter a description"
                        use:permissionHandler={{
                          hasPermission: featurePermissions.actionDefinition.canUpdate(user, selectedActionDefinition),
                          permissionError: 'You do not have permission to update an action',
                        }}
                      />
                    </Input>
                  </div>

                  <div class="st-typography-bold">Action Settings</div>
                  <div class="st-typography-label">Persistent settings provided to every run of this action</div>
                  {#if Object.keys(selectedActionDefinition.settings_schema).length < 1}
                    <div class="st-typography-body pt-2"><i>No settings found</i></div>
                  {/if}
                  <Parameters
                    formParameters={getFormParameters(
                      valueSchemaRecordToParametersMap(selectedActionDefinition.settings_schema),
                      argumentsMap,
                      [],
                    )}
                    parameterType="action"
                    hideRightAdornments
                    hideInfo
                    on:change={onChangeFormParameters}
                    use={[
                      [
                        permissionHandler,
                        {
                          hasPermission: featurePermissions.actionDefinition.canUpdate(user, selectedActionDefinition),
                          permissionError: 'You do not have permission to update an action',
                        },
                      ],
                    ]}
                  />
                  <button
                    class="st-button secondary w-100 mt-4"
                    disabled={saveButtonDisabled || saving}
                    use:permissionHandler={{
                      hasPermission: featurePermissions.actionDefinition.canUpdate(user, selectedActionDefinition),
                      permissionError: 'You do not have permission to update an action',
                    }}
                    on:click={() => {
                      if (selectedActionDefinition) {
                        save(selectedActionDefinition);
                      }
                    }}
                  >
                    Save
                  </button>
                </div>
              </TabPanel>
              <TabPanel>
                <div class="code">
                  <MonacoEditor
                    automaticLayout={true}
                    language="javascript"
                    lineNumbers="on"
                    minimap={{ enabled: false }}
                    readOnly={true}
                    scrollBeyondLastLine={false}
                    tabSize={2}
                    value={code || 'Loading...'}
                  />
                </div>
              </TabPanel>
            </Tabs>
          </div>
        </div>
      {:else}
        <div class="action-runs">
          {#if $actionRuns?.length && filteredActionRuns.length < 1}
            <div class="st-typography-label p-2">No action runs</div>
          {:else}
            {#each filteredActionRuns || [] as actionRun}
              <ActionRunCard
                {actionRun}
                actionDefinition={getActionDefinitionForRun(actionRun, $actionDefinitionsByWorkspace, workspaceId)}
                on:click={() => onActionRunClick(actionRun.id)}
              />
            {/each}
          {/if}
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

  .action-runs {
    padding: 8px;
  }

  .action-runs-input {
    width: 200px;
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

  .action.selected :global(.st-button.permission-disabled),
  .action:hover :global(.st-button.permission-disabled),
  .action:focus-within :global(.st-button.permission-disabled) {
    opacity: 0.5;
  }

  .action-definition-runs-container {
    display: flex;
    flex: 1;
    flex-direction: column;
    overflow: hidden;
  }

  .action-definition-runs {
    display: flex;
    gap: 4px;
    justify-content: space-between;
    padding: 16px;
  }

  .action-definition-runs-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .action-definition-runs-tabs-wrapper {
    flex: 1;
    overflow: auto;
  }

  :global(.action-definition-runs-tabs .tab-list) {
    background-color: white;
    border-bottom: 1px solid var(--st-gray-20);
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

  .configure {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 500px;
    padding-left: 16px;
    padding-top: 24px;
  }

  .configure-metadata {
    display: flex;
    flex-direction: column;
  }

  .code {
    height: 100%;
  }
</style>
