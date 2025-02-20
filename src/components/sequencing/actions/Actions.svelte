<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import ArrowLeftIcon from '@nasa-jpl/stellar/icons/arrow_left.svg?component';
  import { onMount } from 'svelte';
  import { SearchParameters } from '../../../enums/searchParameters';
  import { actionRuns, actions, actionsColumns } from '../../../stores/actions';
  import { userSequences, workspaces } from '../../../stores/sequencing';
  import type { Action } from '../../../types/actions';
  import type { User } from '../../../types/app';
  import type { UserSequence, Workspace } from '../../../types/sequencing';
  import effects from '../../../utilities/effects';
  import { getSearchParameterNumber } from '../../../utilities/generic';
  import { showActionCreationModal } from '../../../utilities/modal';
  import { permissionHandler } from '../../../utilities/permissionHandler';
  import { getNextThingID } from '../../../utilities/timeline';
  import { showSuccessToast } from '../../../utilities/toast';
  import Collapse from '../../Collapse.svelte';
  import Input from '../../form/Input.svelte';
  import CssGrid from '../../ui/CssGrid.svelte';
  import CssGridGutter from '../../ui/CssGridGutter.svelte';
  import MonacoEditor from '../../ui/MonacoEditor.svelte';
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
    const { confirm, value } = await showActionCreationModal();

    if (confirm && value) {
      const { actionJS, name, description } = value;
      const id = getNextThingID($actions);
      actions.update(() => [...$actions, { actionJS, description, id, name }]);
      showSuccessToast('Action Created Successfully');
    }
  }

  function onActionRunClick(id: number) {
    const workspaceId = getSearchParameterNumber(SearchParameters.WORKSPACE_ID);
    goto(
      `${base}/sequencing/actions/runs/${id}${workspaceId ? `?${SearchParameters.WORKSPACE_ID}=${workspaceId}` : ''}`,
    );
  }

  async function runAction(action: Action) {
    const actionRun = await effects.runAction(action, user);
    if (actionRun) {
      goto(
        `${base}/sequencing/actions/runs/${actionRun.id}${workspaceId ? `?${SearchParameters.WORKSPACE_ID}=${workspaceId}` : ''}`,
      );
    }
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
          {#each $actions as action}
            <div class="action">
              <div class="action-name-row">
                <div class="st-typography-bold" style:flex={1}>{action.name}</div>
                <button class="st-button secondary" on:click|stopPropagation={() => runAction(action)}> Run </button>
              </div>
              <div class="st-typography-label">{action.description}</div>
              <Collapse title="ActionJS" defaultExpanded={false} padContent={false}>
                <div class="code">
                  <MonacoEditor
                    automaticLayout={true}
                    fixedOverflowWidgets={true}
                    language="typescript"
                    lineNumbers="on"
                    minimap={{ enabled: false }}
                    readOnly
                    scrollBeyondLastLine={false}
                    tabSize={2}
                    value={action.actionJS}
                  />
                </div>
              </Collapse>
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
        {#if $actionRuns.length < 1}
          <div>No action runs</div>
        {/if}
        <div class="action-runs">
          {#each $actionRuns as actionRun}
            <ActionRunCard {actionRun} {user} on:click={() => onActionRunClick(actionRun.id)} />
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
