<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import ArrowLeftIcon from '@nasa-jpl/stellar/icons/arrow_left.svg?component';
  import { onMount } from 'svelte';
  import { SearchParameters } from '../../../enums/searchParameters';
  import { actionDefinitions, actionDefinitionsByWorkspace, actionRuns, actionsColumns } from '../../../stores/actions';
  import { userSequences, workspaces } from '../../../stores/sequencing';
  import type { ActionDefinition, ActionRun } from '../../../types/actions';
  import type { User } from '../../../types/app';
  import type { UserSequence, Workspace } from '../../../types/sequencing';
  import effects from '../../../utilities/effects';
  import { getSearchParameterNumber } from '../../../utilities/generic';
  import { showActionCreationModal } from '../../../utilities/modal';
  import { permissionHandler } from '../../../utilities/permissionHandler';
  import Input from '../../form/Input.svelte';
  import CssGrid from '../../ui/CssGrid.svelte';
  import CssGridGutter from '../../ui/CssGridGutter.svelte';
  import Panel from '../../ui/Panel.svelte';
  import SectionTitle from '../../ui/SectionTitle.svelte';
  import ActionRunCard from './ActionRunCard.svelte';

  export let user: User | null;

  let actionsFilterText: string = '';
  let actionRunsFilterText: string = '';
  let selectedSequence: UserSequence | null = null;
  let workspace: Workspace | undefined;
  let workspaceId: number | null = null;

  $: workspace = $workspaces.find(workspace => workspace.id === workspaceId);
  $: if (selectedSequence !== null) {
    const found: number = $userSequences.findIndex(sequence => sequence.id === selectedSequence?.id);

    if (found === -1) {
      selectedSequence = null;
    }
  }

  onMount(() => {
    workspaceId = getSearchParameterNumber(SearchParameters.WORKSPACE_ID);
  });

  async function onNewActionClick() {
    if (typeof workspaceId !== 'number') {
      return;
    }

    const { confirm, value } = await showActionCreationModal(user, workspaceId);

    if (confirm && value) {
      const { file, name, description } = value;
      // const id = getNextThingID(actionDefinitions);
      // actions.update(() => [...$actions, { actionJS, description, id, name }]);
      // showSuccessToast('Action Created Successfully');
    }
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
    workspaceId: number,
  ): ActionDefinition | null {
    if (typeof workspaceId === 'number') {
      const workspaceDefinitions = actionDefinitionsByWorkspace[workspaceId];
      if (workspaceDefinitions) {
        return workspaceDefinitions[actionRun.action_definition_id] ?? null;
      }
    }
    return null;
  }
</script>

<div class="wrapper">
  <div
    style=" align-items: center; border-bottom: 1px solid var(--st-gray-20);display: flex; "
    class="st-typography-medium"
  >
    <div
      style=" align-items: center; border-right: 1px solid var(--st-gray-20); ;display: flex; gap: 8px; padding: 8px 16px 8px 8px;"
    >
      <ArrowLeftIcon />
      <a
        href={`/sequencing${workspace ? `?${SearchParameters.WORKSPACE_ID}=${workspace.id}` : ''}`}
        class="st-typography-medium"
      >
        Back
      </a>
    </div>
    <div style="padding-left: 8px">Workspace:</div>
    <div style="padding-left: 4px" class="st-typography-bold">{workspace?.name ?? 'Unknown Workspace'}</div>
  </div>
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
            <div class="action">
              <div class="action-name-row">
                <div class="st-typography-bold" style:flex={1}>{actionDefinition.name}</div>
                <button class="st-button secondary" on:click|stopPropagation={() => runAction(actionDefinition)}>
                  Run
                </button>
              </div>
              <div class="st-typography-label">{actionDefinition.description}</div>
            </div>
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
        <div class="action-runs">
          {#each $actionRuns || [] as actionRun}
            <ActionRunCard
              {actionRun}
              actionDefinition={getActionDefinitionForRun(actionRun, $actionDefinitionsByWorkspace, workspaceId)}
              {user}
              on:click={() => onActionRunClick(actionRun.id)}
            />
          {/each}
        </div>
      </svelte:fragment>
    </Panel>
  </CssGrid>
</div>

<style>
  .actions,
  .action-runs {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .action-name-row {
    align-items: center;
    display: flex;
  }

  .action {
    border: 1px solid var(--st-gray-20);
    border-radius: 4px;
    padding: 8px;
  }
  .wrapper {
    display: flex;
    flex-direction: column;
  }

  .wrapper :global(.grid) {
    height: 100%;
  }

  .code {
    border: 1px solid var(--st-gray-30);
    border-radius: 4px;
    height: 400px;
    overflow: hidden;
  }
</style>
