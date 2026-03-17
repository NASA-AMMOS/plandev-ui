<svelte:options immutable={true} />

<script lang="ts">
  import { Button, Input as InputStellar } from '@nasa-jpl/stellar-svelte';
  import { ListChecks, Play, Search } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import { Status } from '../../../enums/status';
  import { actionDefinitions, actionRunsByWorkspace } from '../../../stores/actions';
  import { workspaceId } from '../../../stores/workspaces';
  import type { ActionDefinition } from '../../../types/actions';
  import type { User } from '../../../types/app';
  import type { Workspace } from '../../../types/workspace';
  import { getStatusForActionRun } from '../../../utilities/actions';
  import { showActionCreationModal } from '../../../utilities/modal';
  import { permissionHandler } from '../../../utilities/permissionHandler';
  import { featurePermissions } from '../../../utilities/permissions';
  import { getTimeAgo } from '../../../utilities/time';
  import { tooltip } from '../../../utilities/tooltip';
  import AsyncContentState from '../../ui/AsyncContentState.svelte';
  import SectionTitle from '../../ui/SectionTitle.svelte';
  import * as Sidebar from '../../ui/Sidebar/index.js';
  import StatusBadge from '../../ui/StatusBadge.svelte';

  const actionDefinitionsError = actionDefinitions.error;
  const actionDefinitionsLoading = actionDefinitions.loading;

  export let actions: ActionDefinition[] = [];
  export let isAllRunsSelected: boolean = false;
  export let selectedActionId: number | null = null;
  export let user: User | null;
  export let workspace: Workspace | null | undefined = null;

  const dispatch = createEventDispatcher<{
    runAction: ActionDefinition;
    selectAction: { id: number };
    selectAllRuns: void;
  }>();

  let filterText: string = '';
  let showArchived: boolean = false;

  $: filteredActions = actions
    .filter(action => {
      if (!showArchived && action.archived) {
        return false;
      }
      if (!filterText) {
        return true;
      }
      return action.name.toLowerCase().includes(filterText.toLowerCase());
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  $: hasCreatePermission = featurePermissions.actionDefinition.canCreate(user);

  async function onNewActionClick() {
    if (workspace) {
      showActionCreationModal(user, workspace.id);
    }
  }
</script>

<div class="grid h-full grid-rows-[min-content_auto]">
  <Sidebar.Header className="p-0">
    <div class="flex h-[48px] items-center justify-between gap-1 border-b border-border bg-background p-[6px]">
      <SectionTitle>Workspace Actions</SectionTitle>
      <div
        use:permissionHandler={{
          hasPermission: hasCreatePermission,
          permissionError: 'You do not have permission to create a new action',
        }}
      >
        <Button variant="outline" disabled={!hasCreatePermission} on:click={onNewActionClick}>New Action</Button>
      </div>
    </div>
  </Sidebar.Header>
  <Sidebar.Content className="h-full">
    <Sidebar.Group className="p-0 h-full">
      <Sidebar.GroupContent className="h-full">
        <Sidebar.Menu className="h-full">
          <div class="flex h-full flex-col gap-0 overflow-hidden">
            <div class="flex items-center gap-2 px-2 py-2">
              <Search class="shrink-0" size={16} />
              <InputStellar
                autocomplete="off"
                class="w-full"
                sizeVariant="xs"
                placeholder="Filter actions..."
                bind:value={filterText}
              />
              <label class="flex shrink-0 cursor-pointer items-center gap-1 text-xs text-muted-foreground">
                <input type="checkbox" bind:checked={showArchived} class="h-3.5 w-3.5" />
                <span>Archived</span>
              </label>
            </div>

            <div class="border-t border-border" />

            <div class="min-h-0 flex-1 overflow-auto bg-background">
              <div class="border-b border-border">
                <Button
                  variant="ghost"
                  class="flex h-min w-full items-center justify-start gap-2 rounded-none border-l-2 px-2 py-4 text-left text-xs hover:bg-accent {isAllRunsSelected
                    ? 'border-l-primary bg-accent'
                    : 'border-l-transparent'}"
                  on:click={() => dispatch('selectAllRuns')}
                >
                  <ListChecks size={14} class="shrink-0 text-muted-foreground" />
                  <span class="truncate font-medium">All Actions</span>
                </Button>
              </div>
              <AsyncContentState
                loading={$actionDefinitionsLoading}
                error={$actionDefinitionsError || null}
                errorMessage="Failed to load actions"
                showRetry
                empty={filteredActions.length === 0}
                emptyMessage={filterText ? 'No matching actions' : 'No actions'}
                on:retry={() => actionDefinitions.restartSocket()}
              >
                {#each filteredActions as action (action.id)}
                  {@const actionRuns = ($actionRunsByWorkspace[$workspaceId] || []).filter(
                    r => r.action_definition_id === action.id,
                  )}
                  {@const latestRun = [...actionRuns].sort((a, b) => b.id - a.id)[0]}
                  {@const latestStatus = latestRun ? getStatusForActionRun(latestRun) : null}
                  <div class="group/action relative border-b border-border {action.archived ? 'opacity-50' : ''}">
                    <Button
                      variant="ghost"
                      class="flex h-min w-full items-center gap-2 rounded-none border-l-2 px-2 text-left text-xs hover:bg-accent {selectedActionId ===
                      action.id
                        ? 'border-primary bg-accent'
                        : 'border-transparent'}"
                      on:click={() => dispatch('selectAction', { id: action.id })}
                    >
                      <div class="shrink-0">
                        <StatusBadge status={latestStatus ?? Status.Pending} />
                      </div>
                      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span class="truncate font-medium">
                          {action.name}
                          {#if action.archived}
                            <span class="text-muted-foreground">(archived)</span>
                          {/if}
                        </span>
                        <span class="truncate text-muted-foreground">
                          {latestRun ? `Last run ${getTimeAgo(new Date(latestRun.requested_at))}` : 'No runs yet'}
                        </span>
                      </div>
                    </Button>
                    {#if !action.archived}
                      <div
                        class="absolute right-3 top-1/2 hidden -translate-y-1/2 group-hover/action:block"
                        use:tooltip={{ content: `Run ${action.name}`, placement: 'right' }}
                        use:permissionHandler={{
                          hasPermission: workspace != null && featurePermissions.actionRun.canCreate(user, workspace),
                          permissionError: 'You do not have permission to run an action',
                        }}
                      >
                        <Button
                          variant="ghost"
                          class="rounded p-1"
                          on:click={e => {
                            e.stopPropagation();
                            dispatch('runAction', action);
                          }}
                        >
                          <Play size={14} />
                        </Button>
                      </div>
                    {/if}
                  </div>
                {/each}
              </AsyncContentState>
            </div>
          </div>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>
</div>
