<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import XIcon from 'bootstrap-icons/icons/x.svg?component';
  import { field } from '../../stores/form';
  import { creatingWorkspace, parcels } from '../../stores/sequencing';
  import { workspaces } from '../../stores/workspaces';
  import type { User } from '../../types/app';
  import type { Workspace } from '../../types/workspace';
  import effects from '../../utilities/effects';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { getWorkspacesUrl } from '../../utilities/routes';
  import { tooltip } from '../../utilities/tooltip';
  import { min, required, unique } from '../../utilities/validators';
  import Field from '../form/Field.svelte';
  import Input from '../form/Input.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import WorkspacesGrid from './WorkspacesGrid.svelte';

  export let user: User | null;

  let createButtonEnabled: boolean = false;
  let hasPermission: boolean = false;
  let permissionError = 'You do not have permission to create a workspace.';
  let selectedParcelIdField = field<number>(-1, [min(1, 'Field is required')]);
  let selectedWorkspaceId: number | null = null;
  let selectedWorkspace: Workspace | null = null;
  let selectedWorkspaceParcelName: string | null = null;
  let workspaceName: string | null = null;
  let workspaceLocationField = field<string>('', [
    value => {
      return new Promise(resolve => {
        if (/\//.test(value)) {
          return resolve('Cannot contain "/"" in location');
        } else {
          return resolve(null);
        }
      });
    },
    unique(
      $workspaces.map(workspace => workspace.disk_location),
      'Workspace location already exists',
    ),
  ]);

  $: hasPermission = featurePermissions.sequences.canCreate(user);

  $: createButtonEnabled =
    $workspaces !== null &&
    $workspaceLocationField.dirtyAndValid &&
    $selectedParcelIdField.dirtyAndValid &&
    !$creatingWorkspace;
  $: if ($workspaces) {
    workspaceLocationField.updateValidators([
      required,
      value => {
        return new Promise(resolve => {
          if (/\//.test(value)) {
            return resolve('Cannot contain "/"" in location');
          } else {
            return resolve(null);
          }
        });
      },
      unique(
        $workspaces.map(workspace => workspace.disk_location),
        'Workspace location already exists',
      ),
    ]);
  }
  $: selectedWorkspace = $workspaces.find(workspace => workspace.id === selectedWorkspaceId) ?? null;
  $: if (selectedWorkspace) {
    const selectedWorkspaceParcel = $parcels.find(({ id }) => id === selectedWorkspace.parcel_id);
    selectedWorkspaceParcelName = selectedWorkspaceParcel?.name ?? null;
  } else {
    selectedWorkspaceParcelName = null;
  }

  async function onCreateNewWorkspace() {
    await effects.createWorkspace(
      $workspaceLocationField.value,
      parseInt(`${$selectedParcelIdField.value}`),
      user,
      workspaceName,
    );
  }

  function selectWorkspace(workspaceId: number | null) {
    selectedWorkspaceId = workspaceId;
  }

  function deselectWorkspace() {
    selectWorkspace(null);
  }

  function onWorkspaceSelected(event: CustomEvent<number>) {
    selectWorkspace(event.detail);
  }

  function openWorkspace(workspaceId: number) {
    goto(getWorkspacesUrl(base, workspaceId));
  }

  function onOpenWorkspace(event: CustomEvent<number>) {
    if (event.detail) {
      openWorkspace(event.detail);
    }
  }
  function onOpenSelectedWorkspace() {
    if (selectedWorkspaceId) {
      openWorkspace(selectedWorkspaceId);
    }
  }

  function onDeleteWorkspace(event: CustomEvent<number>) {
    if (event.detail) {
      const workspaceToDelete = $workspaces.find(({ id }) => id === event.detail);
      if (workspaceToDelete) {
        effects.deleteWorkspace(workspaceToDelete, user);
      }
    }
  }
</script>

<CssGrid columns="20% auto">
  <Panel borderRight padBody={false}>
    <svelte:fragment slot="header">
      {#if selectedWorkspaceId !== null}
        <SectionTitle>Selected Workspace</SectionTitle>
        <div class="selected-workspace-buttons">
          <button
            class="st-button icon fs-6"
            on:click={deselectWorkspace}
            use:tooltip={{ content: 'Deselect workspace', placement: 'top' }}
          >
            <XIcon />
          </button>
        </div>
      {:else}
        <SectionTitle>New Workspace</SectionTitle>
      {/if}
    </svelte:fragment>
    <svelte:fragment slot="body">
      {#if selectedWorkspace !== null}
        <div class="workspace-metadata">
          <fieldset>
            <Input class="gap-0" layout="stacked">
              <label class="workspace-metadata-item-label" for="parcel">Parcel</label>
              <input
                class="st-input w-full"
                name="parcel"
                id="parcel"
                aria-label="parcel"
                value={selectedWorkspaceParcelName}
                disabled
              />
            </Input>
          </fieldset>
          <fieldset>
            <Input class="gap-0" layout="stacked">
              <label class="workspace-metadata-item-label" for="location">Workspace Folder Name</label>
              <input
                class="st-input w-full"
                name="location"
                id="location"
                aria-label="Workspace Folder Name"
                value={selectedWorkspace.disk_location}
                disabled
              />
            </Input>
          </fieldset>
          <fieldset>
            <Input class="gap-0" layout="stacked">
              <label class="workspace-metadata-item-label" for="name">Workspace Name</label>
              <input
                class="st-input w-full"
                name="name"
                id="name"
                aria-label="name"
                value={selectedWorkspace.name}
                disabled
              />
            </Input>
          </fieldset>
        </div>
        <fieldset>
          <button class="st-button w-full" on:click={onOpenSelectedWorkspace}>Open workspace</button>
        </fieldset>
      {:else}
        <Field field={selectedParcelIdField}>
          <label for="parcel">Parcel</label>
          <select
            class="st-select w-full"
            name="parcel"
            id="parcel"
            aria-label="Parcel"
            use:permissionHandler={{
              hasPermission,
              permissionError,
            }}
          >
            <option value={null} />
            {#each $parcels as parcel}
              <option value={parcel.id}>
                {parcel.name}
              </option>
            {/each}
          </select>
        </Field>
        <Field field={workspaceLocationField}>
          <label for="location" slot="label">Workspace Folder Name</label>
          <input
            autocomplete="off"
            class="st-input w-full"
            name="location"
            id="location"
            aria-label="Workspace Folder Name"
            use:permissionHandler={{
              hasPermission,
              permissionError,
            }}
          />
        </Field>
        <fieldset>
          <Input>
            <label for="name">Workspace Name (Optional)</label>
            <input
              autocomplete="off"
              class="st-input w-full"
              name="name"
              id="name"
              aria-label="Workspace Name"
              bind:value={workspaceName}
              use:permissionHandler={{
                hasPermission,
                permissionError,
              }}
            />
          </Input>
        </fieldset>

        <fieldset>
          <button
            class="st-button w-full"
            disabled={!createButtonEnabled}
            type="submit"
            use:permissionHandler={{
              hasPermission,
              permissionError,
            }}
            on:click={onCreateNewWorkspace}
          >
            Create
          </button>
        </fieldset>
      {/if}
    </svelte:fragment>
  </Panel>

  <WorkspacesGrid
    {user}
    {selectedWorkspaceId}
    on:deleteWorkspace={onDeleteWorkspace}
    on:selectWorkspace={onWorkspaceSelected}
    on:viewWorkspace={onOpenWorkspace}
  />
</CssGrid>

<style>
  .selected-workspace-buttons {
    column-gap: 0.25rem;
    display: grid;
    grid-template-columns: repeat(2, min-content);
  }
</style>
